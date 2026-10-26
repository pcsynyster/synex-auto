alter table public.tenants
  add column valor_mensal numeric(10, 2) not null default 149 check (valor_mensal >= 0);

create table public.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table public.convites (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nome_empresa text check (char_length(nome_empresa) <= 120),
  dias_teste integer not null default 14 check (dias_teste between 0 and 90),
  valor_mensal numeric(10, 2) not null default 149 check (valor_mensal >= 0),
  criado_em timestamptz not null default now(),
  usado_em timestamptz,
  tenant_id uuid references public.tenants (id) on delete set null
);

create index convites_tenant_idx on public.convites (tenant_id);

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.administradores where user_id = auth.uid());
$$;

create or replace function public.criar_conta_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_convite public.convites;
  v_tenant uuid;
begin
  select * into v_convite
  from public.convites
  where email = lower(new.email) and usado_em is null
  for update;

  if not found then
    raise exception 'convite_necessario' using errcode = '42501';
  end if;

  insert into public.tenants (nome, telefone, slug, cidade, assinatura_valida_ate, valor_mensal)
  values (
    coalesce(nullif(new.raw_user_meta_data ->> 'nome_empresa', ''), v_convite.nome_empresa),
    new.raw_user_meta_data ->> 'telefone',
    new.raw_user_meta_data ->> 'slug',
    new.raw_user_meta_data ->> 'cidade',
    current_date + v_convite.dias_teste,
    v_convite.valor_mensal
  )
  returning id into v_tenant;

  insert into public.perfis (id, tenant_id, nome, papel)
  values (new.id, v_tenant, coalesce(new.raw_user_meta_data ->> 'nome', 'Responsável'), 'dono');

  perform public.semear_agenda(v_tenant);

  update public.convites set usado_em = now(), tenant_id = v_tenant where email = v_convite.email;

  return new;
end;
$$;

create or replace function public.admin_listar_esteticas()
returns table (
  id uuid,
  nome text,
  slug text,
  telefone text,
  cidade text,
  email_dono text,
  status_assinatura public.status_assinatura_tenant,
  assinatura_valida_ate date,
  valor_mensal numeric,
  criado_em timestamptz,
  total_os bigint,
  os_30_dias bigint,
  ultima_os timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  return query
    select
      t.id, t.nome, t.slug, t.telefone, t.cidade,
      (
        select u.email::text from public.perfis p
        join auth.users u on u.id = p.id
        where p.tenant_id = t.id and p.papel = 'dono'
        order by p.criado_em limit 1
      ),
      t.status_assinatura, t.assinatura_valida_ate, t.valor_mensal, t.criado_em,
      (select count(*) from public.ordens_servico o where o.tenant_id = t.id),
      (select count(*) from public.ordens_servico o where o.tenant_id = t.id and o.criado_em > now() - interval '30 days'),
      (select max(o.criado_em) from public.ordens_servico o where o.tenant_id = t.id)
    from public.tenants t
    order by t.assinatura_valida_ate asc, t.nome;
end;
$$;

create or replace function public.admin_registrar_pagamento(p_tenant uuid, p_dias integer)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tenants;
begin
  if not public.eh_admin() then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  if p_dias not between 1 and 400 then
    raise exception 'dias_invalidos' using errcode = '22023';
  end if;

  update public.tenants
  set status_assinatura = 'ativa',
      assinatura_valida_ate = greatest(current_date, assinatura_valida_ate) + p_dias
  where id = p_tenant
  returning * into v;

  if v.id is null then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

create or replace function public.admin_definir_status(p_tenant uuid, p_status public.status_assinatura_tenant, p_valor numeric default null)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tenants;
begin
  if not public.eh_admin() then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  update public.tenants
  set status_assinatura = p_status,
      valor_mensal = coalesce(p_valor, valor_mensal)
  where id = p_tenant
  returning * into v;

  if v.id is null then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

alter table public.administradores enable row level security;
alter table public.convites enable row level security;

create policy administradores_proprio on public.administradores
  for select to authenticated using (user_id = (select auth.uid()));

create policy convites_admin on public.convites
  for all to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

revoke all on public.administradores, public.convites from anon;
revoke insert, update, delete on public.administradores from authenticated;
revoke update on public.convites from authenticated;

revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.admin_listar_esteticas() from public, anon;
revoke execute on function public.admin_registrar_pagamento(uuid, integer) from public, anon;
revoke execute on function public.admin_definir_status(uuid, public.status_assinatura_tenant, numeric) from public, anon;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.admin_listar_esteticas() to authenticated;
grant execute on function public.admin_registrar_pagamento(uuid, integer) to authenticated;
grant execute on function public.admin_definir_status(uuid, public.status_assinatura_tenant, numeric) to authenticated;

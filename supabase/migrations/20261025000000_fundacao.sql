create extension if not exists pgcrypto with schema extensions;

create type public.status_assinatura_tenant as enum ('trial', 'ativa', 'inadimplente', 'cancelada');
create type public.categoria_veiculo as enum ('hatch', 'sedan', 'suv', 'pickup');
create type public.status_plano as enum ('ativo', 'esgotado', 'expirado', 'cancelado');
create type public.status_os as enum ('recebido', 'lavando', 'acabamento', 'pronto', 'entregue');
create type public.papel_perfil as enum ('dono', 'operador');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text not null check (telefone ~ '^[0-9]{10,13}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  cidade text check (char_length(cidade) <= 60),
  chave_pix text check (char_length(chave_pix) <= 77),
  status_assinatura public.status_assinatura_tenant not null default 'trial',
  assinatura_valida_ate date not null default (current_date + 14),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  papel public.papel_perfil not null default 'operador',
  criado_em timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  whatsapp text not null check (whatsapp ~ '^[0-9]{12,13}$'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, whatsapp),
  unique (tenant_id, id)
);

create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null,
  placa text not null check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  modelo text not null check (char_length(modelo) between 1 and 80),
  categoria public.categoria_veiculo not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, placa),
  unique (tenant_id, id),
  foreign key (tenant_id, cliente_id) references public.clientes (tenant_id, id) on delete cascade
);

create table public.planos_assinaturas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null,
  nome_plano text not null check (char_length(nome_plano) between 2 and 80),
  valor_mensal numeric(10, 2) not null default 0 check (valor_mensal >= 0),
  total_creditos integer not null check (total_creditos > 0),
  creditos_restantes integer not null check (creditos_restantes >= 0),
  validade date not null,
  status public.status_plano not null default 'ativo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (creditos_restantes <= total_creditos),
  unique (tenant_id, id),
  foreign key (tenant_id, cliente_id) references public.clientes (tenant_id, id) on delete cascade
);

create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  veiculo_id uuid not null,
  plano_assinatura_id uuid,
  servicos_avulsos jsonb not null default '[]'::jsonb check (jsonb_typeof(servicos_avulsos) = 'array'),
  valor_total numeric(10, 2) not null default 0 check (valor_total >= 0),
  status public.status_os not null default 'recebido',
  fotos_vistoria text[] not null default '{}' check (cardinality(fotos_vistoria) <= 6),
  observacoes text,
  token_publico text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  pronto_em timestamptz,
  entregue_em timestamptz,
  foreign key (tenant_id, veiculo_id) references public.veiculos (tenant_id, id) on delete cascade,
  foreign key (tenant_id, plano_assinatura_id) references public.planos_assinaturas (tenant_id, id) on delete set null (plano_assinatura_id)
);

create index perfis_tenant_idx on public.perfis (tenant_id);
create index clientes_tenant_idx on public.clientes (tenant_id);
create index veiculos_cliente_idx on public.veiculos (cliente_id);
create index planos_cliente_ativos_idx on public.planos_assinaturas (cliente_id, validade) where status = 'ativo';
create index os_tenant_status_idx on public.ordens_servico (tenant_id, status, criado_em desc);
create index os_veiculo_idx on public.ordens_servico (veiculo_id);
create index os_plano_idx on public.ordens_servico (plano_assinatura_id);

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger tenants_atualizado before update on public.tenants for each row execute function public.tocar_atualizado_em();
create trigger clientes_atualizado before update on public.clientes for each row execute function public.tocar_atualizado_em();
create trigger veiculos_atualizado before update on public.veiculos for each row execute function public.tocar_atualizado_em();
create trigger planos_atualizado before update on public.planos_assinaturas for each row execute function public.tocar_atualizado_em();
create trigger os_atualizado before update on public.ordens_servico for each row execute function public.tocar_atualizado_em();

create or replace function public.tenant_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.tenant_id from public.perfis p where p.id = auth.uid();
$$;

create or replace function public.token_os_requisicao()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.headers', true)::json ->> 'x-os-token', '');
$$;

create or replace function public.criar_conta_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  if new.raw_user_meta_data ? 'nome_empresa' then
    insert into public.tenants (nome, telefone, slug, cidade)
    values (
      new.raw_user_meta_data ->> 'nome_empresa',
      new.raw_user_meta_data ->> 'telefone',
      new.raw_user_meta_data ->> 'slug',
      new.raw_user_meta_data ->> 'cidade'
    )
    returning id into v_tenant;

    insert into public.perfis (id, tenant_id, nome, papel)
    values (new.id, v_tenant, coalesce(new.raw_user_meta_data ->> 'nome', 'Responsável'), 'dono');
  end if;
  return new;
end;
$$;

create trigger ao_criar_usuario
after insert on auth.users
for each row execute function public.criar_conta_tenant();

create or replace function public.criar_ordem_servico(
  p_id uuid,
  p_veiculo_id uuid,
  p_servicos_avulsos jsonb,
  p_fotos text[],
  p_usar_plano boolean,
  p_observacoes text
)
returns public.ordens_servico
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.tenant_atual();
  v_cliente uuid;
  v_plano public.planos_assinaturas;
  v_total numeric(10, 2);
  v_os public.ordens_servico;
begin
  if v_tenant is null then
    raise exception 'perfil_sem_tenant' using errcode = '42501';
  end if;

  select v.cliente_id into v_cliente
  from public.veiculos v
  where v.id = p_veiculo_id and v.tenant_id = v_tenant;

  if v_cliente is null then
    raise exception 'veiculo_nao_encontrado' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_servicos_avulsos) s
    where jsonb_typeof(s -> 'nome') <> 'string'
       or jsonb_typeof(s -> 'valor') <> 'number'
       or (s ->> 'valor')::numeric < 0
  ) then
    raise exception 'servicos_invalidos' using errcode = '22023';
  end if;

  select coalesce(sum((s ->> 'valor')::numeric), 0) into v_total
  from jsonb_array_elements(p_servicos_avulsos) s;

  if p_usar_plano then
    update public.planos_assinaturas
    set status = 'expirado'
    where tenant_id = v_tenant
      and cliente_id = v_cliente
      and status = 'ativo'
      and validade < current_date;

    select * into v_plano
    from public.planos_assinaturas
    where tenant_id = v_tenant
      and cliente_id = v_cliente
      and status = 'ativo'
      and creditos_restantes > 0
      and validade >= current_date
    order by validade asc
    limit 1
    for update;

    if found then
      update public.planos_assinaturas
      set creditos_restantes = creditos_restantes - 1,
          status = case when creditos_restantes - 1 = 0 then 'esgotado'::public.status_plano else status end
      where id = v_plano.id;
    end if;
  end if;

  insert into public.ordens_servico (
    id, tenant_id, veiculo_id, plano_assinatura_id, servicos_avulsos, valor_total, fotos_vistoria, observacoes
  )
  values (
    p_id, v_tenant, p_veiculo_id, v_plano.id, p_servicos_avulsos, v_total, coalesce(p_fotos, '{}'), nullif(trim(p_observacoes), '')
  )
  returning * into v_os;

  return v_os;
end;
$$;

create or replace function public.avancar_status_os(p_os_id uuid, p_status public.status_os)
returns public.ordens_servico
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_os public.ordens_servico;
  v_ordem public.status_os[] := enum_range(null::public.status_os);
begin
  select * into v_os
  from public.ordens_servico
  where id = p_os_id and tenant_id = public.tenant_atual()
  for update;

  if not found then
    raise exception 'os_nao_encontrada' using errcode = 'P0002';
  end if;

  if array_position(v_ordem, p_status) <= array_position(v_ordem, v_os.status) then
    raise exception 'transicao_invalida' using errcode = '22023';
  end if;

  update public.ordens_servico
  set status = p_status,
      pronto_em = case when p_status in ('pronto', 'entregue') then coalesce(pronto_em, now()) else pronto_em end,
      entregue_em = case when p_status = 'entregue' then now() else entregue_em end
  where id = p_os_id
  returning * into v_os;

  return v_os;
end;
$$;

revoke execute on function public.criar_conta_tenant() from public, anon, authenticated;
revoke execute on function public.criar_ordem_servico(uuid, uuid, jsonb, text[], boolean, text) from public, anon;
revoke execute on function public.avancar_status_os(uuid, public.status_os) from public, anon;
grant execute on function public.criar_ordem_servico(uuid, uuid, jsonb, text[], boolean, text) to authenticated;
grant execute on function public.avancar_status_os(uuid, public.status_os) to authenticated;

alter table public.tenants enable row level security;
alter table public.perfis enable row level security;
alter table public.clientes enable row level security;
alter table public.veiculos enable row level security;
alter table public.planos_assinaturas enable row level security;
alter table public.ordens_servico enable row level security;

create policy tenants_select_membro on public.tenants
  for select to authenticated using (id = (select public.tenant_atual()));
create policy tenants_update_membro on public.tenants
  for update to authenticated using (id = (select public.tenant_atual())) with check (id = (select public.tenant_atual()));

create policy perfis_select_membro on public.perfis
  for select to authenticated using (tenant_id = (select public.tenant_atual()));
create policy perfis_update_proprio on public.perfis
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()) and tenant_id = (select public.tenant_atual()));

create policy clientes_tenant on public.clientes
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

create policy veiculos_tenant on public.veiculos
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

create policy planos_tenant on public.planos_assinaturas
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

create policy os_tenant on public.ordens_servico
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

create policy os_publica_por_token on public.ordens_servico
  for select to anon
  using (token_publico = (select public.token_os_requisicao()));

create policy veiculos_publico_por_token on public.veiculos
  for select to anon
  using (exists (
    select 1 from public.ordens_servico o
    where o.veiculo_id = veiculos.id and o.token_publico = (select public.token_os_requisicao())
  ));

create policy tenants_publico_por_token on public.tenants
  for select to anon
  using (exists (
    select 1 from public.ordens_servico o
    where o.tenant_id = tenants.id and o.token_publico = (select public.token_os_requisicao())
  ));

revoke all on public.tenants, public.perfis, public.clientes, public.veiculos, public.planos_assinaturas, public.ordens_servico from anon;
grant select (id, nome, telefone, cidade, chave_pix) on public.tenants to anon;
grant select (id, tenant_id, placa, modelo, categoria) on public.veiculos to anon;
grant select (id, tenant_id, veiculo_id, status, fotos_vistoria, servicos_avulsos, valor_total, token_publico, criado_em, atualizado_em, pronto_em, entregue_em) on public.ordens_servico to anon;

revoke insert, update, delete on public.tenants from authenticated;
grant update (nome, telefone, cidade, chave_pix) on public.tenants to authenticated;
revoke update on public.perfis from authenticated;
grant update (nome) on public.perfis to authenticated;
revoke insert, delete on public.perfis from authenticated;
revoke insert, update on public.ordens_servico from authenticated;
grant update (servicos_avulsos, valor_total, fotos_vistoria, observacoes) on public.ordens_servico to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vistorias', 'vistorias', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy vistorias_insert_tenant on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vistorias'
    and (storage.foldername(name))[1] = (select public.tenant_atual())::text
  );

create policy vistorias_select_tenant on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vistorias'
    and (storage.foldername(name))[1] = (select public.tenant_atual())::text
  );

create policy vistorias_delete_tenant on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vistorias'
    and (storage.foldername(name))[1] = (select public.tenant_atual())::text
  );

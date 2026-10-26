create table public.slugs_antigos (
  slug text primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table public.slugs_antigos enable row level security;
revoke all on public.slugs_antigos from anon, authenticated;

create or replace function public.slug_reservado(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_slug = any (array[
    'admin', 'painel', 'login', 'logout', 'os', 'api', 'agendar', 'agendamento', 'logo', 'brand',
    'manifest', 'icon', 'apple-icon', 'favicon', 'robots', 'sitemap', 'synex', 'suporte', 'ajuda',
    'app', 'www', 'assinatura', 'planos', 'cadastro', 'conta', 'config', 'static', 'public'
  ]);
$$;

create or replace function public.alterar_slug(p_tenant uuid, p_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo text := lower(trim(p_slug));
  v_atual text;
begin
  if not (public.eh_admin() or (p_tenant = public.tenant_atual() and exists (
    select 1 from public.perfis p where p.id = auth.uid() and p.tenant_id = p_tenant and p.papel = 'dono'
  ))) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  if v_novo !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_novo) < 3 or length(v_novo) > 40 then
    raise exception 'slug_invalido' using errcode = '22023';
  end if;

  if public.slug_reservado(v_novo) then
    raise exception 'slug_em_uso' using errcode = '23505';
  end if;

  select slug into v_atual from public.tenants where id = p_tenant for update;
  if v_atual is null then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  if v_atual = v_novo then
    return v_novo;
  end if;

  if exists (select 1 from public.tenants where slug = v_novo)
     or exists (select 1 from public.slugs_antigos where slug = v_novo and tenant_id <> p_tenant) then
    raise exception 'slug_em_uso' using errcode = '23505';
  end if;

  delete from public.slugs_antigos where slug = v_novo;
  update public.tenants set slug = v_novo where id = p_tenant;
  insert into public.slugs_antigos (slug, tenant_id) values (v_atual, p_tenant)
    on conflict (slug) do update set tenant_id = excluded.tenant_id, criado_em = now();

  return v_novo;
end;
$$;

revoke execute on function public.alterar_slug(uuid, text) from public, anon;
grant execute on function public.alterar_slug(uuid, text) to authenticated;

create or replace function public.slug_atual(p_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select t.slug
  from public.slugs_antigos s
  join public.tenants t on t.id = s.tenant_id
  where s.slug = p_slug;
$$;

revoke execute on function public.slug_atual(text) from public;
grant execute on function public.slug_atual(text) to anon, authenticated;

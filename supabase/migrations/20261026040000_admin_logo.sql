drop function public.admin_listar_esteticas();

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
  logo_versao bigint,
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
      t.status_assinatura, t.assinatura_valida_ate, t.valor_mensal, t.logo_versao, t.criado_em,
      (select count(*) from public.ordens_servico o where o.tenant_id = t.id),
      (select count(*) from public.ordens_servico o where o.tenant_id = t.id and o.criado_em > now() - interval '30 days'),
      (select max(o.criado_em) from public.ordens_servico o where o.tenant_id = t.id)
    from public.tenants t
    order by t.assinatura_valida_ate asc, t.nome;
end;
$$;

revoke execute on function public.admin_listar_esteticas() from public, anon;
grant execute on function public.admin_listar_esteticas() to authenticated;

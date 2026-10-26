create or replace function public.salvar_logo(p_tenant uuid, p_conteudo bytea, p_tipo text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versao bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if not (public.eh_admin() or p_tenant = public.tenant_atual()) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  insert into public.logos (tenant_id, conteudo, tipo)
  values (p_tenant, p_conteudo, p_tipo)
  on conflict (tenant_id) do update
  set conteudo = excluded.conteudo, tipo = excluded.tipo, atualizado_em = now();

  update public.tenants set logo_versao = v_versao where id = p_tenant;
  return v_versao;
end;
$$;

create or replace function public.remover_logo(p_tenant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.eh_admin() or p_tenant = public.tenant_atual()) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  delete from public.logos where tenant_id = p_tenant;
  update public.tenants set logo_versao = null where id = p_tenant;
end;
$$;

revoke execute on function public.salvar_logo(uuid, bytea, text) from public, anon;
revoke execute on function public.remover_logo(uuid) from public, anon;
grant execute on function public.salvar_logo(uuid, bytea, text) to authenticated;
grant execute on function public.remover_logo(uuid) to authenticated;

revoke delete on public.ordens_servico from authenticated;

create or replace function public.excluir_ordem_servico(p_os_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.tenant_atual();
  v_os public.ordens_servico;
begin
  if v_tenant is null or not exists (
    select 1 from public.perfis p where p.id = auth.uid() and p.tenant_id = v_tenant and p.papel = 'dono'
  ) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  select * into v_os from public.ordens_servico where id = p_os_id and tenant_id = v_tenant for update;
  if not found then
    raise exception 'os_inexistente' using errcode = 'P0002';
  end if;

  if v_os.plano_assinatura_id is not null then
    update public.planos_assinaturas
    set creditos_restantes = least(creditos_restantes + 1, total_creditos),
        status = case when status = 'esgotado' and validade >= current_date then 'ativo'::public.status_plano else status end
    where id = v_os.plano_assinatura_id and tenant_id = v_tenant;
  end if;

  update public.agendamentos
  set status = 'confirmado', ordem_servico_id = null
  where tenant_id = v_tenant and ordem_servico_id = v_os.id and status = 'concluido';

  delete from public.ordens_servico where id = v_os.id;

  return v_os.fotos_vistoria;
end;
$$;

revoke execute on function public.excluir_ordem_servico(uuid) from public, anon;
grant execute on function public.excluir_ordem_servico(uuid) to authenticated;

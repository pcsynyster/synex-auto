create index if not exists os_tenant_entregue_idx on public.ordens_servico (tenant_id, entregue_em desc) where status = 'entregue';

create or replace function public.resumo_painel(p_inicio timestamptz, p_fim timestamptz, p_agrupar text default 'dia')
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with fuso as (
    select coalesce((select t.fuso from public.tenants t where t.id = public.tenant_atual()), 'America/Fortaleza') as nome
  ),
  os as (
    select o.id, o.veiculo_id, o.valor_total, o.servicos_avulsos, o.plano_assinatura_id, o.entregue_em
    from public.ordens_servico o
    where o.status = 'entregue' and o.entregue_em >= p_inicio and o.entregue_em < p_fim
  ),
  ag as (
    select a.status from public.agendamentos a where a.inicio >= p_inicio and a.inicio < p_fim
  ),
  serie as (
    select
      to_char(date_trunc(case when p_agrupar = 'mes' then 'month' else 'day' end, os.entregue_em at time zone (select nome from fuso)), 'YYYY-MM-DD') as periodo,
      sum(os.valor_total) as valor,
      count(*) as carros
    from os group by 1
  ),
  itens as (
    select lower(trim(item ->> 'nome')) as chave, min(trim(item ->> 'nome')) as nome, count(*) as qtd, coalesce(sum((item ->> 'valor')::numeric), 0) as valor
    from os, jsonb_array_elements(os.servicos_avulsos) as item
    where coalesce(trim(item ->> 'nome'), '') <> ''
    group by 1
    order by 3 desc, 4 desc
    limit 5
  )
  select jsonb_build_object(
    'carros', (select count(*) from os),
    'recebido', (select coalesce(sum(valor_total), 0) from os),
    'clientes', (select count(distinct v.cliente_id) from os join public.veiculos v on v.id = os.veiculo_id),
    'com_plano', (select count(*) from os where plano_assinatura_id is not null),
    'em_andamento', (select count(*) from public.ordens_servico where status <> 'entregue'),
    'agendamentos', (
      select jsonb_build_object(
        'total', count(*),
        'concluido', count(*) filter (where status = 'concluido'),
        'aberto', count(*) filter (where status in ('pendente', 'confirmado')),
        'cancelado', count(*) filter (where status = 'cancelado'),
        'nao_compareceu', count(*) filter (where status = 'nao_compareceu')
      ) from ag
    ),
    'serie', coalesce((select jsonb_agg(jsonb_build_object('periodo', periodo, 'valor', valor, 'carros', carros) order by periodo) from serie), '[]'::jsonb),
    'servicos', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'qtd', qtd, 'valor', valor) order by qtd desc, valor desc) from itens), '[]'::jsonb)
  );
$$;

revoke execute on function public.resumo_painel(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.resumo_painel(timestamptz, timestamptz, text) to authenticated;

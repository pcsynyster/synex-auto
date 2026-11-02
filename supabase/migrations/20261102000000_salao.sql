create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  nome text not null check (char_length(nome) between 2 and 60),
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  unique (tenant_id, id)
);

create index profissionais_tenant_idx on public.profissionais (tenant_id, ordem);

alter table public.profissionais enable row level security;

create policy profissionais_tenant on public.profissionais
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

revoke all on public.profissionais from anon;

alter table public.agendamentos add column profissional_id uuid;
alter table public.agendamentos
  add constraint agendamentos_profissional_fk foreign key (tenant_id, profissional_id)
  references public.profissionais (tenant_id, id);
create index agendamentos_profissional_idx on public.agendamentos (tenant_id, profissional_id, inicio) where status in ('pendente', 'confirmado');

alter table public.bloqueios_agenda add column profissional_id uuid;
alter table public.bloqueios_agenda
  add constraint bloqueios_profissional_fk foreign key (tenant_id, profissional_id)
  references public.profissionais (tenant_id, id);

grant update (profissional_id) on public.agendamentos to authenticated;

create or replace function public.semear_agenda(p_tenant uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.horarios_funcionamento (tenant_id, dia_semana, abre, fecha, ativo)
  select p_tenant, d, '08:00', case when d = 6 then '14:00'::time else '19:00'::time end, d <> 0
  from generate_series(0, 6) d
  on conflict do nothing;

  insert into public.servicos (tenant_id, nome, descricao, duracao_min, preco, ordem)
  select p_tenant, s.nome, s.descricao, s.duracao, s.preco, s.ordem
  from (values
    ('Mão', 'Cutilagem e esmaltação tradicional', 45, 30.00, 1),
    ('Pé e mão', 'Cutilagem e esmaltação tradicional', 90, 55.00, 2),
    ('Esmaltação em gel', 'Mãos, com cutilagem', 60, 60.00, 3),
    ('Alongamento em fibra', 'Aplicação completa', 150, 150.00, 4),
    ('Manutenção de alongamento', 'A cada 15 a 21 dias', 90, 90.00, 5)
  ) as s(nome, descricao, duracao, preco, ordem)
  where not exists (select 1 from public.servicos x where x.tenant_id = p_tenant and x.ativo);

  insert into public.profissionais (tenant_id, nome, ordem)
  select p_tenant, 'Profissional 1', 1
  where not exists (select 1 from public.profissionais x where x.tenant_id = p_tenant);
$$;

update public.servicos
set ativo = false
where nome in ('Lavagem simples', 'Lavagem completa', 'Higienização interna', 'Polimento');

select public.semear_agenda(id) from public.tenants;

update public.agendamentos a
set profissional_id = (
  select p.id from public.profissionais p where p.tenant_id = a.tenant_id order by p.ordem, p.criado_em limit 1
)
where a.profissional_id is null;

create or replace function public.vagas_salao(
  p_tenant uuid,
  p_servico_id uuid,
  p_data date,
  p_profissional_id uuid,
  p_publico boolean
)
returns table (inicio timestamptz, profissional_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  t public.tenants;
  s public.servicos;
  h public.horarios_funcionamento;
  v_hoje date;
begin
  select * into t from public.tenants where id = p_tenant;
  if not found then
    return;
  end if;

  select * into s from public.servicos where id = p_servico_id and tenant_id = t.id and (ativo or not p_publico);
  if not found then
    return;
  end if;

  v_hoje := (now() at time zone t.fuso)::date;
  if p_publico and (p_data < v_hoje or p_data > v_hoje + t.janela_dias) then
    return;
  end if;

  select * into h
  from public.horarios_funcionamento
  where tenant_id = t.id and dia_semana = extract(dow from p_data)::int and ativo;
  if not found then
    return;
  end if;

  return query
    select distinct on (g.g) g.g, p.id
    from generate_series(
      (p_data + h.abre) at time zone t.fuso,
      ((p_data + h.fecha) at time zone t.fuso) - make_interval(mins => s.duracao_min),
      make_interval(mins => t.intervalo_agenda_min)
    ) as g(g)
    join public.profissionais p
      on p.tenant_id = t.id
     and p.ativo
     and (p_profissional_id is null or p.id = p_profissional_id)
    where g.g >= now() + (case when p_publico then make_interval(hours => t.antecedencia_min_horas) else interval '0' end)
      and not exists (
        select 1 from public.bloqueios_agenda b
        where b.tenant_id = t.id
          and (b.profissional_id is null or b.profissional_id = p.id)
          and b.inicio < g.g + make_interval(mins => s.duracao_min)
          and b.fim > g.g
      )
      and not exists (
        select 1 from public.agendamentos a
        where a.tenant_id = t.id
          and a.profissional_id = p.id
          and a.status in ('pendente', 'confirmado')
          and a.inicio < g.g + make_interval(mins => s.duracao_min)
          and a.fim > g.g
      )
    order by
      g.g,
      (
        select count(*) from public.agendamentos a2
        where a2.tenant_id = t.id
          and a2.profissional_id = p.id
          and a2.status in ('pendente', 'confirmado')
          and (a2.inicio at time zone t.fuso)::date = p_data
      ),
      p.ordem,
      p.nome;
end;
$$;

create or replace function public.horarios_livres(p_slug text, p_servico_id uuid, p_data date, p_profissional_id uuid default null)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t public.tenants;
begin
  t := public.tenant_agenda_por_slug(p_slug);
  if t.id is null then
    return;
  end if;
  return query select v.inicio from public.vagas_salao(t.id, p_servico_id, p_data, p_profissional_id, true) v order by 1;
end;
$$;

create or replace function public.horarios_livres_painel(p_servico_id uuid, p_data date, p_profissional_id uuid default null)
returns setof timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select v.inicio
  from public.vagas_salao(public.tenant_atual(), p_servico_id, p_data, p_profissional_id, false) v
  where public.tenant_atual() is not null
  order by 1;
$$;

create or replace function public.agenda_publica(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t public.tenants;
begin
  t := public.tenant_agenda_por_slug(p_slug);
  if t.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'nome', t.nome,
    'slug', t.slug,
    'logo_versao', t.logo_versao,
    'cidade', t.cidade,
    'telefone', t.telefone,
    'fuso', t.fuso,
    'hoje', (now() at time zone t.fuso)::date,
    'janela_dias', t.janela_dias,
    'dias_abertos', coalesce((
      select jsonb_agg(h.dia_semana order by h.dia_semana)
      from public.horarios_funcionamento h
      where h.tenant_id = t.id and h.ativo
    ), '[]'::jsonb),
    'dias_bloqueados', coalesce((
      select jsonb_agg(distinct (b.inicio at time zone t.fuso)::date)
      from public.bloqueios_agenda b
      where b.tenant_id = t.id
        and b.profissional_id is null
        and b.fim > now()
        and (b.inicio at time zone t.fuso)::time = '00:00'
        and b.fim - b.inicio >= interval '1 day'
    ), '[]'::jsonb),
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'nome', s.nome,
        'descricao', s.descricao,
        'duracao_min', s.duracao_min,
        'preco', s.preco
      ) order by s.ordem, s.nome)
      from public.servicos s
      where s.tenant_id = t.id and s.ativo
    ), '[]'::jsonb),
    'profissionais', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome) order by p.ordem, p.nome)
      from public.profissionais p
      where p.tenant_id = t.id and p.ativo
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.agendamento_publico(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', a.status,
    'inicio', a.inicio,
    'fim', a.fim,
    'servico', a.servico_nome,
    'preco', a.preco,
    'duracao_min', a.duracao_min,
    'profissional', p.nome,
    'nome', split_part(a.nome_cliente, ' ', 1),
    'empresa', t.nome,
    'telefone_empresa', t.telefone,
    'cidade', t.cidade,
    'slug', t.slug,
    'logo_versao', t.logo_versao,
    'fuso', t.fuso,
    'pode_cancelar', a.status in ('pendente', 'confirmado') and a.inicio > now() + interval '2 hours'
  )
  from public.agendamentos a
  join public.tenants t on t.id = a.tenant_id
  left join public.profissionais p on p.id = a.profissional_id
  where a.token_publico = p_token;
$$;

create or replace function public.agendar_publico(
  p_slug text,
  p_servico_id uuid,
  p_profissional_id uuid,
  p_inicio timestamptz,
  p_nome text,
  p_whatsapp text,
  p_observacoes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenants;
  s public.servicos;
  v_prof uuid;
  v_cliente uuid;
  a public.agendamentos;
begin
  t := public.tenant_agenda_por_slug(p_slug);
  if t.id is null then
    raise exception 'agenda_indisponivel' using errcode = 'P0002';
  end if;

  select * into s from public.servicos where id = p_servico_id and tenant_id = t.id and ativo;
  if not found then
    raise exception 'servico_invalido' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(t.id::text, 0));

  if (
    select count(*) from public.agendamentos
    where tenant_id = t.id and whatsapp = p_whatsapp and status in ('pendente', 'confirmado') and inicio > now()
  ) >= 3 then
    raise exception 'limite_agendamentos' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.agendamentos
    where tenant_id = t.id and origem = 'cliente' and criado_em > now() - interval '1 hour'
  ) >= 40 then
    raise exception 'muitas_tentativas' using errcode = 'P0001';
  end if;

  select v.profissional_id into v_prof
  from public.vagas_salao(t.id, s.id, (p_inicio at time zone t.fuso)::date, p_profissional_id, true) v
  where v.inicio = p_inicio
  limit 1;

  if v_prof is null then
    raise exception 'horario_indisponivel' using errcode = 'P0001';
  end if;

  select id into v_cliente from public.clientes where tenant_id = t.id and whatsapp = p_whatsapp;

  insert into public.agendamentos (
    tenant_id, servico_id, cliente_id, profissional_id, nome_cliente, whatsapp,
    servico_nome, duracao_min, preco, inicio, fim, status, observacoes, origem
  )
  values (
    t.id, s.id, v_cliente, v_prof, trim(p_nome), p_whatsapp,
    s.nome, s.duracao_min, s.preco, p_inicio, p_inicio + make_interval(mins => s.duracao_min),
    case when t.confirmacao_automatica then 'confirmado'::public.status_agendamento else 'pendente'::public.status_agendamento end,
    nullif(trim(p_observacoes), ''), 'cliente'
  )
  returning * into a;

  return public.agendamento_publico(a.token_publico) || jsonb_build_object('token', a.token_publico);
end;
$$;

create or replace function public.criar_agendamento_painel(
  p_servico_id uuid,
  p_profissional_id uuid,
  p_inicio timestamptz,
  p_nome text,
  p_whatsapp text,
  p_observacoes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenants;
  s public.servicos;
  v_prof uuid;
  a public.agendamentos;
begin
  select * into t from public.tenants where id = public.tenant_atual();
  if not found then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  select * into s from public.servicos where id = p_servico_id and tenant_id = t.id;
  if not found then
    raise exception 'servico_invalido' using errcode = 'P0002';
  end if;

  if char_length(trim(coalesce(p_nome, ''))) < 2 or p_whatsapp !~ '^[0-9]{12,13}$' then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(t.id::text, 0));

  select v.profissional_id into v_prof
  from public.vagas_salao(t.id, s.id, (p_inicio at time zone t.fuso)::date, p_profissional_id, false) v
  where v.inicio = p_inicio
  limit 1;

  if v_prof is null then
    raise exception 'horario_indisponivel' using errcode = 'P0001';
  end if;

  insert into public.agendamentos (
    tenant_id, servico_id, cliente_id, profissional_id, nome_cliente, whatsapp,
    servico_nome, duracao_min, preco, inicio, fim, status, observacoes, origem
  )
  values (
    t.id, s.id, (select c.id from public.clientes c where c.tenant_id = t.id and c.whatsapp = p_whatsapp), v_prof,
    trim(p_nome), p_whatsapp, s.nome, s.duracao_min, s.preco, p_inicio, p_inicio + make_interval(mins => s.duracao_min),
    'confirmado', nullif(trim(p_observacoes), ''), 'painel'
  )
  returning * into a;

  return jsonb_build_object('id', a.id, 'token', a.token_publico);
end;
$$;

create or replace function public.criar_agendamento_publico(
  p_slug text,
  p_servico_id uuid,
  p_inicio timestamptz,
  p_nome text,
  p_whatsapp text,
  p_placa text,
  p_modelo text,
  p_observacoes text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.agendar_publico(p_slug, p_servico_id, null, p_inicio, p_nome, p_whatsapp, p_observacoes);
$$;

create or replace function public.horarios_disponiveis(p_slug text, p_servico_id uuid, p_data date)
returns setof timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.horarios_livres(p_slug, p_servico_id, p_data, null);
$$;

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
  ag as (
    select a.* from public.agendamentos a where a.inicio >= p_inicio and a.inicio < p_fim
  ),
  feitos as (
    select * from ag where status = 'concluido'
  ),
  serie as (
    select
      to_char(date_trunc(case when p_agrupar = 'mes' then 'month' else 'day' end, f.inicio at time zone (select nome from fuso)), 'YYYY-MM-DD') as periodo,
      sum(f.preco) as valor,
      count(*) as atendimentos
    from feitos f group by 1
  ),
  itens as (
    select f.servico_nome as nome, count(*) as qtd, sum(f.preco) as valor
    from feitos f group by 1 order by 2 desc, 3 desc limit 5
  ),
  equipe as (
    select coalesce(p.nome, 'Sem profissional') as nome, count(*) as qtd, sum(f.preco) as valor
    from feitos f left join public.profissionais p on p.id = f.profissional_id
    group by 1 order by 3 desc
  )
  select jsonb_build_object(
    'atendimentos', (select count(*) from feitos),
    'recebido', (select coalesce(sum(preco), 0) from feitos),
    'clientes', (select count(distinct whatsapp) from feitos),
    'proximos', (select count(*) from public.agendamentos where status in ('pendente', 'confirmado') and inicio >= now()),
    'agendamentos', (
      select jsonb_build_object(
        'total', count(*),
        'concluido', count(*) filter (where status = 'concluido'),
        'aberto', count(*) filter (where status in ('pendente', 'confirmado')),
        'cancelado', count(*) filter (where status = 'cancelado'),
        'nao_compareceu', count(*) filter (where status = 'nao_compareceu')
      ) from ag
    ),
    'serie', coalesce((select jsonb_agg(jsonb_build_object('periodo', periodo, 'valor', valor, 'carros', atendimentos) order by periodo) from serie), '[]'::jsonb),
    'servicos', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'qtd', qtd, 'valor', valor) order by qtd desc, valor desc) from itens), '[]'::jsonb),
    'profissionais', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'qtd', qtd, 'valor', valor) order by valor desc) from equipe), '[]'::jsonb)
  );
$$;

revoke execute on function public.vagas_salao(uuid, uuid, date, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.horarios_livres(text, uuid, date, uuid) from public;
revoke execute on function public.horarios_livres_painel(uuid, date, uuid) from public, anon;
revoke execute on function public.agendar_publico(text, uuid, uuid, timestamptz, text, text, text) from public;
revoke execute on function public.criar_agendamento_painel(uuid, uuid, timestamptz, text, text, text) from public, anon;
grant execute on function public.horarios_livres(text, uuid, date, uuid) to anon, authenticated;
grant execute on function public.horarios_livres_painel(uuid, date, uuid) to authenticated;
grant execute on function public.agendar_publico(text, uuid, uuid, timestamptz, text, text, text) to anon, authenticated;
grant execute on function public.criar_agendamento_painel(uuid, uuid, timestamptz, text, text, text) to authenticated;

create or replace function public.semear_agenda(p_tenant uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.horarios_funcionamento (tenant_id, dia_semana, abre, fecha, ativo)
  select p_tenant, d, '08:00', case when d = 6 then '14:00'::time else '19:00'::time end, d <> 0
  from generate_series(0, 6) d
  on conflict do nothing;

  insert into public.servicos (tenant_id, nome, descricao, duracao_min, preco, ordem)
  select p_tenant, s.nome, s.descricao, s.duracao, s.preco, s.ordem
  from (values
    ('Mão', 'Cutilagem e esmaltação tradicional', 45, 30.00, 1),
    ('Pé e mão', 'Cutilagem e esmaltação tradicional', 90, 55.00, 2),
    ('Esmaltação em gel', 'Mãos, com cutilagem', 60, 60.00, 3),
    ('Alongamento em fibra', 'Aplicação completa', 150, 150.00, 4),
    ('Manutenção de alongamento', 'A cada 15 a 21 dias', 90, 90.00, 5)
  ) as s(nome, descricao, duracao, preco, ordem)
  where not exists (select 1 from public.servicos x where x.tenant_id = p_tenant and x.ativo);

  insert into public.profissionais (tenant_id, nome, ordem)
  select p_tenant,
    coalesce(
      (select split_part(p.nome, ' ', 1) from public.perfis p where p.tenant_id = p_tenant and p.papel = 'dono' and char_length(split_part(p.nome, ' ', 1)) >= 2 and p.nome <> 'Responsável' order by p.criado_em limit 1),
      'Profissional 1'
    ),
    1
  where not exists (select 1 from public.profissionais x where x.tenant_id = p_tenant);
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
      (select count(*) from public.agendamentos a where a.tenant_id = t.id and a.status = 'concluido'),
      (select count(*) from public.agendamentos a where a.tenant_id = t.id and a.status = 'concluido' and a.inicio > now() - interval '30 days'),
      (select max(a.inicio) from public.agendamentos a where a.tenant_id = t.id and a.status = 'concluido')
    from public.tenants t
    order by t.assinatura_valida_ate asc, t.nome;
end;
$$;

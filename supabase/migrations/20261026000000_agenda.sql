create type public.status_agendamento as enum ('pendente', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu');

alter table public.tenants
  add column fuso text not null default 'America/Fortaleza',
  add column agenda_ativa boolean not null default true,
  add column confirmacao_automatica boolean not null default false,
  add column intervalo_agenda_min integer not null default 30 check (intervalo_agenda_min in (15, 20, 30, 45, 60)),
  add column capacidade_simultanea integer not null default 1 check (capacidade_simultanea between 1 and 20),
  add column antecedencia_min_horas integer not null default 1 check (antecedencia_min_horas between 0 and 72),
  add column janela_dias integer not null default 14 check (janela_dias between 1 and 60);

alter table public.ordens_servico add constraint ordens_servico_tenant_id_id_key unique (tenant_id, id);

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 80),
  descricao text check (char_length(descricao) <= 200),
  duracao_min integer not null check (duracao_min between 10 and 720),
  preco numeric(10, 2) not null default 0 check (preco >= 0),
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.horarios_funcionamento (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  abre time not null,
  fecha time not null,
  ativo boolean not null default true,
  primary key (tenant_id, dia_semana),
  check (fecha > abre)
);

create table public.bloqueios_agenda (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text check (char_length(motivo) <= 120),
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  servico_id uuid,
  cliente_id uuid,
  ordem_servico_id uuid,
  nome_cliente text not null check (char_length(nome_cliente) between 2 and 120),
  whatsapp text not null check (whatsapp ~ '^[0-9]{12,13}$'),
  placa text check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  modelo text check (char_length(modelo) <= 80),
  servico_nome text not null,
  duracao_min integer not null,
  preco numeric(10, 2) not null default 0,
  inicio timestamptz not null,
  fim timestamptz not null,
  status public.status_agendamento not null default 'pendente',
  observacoes text check (char_length(observacoes) <= 300),
  origem text not null default 'cliente' check (origem in ('cliente', 'painel')),
  token_publico text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim > inicio),
  foreign key (tenant_id, servico_id) references public.servicos (tenant_id, id) on delete set null (servico_id),
  foreign key (tenant_id, cliente_id) references public.clientes (tenant_id, id) on delete set null (cliente_id),
  foreign key (tenant_id, ordem_servico_id) references public.ordens_servico (tenant_id, id) on delete set null (ordem_servico_id)
);

create index servicos_tenant_idx on public.servicos (tenant_id, ordem);
create index bloqueios_tenant_idx on public.bloqueios_agenda (tenant_id, inicio);
create index agendamentos_tenant_inicio_idx on public.agendamentos (tenant_id, inicio);
create index agendamentos_ativos_idx on public.agendamentos (tenant_id, inicio, fim) where status in ('pendente', 'confirmado');
create index agendamentos_whatsapp_idx on public.agendamentos (tenant_id, whatsapp);
create index agendamentos_servico_idx on public.agendamentos (servico_id);
create index agendamentos_cliente_idx on public.agendamentos (cliente_id);
create index agendamentos_os_idx on public.agendamentos (ordem_servico_id);

create trigger servicos_atualizado before update on public.servicos for each row execute function public.tocar_atualizado_em();
create trigger agendamentos_atualizado before update on public.agendamentos for each row execute function public.tocar_atualizado_em();

create or replace function public.semear_agenda(p_tenant uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.horarios_funcionamento (tenant_id, dia_semana, abre, fecha, ativo)
  select p_tenant, d, '08:00', case when d = 6 then '13:00'::time else '18:00'::time end, d <> 0
  from generate_series(0, 6) d
  on conflict do nothing;

  insert into public.servicos (tenant_id, nome, duracao_min, preco, ordem)
  select p_tenant, s.nome, s.duracao, s.preco, s.ordem
  from (values
    ('Lavagem simples', 40, 40.00, 1),
    ('Lavagem completa', 60, 70.00, 2),
    ('Higienização interna', 180, 250.00, 3),
    ('Polimento', 240, 400.00, 4)
  ) as s(nome, duracao, preco, ordem)
  where not exists (select 1 from public.servicos x where x.tenant_id = p_tenant);
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

    perform public.semear_agenda(v_tenant);
  end if;
  return new;
end;
$$;

select public.semear_agenda(id) from public.tenants;

create or replace function public.agenda_tem_vaga(p_tenant uuid, p_inicio timestamptz, p_fim timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with t as (
    select
      (p_inicio at time zone fuso) as li,
      (p_fim at time zone fuso) as lf,
      capacidade_simultanea as cap
    from public.tenants
    where id = p_tenant
  )
  select
    exists (
      select 1
      from t
      join public.horarios_funcionamento h
        on h.tenant_id = p_tenant
       and h.ativo
       and h.dia_semana = extract(dow from t.li)::int
      where t.li::date = t.lf::date
        and t.li::time >= h.abre
        and t.lf::time <= h.fecha
    )
    and not exists (
      select 1 from public.bloqueios_agenda b
      where b.tenant_id = p_tenant and b.inicio < p_fim and b.fim > p_inicio
    )
    and (
      select count(*) from public.agendamentos a
      where a.tenant_id = p_tenant
        and a.status in ('pendente', 'confirmado')
        and a.inicio < p_fim
        and a.fim > p_inicio
    ) < (select cap from t);
$$;

create or replace function public.tenant_agenda_por_slug(p_slug text)
returns public.tenants
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.tenants
  where slug = p_slug
    and agenda_ativa
    and status_assinatura in ('trial', 'ativa')
    and assinatura_valida_ate >= current_date;
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
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.horarios_disponiveis(p_slug text, p_servico_id uuid, p_data date)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t public.tenants;
  s public.servicos;
  h public.horarios_funcionamento;
  v_hoje date;
begin
  t := public.tenant_agenda_por_slug(p_slug);
  if t.id is null then
    return;
  end if;

  select * into s from public.servicos where id = p_servico_id and tenant_id = t.id and ativo;
  if not found then
    return;
  end if;

  v_hoje := (now() at time zone t.fuso)::date;
  if p_data < v_hoje or p_data > v_hoje + t.janela_dias then
    return;
  end if;

  select * into h
  from public.horarios_funcionamento
  where tenant_id = t.id and dia_semana = extract(dow from p_data)::int and ativo;
  if not found then
    return;
  end if;

  return query
    select g
    from generate_series(
      (p_data + h.abre) at time zone t.fuso,
      ((p_data + h.fecha) at time zone t.fuso) - make_interval(mins => s.duracao_min),
      make_interval(mins => t.intervalo_agenda_min)
    ) as g
    where g >= now() + make_interval(hours => t.antecedencia_min_horas)
      and public.agenda_tem_vaga(t.id, g, g + make_interval(mins => s.duracao_min))
    order by g;
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
    'placa', a.placa,
    'modelo', a.modelo,
    'nome', split_part(a.nome_cliente, ' ', 1),
    'empresa', t.nome,
    'telefone_empresa', t.telefone,
    'cidade', t.cidade,
    'slug', t.slug,
    'fuso', t.fuso,
    'pode_cancelar', a.status in ('pendente', 'confirmado') and a.inicio > now() + interval '2 hours'
  )
  from public.agendamentos a
  join public.tenants t on t.id = a.tenant_id
  where a.token_publico = p_token;
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
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenants;
  s public.servicos;
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

  if not exists (
    select 1 from public.horarios_disponiveis(p_slug, p_servico_id, (p_inicio at time zone t.fuso)::date) d
    where d = p_inicio
  ) then
    raise exception 'horario_indisponivel' using errcode = 'P0001';
  end if;

  select id into v_cliente from public.clientes where tenant_id = t.id and whatsapp = p_whatsapp;

  insert into public.agendamentos (
    tenant_id, servico_id, cliente_id, nome_cliente, whatsapp, placa, modelo,
    servico_nome, duracao_min, preco, inicio, fim, status, observacoes, origem
  )
  values (
    t.id, s.id, v_cliente, trim(p_nome), p_whatsapp, nullif(p_placa, ''), nullif(trim(p_modelo), ''),
    s.nome, s.duracao_min, s.preco, p_inicio, p_inicio + make_interval(mins => s.duracao_min),
    case when t.confirmacao_automatica then 'confirmado'::public.status_agendamento else 'pendente'::public.status_agendamento end,
    nullif(trim(p_observacoes), ''), 'cliente'
  )
  returning * into a;

  return public.agendamento_publico(a.token_publico) || jsonb_build_object('token', a.token_publico);
end;
$$;

create or replace function public.cancelar_agendamento_publico(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agendamentos
  set status = 'cancelado'
  where token_publico = p_token
    and status in ('pendente', 'confirmado')
    and inicio > now() + interval '2 hours';

  if not found then
    raise exception 'cancelamento_indisponivel' using errcode = 'P0001';
  end if;

  return public.agendamento_publico(p_token);
end;
$$;

revoke execute on function public.semear_agenda(uuid) from public, anon, authenticated;
revoke execute on function public.agenda_tem_vaga(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.tenant_agenda_por_slug(text) from public, anon, authenticated;
revoke execute on function public.agenda_publica(text) from public;
revoke execute on function public.horarios_disponiveis(text, uuid, date) from public;
revoke execute on function public.agendamento_publico(text) from public;
revoke execute on function public.criar_agendamento_publico(text, uuid, timestamptz, text, text, text, text, text) from public;
revoke execute on function public.cancelar_agendamento_publico(text) from public;
grant execute on function public.agenda_publica(text) to anon, authenticated;
grant execute on function public.horarios_disponiveis(text, uuid, date) to anon, authenticated;
grant execute on function public.agendamento_publico(text) to anon, authenticated;
grant execute on function public.criar_agendamento_publico(text, uuid, timestamptz, text, text, text, text, text) to anon, authenticated;
grant execute on function public.cancelar_agendamento_publico(text) to anon, authenticated;

alter table public.servicos enable row level security;
alter table public.horarios_funcionamento enable row level security;
alter table public.bloqueios_agenda enable row level security;
alter table public.agendamentos enable row level security;

create policy servicos_tenant on public.servicos
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

create policy horarios_tenant on public.horarios_funcionamento
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

create policy bloqueios_tenant on public.bloqueios_agenda
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

create policy agendamentos_tenant on public.agendamentos
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

revoke all on public.servicos, public.horarios_funcionamento, public.bloqueios_agenda, public.agendamentos from anon;
revoke insert, update on public.agendamentos from authenticated;
grant update (status, observacoes, ordem_servico_id) on public.agendamentos to authenticated;
grant update (
  nome, telefone, cidade, chave_pix, agenda_ativa, confirmacao_automatica,
  intervalo_agenda_min, capacidade_simultanea, antecedencia_min_horas, janela_dias
) on public.tenants to authenticated;

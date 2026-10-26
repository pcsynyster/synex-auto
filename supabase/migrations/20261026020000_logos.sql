alter table public.tenants add column logo_versao bigint;

create table public.logos (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  conteudo bytea not null check (octet_length(conteudo) <= 512000),
  tipo text not null check (tipo in ('image/png', 'image/jpeg', 'image/webp')),
  atualizado_em timestamptz not null default now()
);

alter table public.logos enable row level security;

create policy logos_tenant on public.logos
  for all to authenticated
  using (tenant_id = (select public.tenant_atual()))
  with check (tenant_id = (select public.tenant_atual()));

revoke all on public.logos from anon;

create or replace function public.logo_por_slug(p_slug text)
returns table (conteudo bytea, tipo text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.conteudo, l.tipo
  from public.logos l
  join public.tenants t on t.id = l.tenant_id
  where t.slug = p_slug;
$$;

revoke execute on function public.logo_por_slug(text) from public;
grant execute on function public.logo_por_slug(text) to anon, authenticated;

grant select (slug, logo_versao) on public.tenants to anon;
grant update (logo_versao) on public.tenants to authenticated;

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
    'logo_versao', t.logo_versao,
    'fuso', t.fuso,
    'pode_cancelar', a.status in ('pendente', 'confirmado') and a.inicio > now() + interval '2 hours'
  )
  from public.agendamentos a
  join public.tenants t on t.id = a.tenant_id
  where a.token_publico = p_token;
$$;

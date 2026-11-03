alter table public.servicos add column if not exists categoria text check (char_length(categoria) <= 40);
alter table public.servicos add column if not exists adicional boolean not null default false;

create or replace function public.agenda_publica(p_slug text)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
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
        'preco', s.preco,
        'categoria', s.categoria,
        'adicional', s.adicional
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
$function$;

create or replace function public.agendar_publico_com_adicionais(
  p_slug text,
  p_servico_id uuid,
  p_profissional_id uuid,
  p_inicio timestamptz,
  p_nome text,
  p_whatsapp text,
  p_observacoes text,
  p_adicionais uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  t public.tenants;
  v_resultado jsonb;
  v_token text;
  v_nomes text;
  v_soma numeric;
begin
  t := public.tenant_agenda_por_slug(p_slug);
  if t.id is null then
    raise exception 'agenda_indisponivel' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.servicos where id = p_servico_id and tenant_id = t.id and adicional) then
    raise exception 'servico_invalido' using errcode = 'P0002';
  end if;

  if coalesce(array_length(p_adicionais, 1), 0) > 8 then
    raise exception 'servico_invalido' using errcode = 'P0002';
  end if;

  v_resultado := public.agendar_publico(p_slug, p_servico_id, p_profissional_id, p_inicio, p_nome, p_whatsapp, p_observacoes);
  v_token := v_resultado ->> 'token';

  if coalesce(array_length(p_adicionais, 1), 0) > 0 then
    select string_agg(s.nome, ' + ' order by s.ordem, s.nome), sum(s.preco)
    into v_nomes, v_soma
    from public.servicos s
    where s.tenant_id = t.id and s.ativo and s.id <> p_servico_id and s.id = any (p_adicionais);

    if v_nomes is not null then
      update public.agendamentos
      set servico_nome = left(servico_nome || ' + ' || v_nomes, 200),
          preco = preco + v_soma
      where token_publico = v_token;
      v_resultado := public.agendamento_publico(v_token) || jsonb_build_object('token', v_token);
    end if;
  end if;

  return v_resultado;
end;
$function$;

revoke all on function public.agendar_publico_com_adicionais(text, uuid, uuid, timestamptz, text, text, text, uuid[]) from public;
grant execute on function public.agendar_publico_com_adicionais(text, uuid, uuid, timestamptz, text, text, text, uuid[]) to anon, authenticated;

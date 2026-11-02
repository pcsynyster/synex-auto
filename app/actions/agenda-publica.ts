"use server";

import { z } from "zod";
import { env } from "@/lib/env";
import { criarClienteAnonimo } from "@/lib/supabase/anon";
import { PADRAO_SLUG, PADRAO_TOKEN, type AgendamentoPublico } from "@/lib/agenda";
import { dataNoFuso, dataValida, horaNoFuso, rotuloDataLonga } from "@/lib/datas";
import { falha, sucesso, traduzirErroAgenda, type Resultado } from "@/lib/resultado";
import { formatarTelefone, normalizarWhatsapp } from "@/lib/telefone";
import { enviarWhatsapp, mensagemAgendamentoRecebido, mensagemNovoAgendamentoLoja } from "@/lib/whatsapp";

export async function buscarHorarios(slug: string, servicoId: string, data: string, profissionalId: string | null): Promise<Resultado<string[]>> {
  if (!PADRAO_SLUG.test(slug) || !z.uuid().safeParse(servicoId).success || !dataValida(data)) {
    return falha("Dados inválidos.");
  }
  if (profissionalId && !z.uuid().safeParse(profissionalId).success) return falha("Dados inválidos.");

  const { data: horarios, error } = await criarClienteAnonimo().rpc("horarios_livres", {
    p_slug: slug,
    p_servico_id: servicoId,
    p_data: data,
    p_profissional_id: profissionalId ?? undefined,
  });

  if (error) return falha("Não foi possível carregar os horários.");
  return sucesso(horarios ?? []);
}

const esquemaAgendamento = z.object({
  slug: z.string().regex(PADRAO_SLUG),
  servicoId: z.uuid(),
  profissionalId: z.uuid().nullable(),
  inicio: z.iso.datetime({ offset: true }),
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  whatsapp: z
    .string()
    .transform(normalizarWhatsapp)
    .refine((valor): valor is string => valor !== null, "WhatsApp inválido. Use DDD + número."),
  observacoes: z.string().trim().max(300).optional(),
});

export type DadosAgendamento = z.input<typeof esquemaAgendamento>;

export async function agendar(dados: DadosAgendamento): Promise<Resultado<{ token: string }>> {
  const validacao = esquemaAgendamento.safeParse(dados);
  if (!validacao.success) return falha(validacao.error.issues[0]?.message ?? "Confira os dados.");

  const { slug, servicoId, profissionalId, inicio, nome, whatsapp, observacoes } = validacao.data;

  const { data, error } = await criarClienteAnonimo().rpc("agendar_publico", {
    p_slug: slug,
    p_servico_id: servicoId,
    p_profissional_id: profissionalId as string,
    p_inicio: inicio,
    p_nome: nome,
    p_whatsapp: whatsapp,
    p_observacoes: (observacoes || null) as string,
  });

  if (error || !data) return falha(traduzirErroAgenda(error?.message ?? ""));

  const agendamento = data as AgendamentoPublico & { token: string };
  const quando = `${rotuloDataLonga(dataNoFuso(agendamento.inicio, agendamento.fuso))}, às ${horaNoFuso(agendamento.inicio, agendamento.fuso)}`;
  const base = {
    empresa: agendamento.empresa,
    cliente: agendamento.nome,
    servico: agendamento.servico,
    quando,
    profissional: agendamento.profissional,
    link: `${env.appUrl}/agendamento/${agendamento.token}`,
  };

  await Promise.all([
    enviarWhatsapp({ telefone: whatsapp, mensagem: mensagemAgendamentoRecebido(base, agendamento.status === "confirmado") }),
    enviarWhatsapp({
      telefone: normalizarWhatsapp(agendamento.telefone_empresa) ?? agendamento.telefone_empresa,
      mensagem: mensagemNovoAgendamentoLoja({ ...base, cliente: nome, whatsappCliente: formatarTelefone(whatsapp) }),
    }),
  ]);

  return sucesso({ token: agendamento.token });
}

export async function cancelarAgendamentoCliente(token: string): Promise<Resultado<AgendamentoPublico>> {
  if (!PADRAO_TOKEN.test(token)) return falha("Link inválido.");

  const { data, error } = await criarClienteAnonimo().rpc("cancelar_agendamento_publico", { p_token: token });
  if (error || !data) return falha(traduzirErroAgenda(error?.message ?? ""));

  return sucesso(data as AgendamentoPublico);
}

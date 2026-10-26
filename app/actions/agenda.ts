"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { dataNoFuso, dataValida, horaNoFuso, instanteLocal, rotuloDataLonga, somarDias } from "@/lib/datas";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { obterContexto } from "@/lib/sessao";
import { enviarWhatsapp, mensagemAgendamentoCancelado, mensagemAgendamentoConfirmado } from "@/lib/whatsapp";
import type { StatusAgendamento } from "@/types/database.types";

const TRANSICOES: Record<"confirmado" | "cancelado" | "nao_compareceu", StatusAgendamento[]> = {
  confirmado: ["pendente"],
  cancelado: ["pendente", "confirmado"],
  nao_compareceu: ["confirmado", "pendente"],
};

function revalidarAgenda() {
  revalidatePath("/painel", "layout");
}

export async function atualizarStatusAgendamento(
  id: string,
  status: keyof typeof TRANSICOES,
): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");
  if (!z.uuid().safeParse(id).success || !(status in TRANSICOES)) return falha("Dados inválidos.");

  const { data, error } = await ctx.supabase
    .from("agendamentos")
    .update({ status })
    .eq("id", id)
    .in("status", TRANSICOES[status])
    .select("nome_cliente, whatsapp, servico_nome, inicio, token_publico")
    .maybeSingle();

  if (error) return falha("Não foi possível atualizar o agendamento.");
  if (!data) return falha("Esse agendamento já foi alterado. Atualize a página.");

  revalidarAgenda();

  if (status === "nao_compareceu") return sucesso(null);

  const fuso = ctx.tenant.fuso;
  const dados = {
    empresa: ctx.tenant.nome,
    cliente: data.nome_cliente.split(" ")[0] ?? data.nome_cliente,
    servico: data.servico_nome,
    quando: `${rotuloDataLonga(dataNoFuso(data.inicio, fuso))}, às ${horaNoFuso(data.inicio, fuso)}`,
    placa: null,
    link: status === "confirmado" ? `${env.appUrl}/agendamento/${data.token_publico}` : `${env.appUrl}/agendar/${ctx.tenant.slug}`,
  };

  const envio = await enviarWhatsapp({
    telefone: data.whatsapp,
    mensagem: status === "confirmado" ? mensagemAgendamentoConfirmado(dados) : mensagemAgendamentoCancelado(dados),
  });

  return sucesso(null, envio.enviado ? undefined : "Atualizado, mas o WhatsApp não foi enviado ao cliente.");
}

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const esquemaConfig = z.object({
  agenda_ativa: z.boolean(),
  confirmacao_automatica: z.boolean(),
  intervalo_agenda_min: z.union([z.literal(15), z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
  capacidade_simultanea: z.number().int().min(1).max(20),
  antecedencia_min_horas: z.number().int().min(0).max(72),
  janela_dias: z.number().int().min(1).max(60),
  horarios: z
    .array(z.object({ dia_semana: z.number().int().min(0).max(6), ativo: z.boolean(), abre: hora, fecha: hora }))
    .length(7),
});

export type ConfigAgenda = z.input<typeof esquemaConfig>;

export async function salvarConfigAgenda(config: ConfigAgenda): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");

  const validacao = esquemaConfig.safeParse(config);
  if (!validacao.success) return falha("Confira os valores da agenda.");

  const { horarios, ...regras } = validacao.data;
  if (horarios.some((item) => item.ativo && item.fecha <= item.abre)) {
    return falha("O horário de fechamento precisa ser depois da abertura.");
  }

  const [{ error: erroRegras }, { error: erroHorarios }] = await Promise.all([
    ctx.supabase.from("tenants").update(regras).eq("id", ctx.tenantId),
    ctx.supabase.from("horarios_funcionamento").upsert(
      horarios.map((item) => ({ ...item, tenant_id: ctx.tenantId })),
      { onConflict: "tenant_id,dia_semana" },
    ),
  ]);

  if (erroRegras || erroHorarios) return falha("Não foi possível salvar a configuração.");

  revalidarAgenda();
  return sucesso(null);
}

const esquemaServico = z.object({
  id: z.uuid().optional(),
  nome: z.string().trim().min(2, "Nome muito curto.").max(80),
  duracao_min: z.number().int().min(10, "Duração mínima de 10 min.").max(720),
  preco: z.number().min(0).max(100000),
  ativo: z.boolean(),
});

export type DadosServico = z.input<typeof esquemaServico>;

export async function salvarServico(dados: DadosServico): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");

  const validacao = esquemaServico.safeParse(dados);
  if (!validacao.success) return falha(validacao.error.issues[0]?.message ?? "Confira o serviço.");

  const { id, ...campos } = validacao.data;
  const { error } = id
    ? await ctx.supabase.from("servicos").update(campos).eq("id", id)
    : await ctx.supabase.from("servicos").insert({ ...campos, tenant_id: ctx.tenantId, ordem: 99 });

  if (error) return falha("Não foi possível salvar o serviço.");

  revalidarAgenda();
  return sucesso(null);
}

export async function adicionarBloqueio(data: string, motivo: string): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");
  if (!dataValida(data)) return falha("Data inválida.");

  const { error } = await ctx.supabase.from("bloqueios_agenda").insert({
    tenant_id: ctx.tenantId,
    inicio: instanteLocal(data, "00:00", ctx.tenant.fuso).toISOString(),
    fim: instanteLocal(somarDias(data, 1), "00:00", ctx.tenant.fuso).toISOString(),
    motivo: motivo.trim().slice(0, 120) || null,
  });

  if (error) return falha("Não foi possível bloquear o dia.");

  revalidarAgenda();
  return sucesso(null);
}

export async function removerBloqueio(id: string): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");
  if (!z.uuid().safeParse(id).success) return falha("Dados inválidos.");

  const { error } = await ctx.supabase.from("bloqueios_agenda").delete().eq("id", id);
  if (error) return falha("Não foi possível remover o bloqueio.");

  revalidarAgenda();
  return sucesso(null);
}

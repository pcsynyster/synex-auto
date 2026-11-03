"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { dataNoFuso, dataValida, horaNoFuso, instanteLocal, rotuloDataLonga, somarDias } from "@/lib/datas";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { obterContexto } from "@/lib/sessao";
import { exibirChavePix } from "@/lib/chave-pix";
import { formatarMoeda } from "@/lib/formato";
import { normalizarWhatsapp } from "@/lib/telefone";
import { avisoNotificacao, mensagemAgendamentoCancelado, mensagemAgendamentoConfirmado, mensagemAtendido, notificar } from "@/lib/whatsapp";
import type { StatusAgendamento } from "@/types/database.types";

const TRANSICOES: Record<"confirmado" | "cancelado" | "nao_compareceu" | "concluido", StatusAgendamento[]> = {
  confirmado: ["pendente"],
  concluido: ["confirmado", "pendente"],
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
    .select("nome_cliente, whatsapp, servico_nome, inicio, preco, token_publico, profissionais(nome)")
    .maybeSingle();

  if (error) return falha("Não foi possível atualizar o agendamento.");
  if (!data) return falha("Esse agendamento já foi alterado. Atualize a página.");

  revalidarAgenda();

  if (status === "nao_compareceu") return sucesso(null);

  const primeiroNome = data.nome_cliente.split(" ")[0] ?? data.nome_cliente;
  if (status === "concluido") {
    const pagamento =
      ctx.tenant.chave_pix && Number(data.preco) > 0
        ? { valor: formatarMoeda(Number(data.preco)), chave: exibirChavePix(ctx.tenant.chave_pix), titular: ctx.tenant.pix_titular }
        : null;
    const envio = await notificar({
      telefone: data.whatsapp,
      mensagem: mensagemAtendido({ empresa: ctx.tenant.nome, cliente: primeiroNome, servico: data.servico_nome }, pagamento),
    });
    return envio.enviado ? sucesso(null) : sucesso(null, avisoNotificacao(envio), envio.link);
  }

  const fuso = ctx.tenant.fuso;
  const dados = {
    empresa: ctx.tenant.nome,
    cliente: data.nome_cliente.split(" ")[0] ?? data.nome_cliente,
    servico: data.servico_nome,
    quando: `${rotuloDataLonga(dataNoFuso(data.inicio, fuso))}, às ${horaNoFuso(data.inicio, fuso)}`,
    profissional: data.profissionais?.nome ?? null,
    link: status === "confirmado" ? `${env.appUrl}/agendamento/${data.token_publico}` : `${env.appUrl}/${ctx.tenant.slug}`,
  };

  const envio = await notificar({
    telefone: data.whatsapp,
    mensagem: status === "confirmado" ? mensagemAgendamentoConfirmado(dados) : mensagemAgendamentoCancelado(dados),
  });

  return envio.enviado ? sucesso(null) : sucesso(null, avisoNotificacao(envio), envio.link);
}

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const esquemaConfig = z.object({
  agenda_ativa: z.boolean(),
  confirmacao_automatica: z.boolean(),
  intervalo_agenda_min: z.union([z.literal(15), z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
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
  descricao: z.string().trim().max(120).transform((valor) => valor || null).optional(),
  categoria: z.string().trim().max(40).transform((valor) => valor || null).optional(),
  adicional: z.boolean().optional(),
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

export async function adicionarBloqueio(data: string, motivo: string, profissionalId: string | null = null): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");
  if (!dataValida(data)) return falha("Data inválida.");
  if (profissionalId && !z.uuid().safeParse(profissionalId).success) return falha("Dados inválidos.");

  const { error } = await ctx.supabase.from("bloqueios_agenda").insert({
    tenant_id: ctx.tenantId,
    inicio: instanteLocal(data, "00:00", ctx.tenant.fuso).toISOString(),
    fim: instanteLocal(somarDias(data, 1), "00:00", ctx.tenant.fuso).toISOString(),
    motivo: motivo.trim().slice(0, 120) || null,
    profissional_id: profissionalId,
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

const esquemaProfissional = z.object({
  id: z.uuid().optional(),
  nome: z.string().trim().min(2, "Nome muito curto.").max(60),
  ativo: z.boolean(),
});

export async function salvarProfissional(dados: z.input<typeof esquemaProfissional>): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");
  if (ctx.papel !== "dono") return falha("Só a dona do salão pode alterar a equipe.");

  const validacao = esquemaProfissional.safeParse(dados);
  if (!validacao.success) return falha(validacao.error.issues[0]?.message ?? "Confira os dados.");

  const { id, ...campos } = validacao.data;
  if (id && !campos.ativo) {
    const { count } = await ctx.supabase.from("profissionais").select("id", { count: "exact", head: true }).eq("ativo", true).neq("id", id);
    if (!count) return falha("Mantenha pelo menos uma profissional ativa.");
  }
  const { error } = id
    ? await ctx.supabase.from("profissionais").update(campos).eq("id", id)
    : await ctx.supabase.from("profissionais").insert({ ...campos, tenant_id: ctx.tenantId, ordem: 99 });

  if (error) return falha("Não foi possível salvar a profissional.");

  revalidarAgenda();
  return sucesso(null);
}

export async function horariosPainel(servicoId: string, data: string, profissionalId: string | null): Promise<Resultado<string[]>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");
  if (!z.uuid().safeParse(servicoId).success || !dataValida(data)) return falha("Dados inválidos.");
  if (profissionalId && !z.uuid().safeParse(profissionalId).success) return falha("Dados inválidos.");

  const { data: horarios, error } = await ctx.supabase.rpc("horarios_livres_painel", {
    p_servico_id: servicoId,
    p_data: data,
    p_profissional_id: profissionalId ?? undefined,
  });
  if (error) return falha("Não foi possível carregar os horários.");
  return sucesso(horarios ?? []);
}

const esquemaNovo = z.object({
  servicoId: z.uuid(),
  profissionalId: z.uuid().nullable(),
  inicio: z.iso.datetime({ offset: true }),
  nome: z.string().trim().min(2, "Informe o nome da cliente.").max(120),
  whatsapp: z
    .string()
    .transform(normalizarWhatsapp)
    .refine((valor): valor is string => valor !== null, "WhatsApp inválido. Use DDD + número."),
  observacoes: z.string().trim().max(300).optional(),
});

export async function criarAgendamentoPainel(dados: z.input<typeof esquemaNovo>): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");

  const validacao = esquemaNovo.safeParse(dados);
  if (!validacao.success) return falha(validacao.error.issues[0]?.message ?? "Confira os dados.");
  const { servicoId, profissionalId, inicio, nome, whatsapp, observacoes } = validacao.data;

  const { data, error } = await ctx.supabase.rpc("criar_agendamento_painel", {
    p_servico_id: servicoId,
    p_profissional_id: profissionalId as string,
    p_inicio: inicio,
    p_nome: nome,
    p_whatsapp: whatsapp,
    p_observacoes: (observacoes || null) as string,
  });
  if (error || !data) {
    return falha(error?.message === "horario_indisponivel" ? "Esse horário acabou de ser ocupado. Escolha outro." : "Não foi possível criar o agendamento.");
  }

  revalidarAgenda();

  const { token } = data as { token: string };
  const { data: criado } = await ctx.supabase
    .from("agendamentos")
    .select("servico_nome, inicio, profissionais(nome)")
    .eq("token_publico", token)
    .maybeSingle();
  const fuso = ctx.tenant.fuso;
  const mensagem = mensagemAgendamentoConfirmado({
    empresa: ctx.tenant.nome,
    cliente: nome.split(" ")[0] ?? nome,
    servico: criado?.servico_nome ?? "",
    quando: criado ? `${rotuloDataLonga(dataNoFuso(criado.inicio, fuso))}, às ${horaNoFuso(criado.inicio, fuso)}` : "",
    profissional: criado?.profissionais?.nome ?? null,
    link: `${env.appUrl}/agendamento/${token}`,
  });
  const envio = await notificar({ telefone: whatsapp, mensagem });
  return envio.enviado ? sucesso(null) : sucesso(null, avisoNotificacao(envio), envio.link);
}

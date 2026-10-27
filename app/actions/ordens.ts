"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { obterContexto } from "@/lib/sessao";
import { formatarPlaca } from "@/lib/placa";
import { formatarMoeda } from "@/lib/formato";
import { exibirChavePix } from "@/lib/chave-pix";
import { falha, sucesso, traduzirErroBanco, type Resultado } from "@/lib/resultado";
import { avisoNotificacao, mensagemEntrada, mensagemStatus, notificar } from "@/lib/whatsapp";
import { STATUS_OS, type OrdemServico, type StatusOS } from "@/types/database.types";

const BUCKET = "vistorias";
const MAX_FOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const esquemaServicos = z
  .array(
    z.object({
      nome: z.string().trim().min(1).max(80),
      valor: z.number().nonnegative().max(100000),
    }),
  )
  .max(20);

const esquemaCriacao = z.object({
  veiculoId: z.uuid(),
  servicos: esquemaServicos,
  usarPlano: z.boolean(),
  observacoes: z.string().trim().max(500).nullable(),
});

type Contexto = NonNullable<Awaited<ReturnType<typeof obterContexto>>>;

function assinaturaAtiva(ctx: Contexto): boolean {
  const { status_assinatura, assinatura_valida_ate } = ctx.tenant;
  const hoje = new Date().toISOString().slice(0, 10);
  return (status_assinatura === "trial" || status_assinatura === "ativa") && assinatura_valida_ate >= hoje;
}

function lerFotos(formData: FormData): File[] | string {
  const fotos = formData.getAll("fotos").filter((item): item is File => item instanceof File && item.size > 0);
  if (fotos.length > MAX_FOTOS) return `Envie no máximo ${MAX_FOTOS} fotos.`;
  if (fotos.some((foto) => !EXTENSOES[foto.type])) return "Use fotos em JPG, PNG ou WEBP.";
  if (fotos.some((foto) => foto.size > MAX_BYTES)) return "Cada foto deve ter até 5 MB.";
  return fotos;
}

function lerJson(valor: FormDataEntryValue | null): unknown {
  if (typeof valor !== "string" || valor === "") return [];
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

async function enviarFotos(ctx: Contexto, osId: string, fotos: File[]): Promise<{ caminhos: string[]; urls: string[] } | null> {
  const storage = ctx.supabase.storage.from(BUCKET);

  const envios = await Promise.all(
    fotos.map(async (foto, indice) => {
      const caminho = `${ctx.tenantId}/${osId}/${indice + 1}-${crypto.randomUUID()}.${EXTENSOES[foto.type]}`;
      const { error } = await storage.upload(caminho, foto, {
        contentType: foto.type,
        cacheControl: "31536000",
        upsert: false,
      });
      return error ? null : caminho;
    }),
  );

  const caminhos = envios.filter((caminho): caminho is string => caminho !== null);

  if (caminhos.length !== fotos.length) {
    if (caminhos.length) await storage.remove(caminhos);
    return null;
  }

  return { caminhos, urls: caminhos.map((caminho) => storage.getPublicUrl(caminho).data.publicUrl) };
}

async function dadosNotificacao(ctx: Contexto, os: OrdemServico) {
  const { data } = await ctx.supabase
    .from("veiculos")
    .select("placa, clientes(nome, whatsapp)")
    .eq("id", os.veiculo_id)
    .single();

  if (!data?.clientes) return null;

  return {
    telefone: data.clientes.whatsapp,
    dados: {
      empresa: ctx.tenant.nome,
      cliente: data.clientes.nome.split(" ")[0] ?? data.clientes.nome,
      placa: formatarPlaca(data.placa),
      link: `${env.appUrl}/os/${os.token_publico}`,
    },
  };
}

function statusNotificaveis(): Set<StatusOS> {
  const lista = (process.env.WHATSAPP_NOTIFICAR_STATUS ?? "pronto")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is StatusOS => (STATUS_OS as readonly string[]).includes(item));
  return new Set(lista);
}

export async function criarOrdemServico(formData: FormData): Promise<Resultado<OrdemServico>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");
  if (!assinaturaAtiva(ctx)) return falha("A assinatura da sua empresa está inativa.");

  const validacao = esquemaCriacao.safeParse({
    veiculoId: formData.get("veiculo_id"),
    servicos: lerJson(formData.get("servicos")),
    usarPlano: formData.get("usar_plano") !== "false",
    observacoes: formData.get("observacoes") || null,
  });
  if (!validacao.success) return falha(validacao.error.issues[0]?.message ?? "Dados inválidos.");

  const fotos = lerFotos(formData);
  if (typeof fotos === "string") return falha(fotos);

  const osId = crypto.randomUUID();
  const upload = fotos.length ? await enviarFotos(ctx, osId, fotos) : { caminhos: [], urls: [] };
  if (!upload) return falha("Falha ao enviar as fotos da vistoria. Tente novamente.");

  const { veiculoId, servicos, usarPlano, observacoes } = validacao.data;

  const { data: os, error } = await ctx.supabase.rpc("criar_ordem_servico", {
    p_id: osId,
    p_veiculo_id: veiculoId,
    p_servicos_avulsos: servicos,
    p_fotos: upload.urls,
    p_usar_plano: usarPlano,
    p_observacoes: observacoes,
  });

  if (error || !os) {
    if (upload.caminhos.length) await ctx.supabase.storage.from(BUCKET).remove(upload.caminhos);
    return falha(traduzirErroBanco(error?.message ?? ""));
  }

  const agendamentoId = formData.get("agendamento_id");
  if (typeof agendamentoId === "string" && z.uuid().safeParse(agendamentoId).success) {
    await ctx.supabase
      .from("agendamentos")
      .update({ status: "concluido", ordem_servico_id: os.id })
      .eq("id", agendamentoId)
      .in("status", ["pendente", "confirmado"]);
  }

  revalidatePath("/painel", "layout");

  const notificacao = await dadosNotificacao(ctx, os);
  if (!notificacao) return sucesso(os, "OS criada, mas o cliente não foi encontrado para aviso.");

  const envio = await notificar({ telefone: notificacao.telefone, mensagem: mensagemEntrada(notificacao.dados) });
  return envio.enviado ? sucesso(os) : sucesso(os, avisoNotificacao(envio), envio.link);
}

const esquemaStatus = z.object({
  osId: z.uuid(),
  status: z.enum(STATUS_OS),
});

export async function atualizarStatusOS(osId: string, status: StatusOS): Promise<Resultado<OrdemServico>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");

  const validacao = esquemaStatus.safeParse({ osId, status });
  if (!validacao.success) return falha("Status inválido.");

  const { data: os, error } = await ctx.supabase.rpc("avancar_status_os", {
    p_os_id: validacao.data.osId,
    p_status: validacao.data.status,
  });

  if (error || !os) return falha(traduzirErroBanco(error?.message ?? ""));

  revalidatePath("/painel");
  revalidatePath(`/os/${os.token_publico}`);

  if (os.status === "recebido" || !statusNotificaveis().has(os.status)) return sucesso(os);

  const notificacao = await dadosNotificacao(ctx, os);
  if (!notificacao) return sucesso(os, "Status atualizado, mas o cliente não foi encontrado para aviso.");

  const pagamento =
    os.status === "pronto" && ctx.tenant.chave_pix && Number(os.valor_total) > 0
      ? { valor: formatarMoeda(Number(os.valor_total)), chave: exibirChavePix(ctx.tenant.chave_pix), titular: ctx.tenant.pix_titular }
      : null;

  const envio = await notificar({
    telefone: notificacao.telefone,
    mensagem: mensagemStatus(os.status, { ...notificacao.dados, pagamento }),
  });

  return envio.enviado ? sucesso(os) : sucesso(os, avisoNotificacao(envio), envio.link);
}

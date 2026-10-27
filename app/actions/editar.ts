"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterContexto } from "@/lib/sessao";
import { normalizarPlaca, placaValida } from "@/lib/placa";
import { normalizarWhatsapp } from "@/lib/telefone";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { CATEGORIAS_VEICULO } from "@/types/database.types";

const BUCKET = "vistorias";
const MAX_FOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSOES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const esquemaServicos = z
  .array(z.object({ nome: z.string().trim().min(1).max(80), valor: z.number().nonnegative().max(100000) }))
  .max(20);

function lerJson(valor: FormDataEntryValue | null): unknown {
  if (typeof valor !== "string" || valor === "") return [];
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

function caminhoDaUrl(url: string): string | null {
  const marcador = `/object/public/${BUCKET}/`;
  const indice = url.indexOf(marcador);
  return indice === -1 ? null : decodeURIComponent(url.slice(indice + marcador.length));
}

export async function editarOrdemServico(formData: FormData): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");

  const osId = z.uuid().safeParse(formData.get("os_id"));
  const servicos = esquemaServicos.safeParse(lerJson(formData.get("servicos")));
  const mantidas = z.array(z.string()).max(MAX_FOTOS).safeParse(lerJson(formData.get("fotos_mantidas")));
  const observacoes = String(formData.get("observacoes") ?? "").trim().slice(0, 500);
  if (!osId.success || !servicos.success || !mantidas.success) return falha("Dados inválidos.");

  const novas = formData.getAll("fotos").filter((item): item is File => item instanceof File && item.size > 0);
  if (novas.some((foto) => !EXTENSOES[foto.type])) return falha("Use fotos em JPG, PNG ou WEBP.");
  if (novas.some((foto) => foto.size > MAX_BYTES)) return falha("Cada foto deve ter até 5 MB.");

  const { data: atual } = await ctx.supabase.from("ordens_servico").select("id, fotos_vistoria, token_publico").eq("id", osId.data).maybeSingle();
  if (!atual) return falha("Ordem de serviço não encontrada.");

  const fotosMantidas = mantidas.data.filter((url) => atual.fotos_vistoria.includes(url));
  if (fotosMantidas.length + novas.length > MAX_FOTOS) return falha(`No máximo ${MAX_FOTOS} fotos por OS.`);

  const storage = ctx.supabase.storage.from(BUCKET);
  const enviados: string[] = [];
  for (const [indice, foto] of novas.entries()) {
    const caminho = `${ctx.tenantId}/${atual.id}/e${Date.now()}-${indice + 1}-${crypto.randomUUID()}.${EXTENSOES[foto.type]}`;
    const { error } = await storage.upload(caminho, foto, { contentType: foto.type, cacheControl: "31536000", upsert: false });
    if (error) {
      if (enviados.length) await storage.remove(enviados);
      return falha("Falha ao enviar as fotos. Tente novamente.");
    }
    enviados.push(caminho);
  }

  const fotos = [...fotosMantidas, ...enviados.map((caminho) => storage.getPublicUrl(caminho).data.publicUrl)];
  const total = servicos.data.reduce((soma, item) => soma + item.valor, 0);

  const { error } = await ctx.supabase
    .from("ordens_servico")
    .update({ servicos_avulsos: servicos.data, valor_total: total, fotos_vistoria: fotos, observacoes: observacoes || null })
    .eq("id", atual.id);

  if (error) {
    if (enviados.length) await storage.remove(enviados);
    return falha("Não foi possível salvar as alterações.");
  }

  const removidas = atual.fotos_vistoria
    .filter((url) => !fotosMantidas.includes(url))
    .map(caminhoDaUrl)
    .filter((caminho): caminho is string => caminho !== null && caminho.startsWith(`${ctx.tenantId}/`));
  if (removidas.length) await storage.remove(removidas);

  revalidatePath("/painel", "layout");
  revalidatePath(`/os/${atual.token_publico}`);
  return sucesso(null);
}

const esquemaVeiculo = z.object({
  veiculoId: z.uuid(),
  placa: z.string().transform(normalizarPlaca).refine(placaValida, "Placa inválida."),
  modelo: z.string().trim().min(1, "Informe o modelo.").max(80),
  categoria: z.enum(CATEGORIAS_VEICULO),
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(120),
  whatsapp: z
    .string()
    .transform((valor) => normalizarWhatsapp(valor))
    .refine((valor): valor is string => valor !== null, "WhatsApp inválido."),
});

export type DadosVeiculo = z.input<typeof esquemaVeiculo>;

export async function editarVeiculoCliente(dados: DadosVeiculo): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");

  const validacao = esquemaVeiculo.safeParse(dados);
  if (!validacao.success) return falha(validacao.error.issues[0]?.message ?? "Dados inválidos.");
  const { veiculoId, placa, modelo, categoria, nome, whatsapp } = validacao.data;

  const { data: veiculo } = await ctx.supabase.from("veiculos").select("id, cliente_id").eq("id", veiculoId).maybeSingle();
  if (!veiculo) return falha("Veículo não encontrado.");

  const { error: erroVeiculo } = await ctx.supabase.from("veiculos").update({ placa, modelo, categoria }).eq("id", veiculo.id);
  if (erroVeiculo) return falha(erroVeiculo.code === "23505" ? "Essa placa já está cadastrada em outro veículo." : "Não foi possível salvar o veículo.");

  const { error: erroCliente } = await ctx.supabase.from("clientes").update({ nome, whatsapp }).eq("id", veiculo.cliente_id);
  if (erroCliente) return falha(erroCliente.code === "23505" ? "Esse WhatsApp já pertence a outro cliente." : "Não foi possível salvar o cliente.");

  revalidatePath("/painel", "layout");
  return sucesso(null);
}

export async function excluirOrdemServico(osId: string): Promise<Resultado<null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");
  if (!z.uuid().safeParse(osId).success) return falha("Dados inválidos.");
  if (ctx.papel !== "dono") return falha("Só o dono da loja pode excluir uma OS.");

  const { data: fotos, error } = await ctx.supabase.rpc("excluir_ordem_servico", { p_os_id: osId });
  if (error) return falha(error.message === "os_inexistente" ? "Essa OS já foi excluída." : "Não foi possível excluir a OS.");

  const caminhos = (fotos ?? [])
    .map(caminhoDaUrl)
    .filter((caminho): caminho is string => caminho !== null && caminho.startsWith(`${ctx.tenantId}/`));
  if (caminhos.length) await ctx.supabase.storage.from(BUCKET).remove(caminhos);

  revalidatePath("/painel", "layout");
  return sucesso(null);
}

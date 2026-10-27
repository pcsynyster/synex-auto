"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizarChavePix, TIPOS_PIX } from "@/lib/chave-pix";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { obterContexto } from "@/lib/sessao";

const esquema = z.object({
  tipo: z.enum(TIPOS_PIX.map((tipo) => tipo.id) as [string, ...string[]]),
  chave: z.string().max(120),
  titular: z.string().trim().max(60),
});

export async function salvarPix(dados: { tipo: string; chave: string; titular: string }): Promise<Resultado<string | null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");
  if (ctx.papel !== "dono") return falha("Só o dono da loja pode alterar o Pix.");

  const validacao = esquema.safeParse(dados);
  if (!validacao.success) return falha("Dados inválidos.");
  const { tipo, chave, titular } = validacao.data;

  const vazia = chave.trim() === "";
  const normalizada = vazia ? null : normalizarChavePix(tipo as Parameters<typeof normalizarChavePix>[0], chave);
  if (!vazia && !normalizada) {
    const mensagens: Record<string, string> = {
      cpf: "CPF deve ter 11 números e CNPJ 14.",
      telefone: "Celular inválido. Use DDD + número.",
      email: "E-mail inválido.",
      aleatoria: "Chave aleatória inválida. Copie do app do banco.",
    };
    return falha(mensagens[tipo] ?? "Chave Pix inválida.");
  }
  if (normalizada && titular.length < 3) return falha("Informe o nome do titular da conta.");

  const { error } = await ctx.supabase
    .from("tenants")
    .update({ chave_pix: normalizada, pix_titular: normalizada ? titular : null })
    .eq("id", ctx.tenantId);
  if (error) return falha("Não foi possível salvar o Pix.");

  revalidatePath("/", "layout");
  return sucesso(normalizada);
}

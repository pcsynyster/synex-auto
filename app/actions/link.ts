"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterContexto } from "@/lib/sessao";

const MENSAGENS: Record<string, string> = {
  slug_invalido: "Use de 3 a 40 letras minúsculas, números ou hífen.",
  slug_em_uso: "Esse link já está em uso. Tente outro.",
  acesso_negado: "Só o dono da loja pode mudar o link.",
};

const esquema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, MENSAGENS.slug_invalido)
  .min(3, MENSAGENS.slug_invalido)
  .max(40, MENSAGENS.slug_invalido);

export async function alterarLink(slug: string, tenantId?: string): Promise<Resultado<string>> {
  const validado = esquema.safeParse(slug);
  if (!validado.success) return falha(validado.error.issues[0]?.message ?? MENSAGENS.slug_invalido!);

  let alvo: { supabase: Awaited<ReturnType<typeof criarClienteServidor>>; tenantId: string } | null = null;
  if (tenantId) {
    if (z.uuid().safeParse(tenantId).success) alvo = { supabase: await criarClienteServidor(), tenantId };
  } else {
    const ctx = await obterContexto();
    if (ctx) alvo = { supabase: ctx.supabase, tenantId: ctx.tenantId };
  }
  if (!alvo) return falha("Sessão expirada. Entre novamente.");

  const { data, error } = await alvo.supabase.rpc("alterar_slug", { p_tenant: alvo.tenantId, p_slug: validado.data });
  if (error || !data) return falha(MENSAGENS[error?.message ?? ""] ?? "Não foi possível alterar o link.");

  revalidatePath("/", "layout");
  return sucesso(data);
}

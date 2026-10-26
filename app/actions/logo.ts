"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterContexto } from "@/lib/sessao";

const PADRAO_DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const TAMANHO_MAXIMO = 500 * 1024;

async function resolverTenant(tenantId?: string) {
  if (tenantId) {
    if (!z.uuid().safeParse(tenantId).success) return null;
    const supabase = await criarClienteServidor();
    return { supabase, tenantId };
  }
  const ctx = await obterContexto();
  return ctx ? { supabase: ctx.supabase, tenantId: ctx.tenantId } : null;
}

export async function salvarLogo(dataUrl: string, tenantId?: string): Promise<Resultado<number>> {
  const alvo = await resolverTenant(tenantId);
  if (!alvo) return falha("Sessão expirada. Entre novamente.");

  const partes = PADRAO_DATA_URL.exec(dataUrl);
  if (!partes?.[1] || !partes[2]) return falha("Use uma imagem JPG, PNG ou WEBP.");

  const bytes = Buffer.from(partes[2], "base64");
  if (bytes.length > TAMANHO_MAXIMO) return falha("A imagem ficou grande demais. Tente outra.");

  const { data, error } = await alvo.supabase.rpc("salvar_logo", {
    p_tenant: alvo.tenantId,
    p_conteudo: `\\x${bytes.toString("hex")}`,
    p_tipo: partes[1],
  });
  if (error || !data) return falha("Não foi possível salvar a logo.");

  revalidatePath("/", "layout");
  return sucesso(data);
}

export async function removerLogo(tenantId?: string): Promise<Resultado<null>> {
  const alvo = await resolverTenant(tenantId);
  if (!alvo) return falha("Sessão expirada. Entre novamente.");

  const { error } = await alvo.supabase.rpc("remover_logo", { p_tenant: alvo.tenantId });
  if (error) return falha("Não foi possível remover a logo.");

  revalidatePath("/", "layout");
  return sucesso(null);
}

import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function obterContexto() {
  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const usuarioId = claims?.claims.sub;

  if (!usuarioId) return null;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("tenant_id, papel, tenants(nome, slug, telefone, chave_pix, pix_titular, fuso, status_assinatura, assinatura_valida_ate)")
    .eq("id", usuarioId)
    .single();

  if (!perfil?.tenants) return null;

  return { supabase, usuarioId, tenantId: perfil.tenant_id, papel: perfil.papel, tenant: perfil.tenants };
}

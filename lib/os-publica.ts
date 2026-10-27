import "server-only";
import { criarClientePorToken } from "@/lib/supabase/public";
import type { ServicoAvulso, StatusOS } from "@/types/database.types";

const PADRAO_TOKEN = /^[a-f0-9]{48}$/;

export type OSPublica = {
  status: StatusOS;
  fotos: string[];
  servicos: ServicoAvulso[];
  valorTotal: number;
  criadoEm: string;
  atualizadoEm: string;
  prontoEm: string | null;
  entregueEm: string | null;
  veiculo: { placa: string; modelo: string };
  empresa: { nome: string; slug: string; logoVersao: number | null; telefone: string; cidade: string | null; chavePix: string | null; pixTitular: string | null };
};

function lerServicos(valor: unknown): ServicoAvulso[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (item): item is ServicoAvulso =>
      typeof item === "object" && item !== null && typeof item.nome === "string" && typeof item.valor === "number",
  );
}

export function tokenValido(token: string): boolean {
  return PADRAO_TOKEN.test(token);
}

export async function buscarOSPublica(token: string): Promise<OSPublica | null> {
  if (!tokenValido(token)) return null;

  const { data } = await criarClientePorToken(token)
    .from("ordens_servico")
    .select(
      "status, fotos_vistoria, servicos_avulsos, valor_total, criado_em, atualizado_em, pronto_em, entregue_em, veiculos(placa, modelo), tenants(nome, slug, logo_versao, telefone, cidade, chave_pix, pix_titular)",
    )
    .eq("token_publico", token)
    .maybeSingle();

  if (!data?.veiculos || !data.tenants) return null;

  return {
    status: data.status,
    fotos: data.fotos_vistoria,
    servicos: lerServicos(data.servicos_avulsos),
    valorTotal: Number(data.valor_total),
    criadoEm: data.criado_em,
    atualizadoEm: data.atualizado_em,
    prontoEm: data.pronto_em,
    entregueEm: data.entregue_em,
    veiculo: { placa: data.veiculos.placa, modelo: data.veiculos.modelo },
    empresa: {
      nome: data.tenants.nome,
      slug: data.tenants.slug,
      logoVersao: data.tenants.logo_versao,
      telefone: data.tenants.telefone,
      cidade: data.tenants.cidade,
      chavePix: data.tenants.chave_pix,
      pixTitular: data.tenants.pix_titular,
    },
  };
}

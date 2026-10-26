import type { StatusAssinatura } from "@/types/database.types";

export const WHATSAPP_SYNEX = "5584991421656";

export type SituacaoAssinatura = {
  ativa: boolean;
  diasRestantes: number;
  rotulo: string;
};

function diferencaDias(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
}

export function situacaoAssinatura(status: StatusAssinatura, validaAte: string, hoje: string): SituacaoAssinatura {
  const diasRestantes = diferencaDias(hoje, validaAte);
  const dentroDoPrazo = diasRestantes >= 0;

  if (status === "cancelada") return { ativa: false, diasRestantes, rotulo: "Cancelada" };
  if (status === "inadimplente") return { ativa: false, diasRestantes, rotulo: "Bloqueada" };
  if (!dentroDoPrazo) return { ativa: false, diasRestantes, rotulo: "Vencida" };
  if (status === "trial") return { ativa: true, diasRestantes, rotulo: "Teste grátis" };
  return { ativa: true, diasRestantes, rotulo: "Ativa" };
}

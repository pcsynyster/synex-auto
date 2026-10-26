import type { StatusAgendamento } from "@/types/database.types";

export type ServicoPublico = {
  id: string;
  nome: string;
  descricao: string | null;
  duracao_min: number;
  preco: number;
};

export type AgendaPublica = {
  nome: string;
  slug: string;
  logo_versao: number | null;
  cidade: string | null;
  telefone: string;
  fuso: string;
  hoje: string;
  janela_dias: number;
  dias_abertos: number[];
  dias_bloqueados: string[];
  servicos: ServicoPublico[];
};

export type AgendamentoPublico = {
  status: StatusAgendamento;
  inicio: string;
  fim: string;
  servico: string;
  preco: number;
  duracao_min: number;
  placa: string | null;
  modelo: string | null;
  nome: string;
  empresa: string;
  telefone_empresa: string;
  cidade: string | null;
  slug: string;
  logo_versao: number | null;
  fuso: string;
  pode_cancelar: boolean;
};

export const ROTULO_STATUS_AGENDAMENTO: Record<StatusAgendamento, string> = {
  pendente: "Aguardando confirmação",
  confirmado: "Confirmado",
  concluido: "Atendido",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
};

export const PADRAO_TOKEN = /^[a-f0-9]{48}$/;
export const PADRAO_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function linkAgenda(appUrl: string, slug: string): string {
  return `${appUrl}/${slug}`;
}

export function sugerirSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

import { hojeNoFuso, limitesDoDia, somarDias } from "@/lib/datas";

export const PERIODOS = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "7d", rotulo: "7 dias" },
  { id: "30d", rotulo: "30 dias" },
  { id: "mes", rotulo: "Este mês" },
  { id: "tudo", rotulo: "Tudo" },
] as const;

export type PeriodoId = (typeof PERIODOS)[number]["id"];

export const LISTAS = [
  { id: "carros", rotulo: "Carros atendidos" },
  { id: "passados", rotulo: "Agendamentos passados" },
  { id: "proximos", rotulo: "Próximos" },
] as const;

export type ListaId = (typeof LISTAS)[number]["id"];

export type Resumo = {
  carros: number;
  recebido: number;
  clientes: number;
  com_plano: number;
  em_andamento: number;
  agendamentos: { total: number; concluido: number; aberto: number; cancelado: number; nao_compareceu: number };
  serie: { periodo: string; valor: number; carros: number }[];
  servicos: { nome: string; qtd: number; valor: number }[];
};

export function lerPeriodo(valor: string | undefined): PeriodoId {
  return PERIODOS.some((periodo) => periodo.id === valor) ? (valor as PeriodoId) : "mes";
}

export function lerLista(valor: string | undefined): ListaId {
  return LISTAS.some((lista) => lista.id === valor) ? (valor as ListaId) : "carros";
}

export function faixaDoPeriodo(periodo: PeriodoId, fuso: string) {
  const hoje = hojeNoFuso(fuso);
  const primeiroDia =
    periodo === "hoje"
      ? hoje
      : periodo === "7d"
        ? somarDias(hoje, -6)
        : periodo === "30d"
          ? somarDias(hoje, -29)
          : periodo === "mes"
            ? `${hoje.slice(0, 8)}01`
            : "2020-01-01";
  return {
    hoje,
    primeiroDia,
    inicio: limitesDoDia(primeiroDia, fuso).inicio,
    fim: limitesDoDia(hoje, fuso).fim,
    agrupar: periodo === "tudo" ? ("mes" as const) : ("dia" as const),
  };
}

export function preencherSerie(serie: Resumo["serie"], primeiroDia: string, hoje: string): Resumo["serie"] {
  const mapa = new Map(serie.map((item) => [item.periodo, item]));
  const dias: Resumo["serie"] = [];
  for (let dia = primeiroDia; dia <= hoje; dia = somarDias(dia, 1)) {
    dias.push(mapa.get(dia) ?? { periodo: dia, valor: 0, carros: 0 });
  }
  return dias;
}

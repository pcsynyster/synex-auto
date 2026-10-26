export const FUSO_PADRAO = "America/Fortaleza";

const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function partesNoFuso(instante: Date, fuso: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instante);
  const valor = (tipo: string) => Number(partes.find((parte) => parte.type === tipo)?.value ?? 0);
  return { ano: valor("year"), mes: valor("month"), dia: valor("day"), hora: valor("hour"), minuto: valor("minute"), segundo: valor("second") };
}

function deslocamentoMin(instante: Date, fuso: string): number {
  const p = partesNoFuso(instante, fuso);
  return (Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo) - instante.getTime()) / 60000;
}

function lerData(data: string): [number, number, number] {
  const [ano = 1970, mes = 1, dia = 1] = data.split("-").map(Number);
  return [ano, mes, dia];
}

export function dataValida(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(Date.parse(`${data}T00:00:00Z`));
}

export function instanteLocal(data: string, hora: string, fuso: string): Date {
  const [ano, mes, dia] = lerData(data);
  const [h = 0, m = 0] = hora.split(":").map(Number);
  const chute = Date.UTC(ano, mes - 1, dia, h, m);
  return new Date(chute - deslocamentoMin(new Date(chute), fuso) * 60000);
}

export function hojeNoFuso(fuso: string): string {
  const p = partesNoFuso(new Date(), fuso);
  return `${p.ano}-${String(p.mes).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
}

export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = lerData(data);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export function diaDaSemana(data: string): number {
  const [ano, mes, dia] = lerData(data);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function limitesDoDia(data: string, fuso: string): { inicio: string; fim: string } {
  return {
    inicio: instanteLocal(data, "00:00", fuso).toISOString(),
    fim: instanteLocal(somarDias(data, 1), "00:00", fuso).toISOString(),
  };
}

export function horaNoFuso(iso: string, fuso: string): string {
  const p = partesNoFuso(new Date(iso), fuso);
  return `${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}`;
}

export function dataNoFuso(iso: string, fuso: string): string {
  const p = partesNoFuso(new Date(iso), fuso);
  return `${p.ano}-${String(p.mes).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
}

export function rotuloDiaCurto(data: string): string {
  return DIAS_CURTOS[diaDaSemana(data)] ?? "";
}

export function nomeDiaSemana(dia: number): string {
  return DIAS_LONGOS[dia] ?? "";
}

export function diaDoMes(data: string): number {
  return lerData(data)[2];
}

export function rotuloDataLonga(data: string): string {
  const [, mes, dia] = lerData(data);
  return `${DIAS_LONGOS[diaDaSemana(data)]}, ${dia} de ${MESES[mes - 1]}`;
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas}h${String(resto).padStart(2, "0")}` : `${horas}h`;
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const horario = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

export function formatarHorario(iso: string): string {
  return horario.format(new Date(iso));
}

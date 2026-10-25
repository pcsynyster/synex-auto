const PADRAO_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export function normalizarPlaca(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function placaValida(placa: string): boolean {
  return PADRAO_PLACA.test(placa);
}

export function formatarPlaca(placa: string): string {
  return /^[A-Z]{3}[0-9]{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}

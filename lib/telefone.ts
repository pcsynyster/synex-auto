export function normalizarWhatsapp(valor: string): string | null {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  return null;
}

export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").replace(/^55/, "");
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return valor;
}

export function linkWhatsapp(valor: string, texto?: string): string {
  const numero = normalizarWhatsapp(valor) ?? valor.replace(/\D/g, "");
  return texto ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : `https://wa.me/${numero}`;
}

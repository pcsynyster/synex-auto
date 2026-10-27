export const TIPOS_PIX = [
  { id: "cpf", rotulo: "CPF/CNPJ" },
  { id: "telefone", rotulo: "Celular" },
  { id: "email", rotulo: "E-mail" },
  { id: "aleatoria", rotulo: "Aleatória" },
] as const;

export type TipoPix = (typeof TIPOS_PIX)[number]["id"];

export function normalizarChavePix(tipo: TipoPix, valor: string): string | null {
  const texto = valor.trim();
  if (tipo === "cpf") {
    const digitos = texto.replace(/\D/g, "");
    return digitos.length === 11 || digitos.length === 14 ? digitos : null;
  }
  if (tipo === "telefone") {
    const digitos = texto.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    return digitos.length === 10 || digitos.length === 11 ? `+55${digitos}` : null;
  }
  if (tipo === "email") {
    const email = texto.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 77 ? email : null;
  }
  const aleatoria = texto.toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(aleatoria) ? aleatoria : null;
}

export function tipoDaChave(chave: string | null): TipoPix {
  if (!chave) return "cpf";
  if (chave.startsWith("+55")) return "telefone";
  if (chave.includes("@")) return "email";
  if (/^[0-9a-f]{8}-/.test(chave)) return "aleatoria";
  return "cpf";
}

export function exibirChavePix(chave: string): string {
  if (chave.startsWith("+55")) {
    const d = chave.slice(3);
    return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (/^\d{11}$/.test(chave)) return `${chave.slice(0, 3)}.${chave.slice(3, 6)}.${chave.slice(6, 9)}-${chave.slice(9)}`;
  if (/^\d{14}$/.test(chave)) return `${chave.slice(0, 2)}.${chave.slice(2, 5)}.${chave.slice(5, 8)}/${chave.slice(8, 12)}-${chave.slice(12)}`;
  return chave;
}

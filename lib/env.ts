function exigir(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(`Variável de ambiente ausente: ${nome}`);
  }
  return valor;
}

export const env = {
  supabaseUrl: exigir("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: exigir("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export type Resultado<T> = { ok: true; dados: T; aviso?: string } | { ok: false; erro: string };

export function sucesso<T>(dados: T, aviso?: string): Resultado<T> {
  return aviso ? { ok: true, dados, aviso } : { ok: true, dados };
}

export function falha<T = never>(erro: string): Resultado<T> {
  return { ok: false, erro };
}

const MENSAGENS_BANCO: Record<string, string> = {
  perfil_sem_tenant: "Seu usuário não está vinculado a uma empresa.",
  veiculo_nao_encontrado: "Veículo não encontrado.",
  os_nao_encontrada: "Ordem de serviço não encontrada.",
  transicao_invalida: "Esse status não pode ser aplicado agora.",
  servicos_invalidos: "Serviços avulsos inválidos.",
};

export function traduzirErroBanco(mensagem: string): string {
  return MENSAGENS_BANCO[mensagem] ?? "Não foi possível concluir a operação.";
}

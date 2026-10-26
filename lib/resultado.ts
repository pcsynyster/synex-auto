export type Resultado<T> = { ok: true; dados: T; aviso?: string; whatsapp?: string } | { ok: false; erro: string };

export function sucesso<T>(dados: T, aviso?: string, whatsapp?: string): Resultado<T> {
  return { ok: true, dados, ...(aviso ? { aviso } : {}), ...(whatsapp ? { whatsapp } : {}) };
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

const MENSAGENS_AGENDA: Record<string, string> = {
  agenda_indisponivel: "A agenda desta loja não está disponível no momento.",
  servico_invalido: "Esse serviço não está mais disponível.",
  limite_agendamentos: "Você já tem 3 agendamentos ativos nesta loja. Cancele um para marcar outro.",
  muitas_tentativas: "Muitos agendamentos em pouco tempo. Tente novamente em alguns minutos.",
  horario_indisponivel: "Esse horário acabou de ser ocupado. Escolha outro.",
  cancelamento_indisponivel: "Não é mais possível cancelar por aqui. Fale com a loja pelo WhatsApp.",
};

export function traduzirErroAgenda(mensagem: string): string {
  return MENSAGENS_AGENDA[mensagem] ?? "Não foi possível concluir. Tente novamente.";
}

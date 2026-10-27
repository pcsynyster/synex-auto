import "server-only";

type Provedor = "evolution" | "zapi";

type EnvioWhatsapp = {
  telefone: string;
  mensagem: string;
};

type ResultadoEnvio = { enviado: true } | { enviado: false; motivo: string };

export type Notificacao = { enviado: true } | { enviado: false; automatico: boolean; link: string };

const TIMEOUT_MS = 8000;

function provedorAtual(): Provedor | null {
  const valor = process.env.WHATSAPP_PROVIDER;
  return valor === "evolution" || valor === "zapi" ? valor : null;
}

function montarRequisicao(provedor: Provedor, { telefone, mensagem }: EnvioWhatsapp): { url: string; init: RequestInit } | null {
  if (provedor === "evolution") {
    const base = process.env.EVOLUTION_API_URL;
    const chave = process.env.EVOLUTION_API_KEY;
    const instancia = process.env.EVOLUTION_INSTANCE;
    if (!base || !chave || !instancia) return null;
    return {
      url: `${base.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instancia)}`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: chave },
        body: JSON.stringify({ number: telefone, text: mensagem }),
      },
    };
  }

  const instancia = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  if (!instancia || !token || !clientToken) return null;
  return {
    url: `https://api.z-api.io/instances/${instancia}/token/${token}/send-text`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": clientToken },
      body: JSON.stringify({ phone: telefone, message: mensagem }),
    },
  };
}

export async function enviarWhatsapp(envio: EnvioWhatsapp): Promise<ResultadoEnvio> {
  const provedor = provedorAtual();
  if (!provedor) return { enviado: false, motivo: "provedor_nao_configurado" };

  const requisicao = montarRequisicao(provedor, envio);
  if (!requisicao) return { enviado: false, motivo: "credenciais_ausentes" };

  try {
    const resposta = await fetch(requisicao.url, {
      ...requisicao.init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return resposta.ok ? { enviado: true } : { enviado: false, motivo: `http_${resposta.status}` };
  } catch {
    return { enviado: false, motivo: "falha_rede" };
  }
}

export function linkConversa(telefone: string, mensagem: string): string {
  return `https://wa.me/${telefone.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
}

export async function notificar(envio: EnvioWhatsapp): Promise<Notificacao> {
  const resultado = await enviarWhatsapp(envio);
  if (resultado.enviado) return resultado;
  return {
    enviado: false,
    automatico: resultado.motivo !== "provedor_nao_configurado" && resultado.motivo !== "credenciais_ausentes",
    link: linkConversa(envio.telefone, envio.mensagem),
  };
}

export function avisoNotificacao(notificacao: Notificacao): string | undefined {
  return !notificacao.enviado && notificacao.automatico ? "O envio automático falhou. Use o botão para mandar pelo seu WhatsApp." : undefined;
}

type DadosMensagem = {
  empresa: string;
  cliente: string;
  placa: string;
  link: string;
  pagamento?: { valor: string; chave: string; titular: string | null } | null;
};

export function mensagemEntrada({ empresa, cliente, placa, link }: DadosMensagem): string {
  return [
    `Olá, ${cliente}! Seu veículo ${placa} deu entrada na ${empresa}.`,
    "Registramos as fotos da vistoria de entrada e você pode acompanhar cada etapa pelo link:",
    link,
  ].join("\n\n");
}

export function mensagemStatus(status: "lavando" | "acabamento" | "pronto" | "entregue", dados: DadosMensagem): string {
  const textos = {
    lavando: `Seu veículo ${dados.placa} começou a ser lavado.`,
    acabamento: `Seu veículo ${dados.placa} está na etapa de acabamento.`,
    pronto: `Seu veículo ${dados.placa} está pronto para retirada na ${dados.empresa}.`,
    entregue: `Veículo ${dados.placa} entregue. Obrigado pela preferência, ${dados.cliente}!`,
  };
  if (status === "pronto" && dados.pagamento) {
    const { valor, chave, titular } = dados.pagamento;
    return [
      textos.pronto,
      `Valor: ${valor}`,
      ["Pague pelo Pix:", `Chave: ${chave}`, titular ? `Titular: ${titular}` : ""].filter(Boolean).join("\n"),
      `Ou copie o Pix com o valor pronto no link: ${dados.link}`,
    ].join("\n\n");
  }
  return [textos[status], `Acompanhe: ${dados.link}`].join("\n\n");
}

type DadosAgendamento = {
  empresa: string;
  cliente: string;
  servico: string;
  quando: string;
  placa: string | null;
  link: string;
};

export function mensagemAgendamentoRecebido(dados: DadosAgendamento, confirmado: boolean): string {
  return [
    `Olá, ${dados.cliente}! ${confirmado ? "Seu horário está confirmado" : "Recebemos seu pedido de agendamento"} na ${dados.empresa}.`,
    `${dados.servico}\n${dados.quando}${dados.placa ? `\nVeículo ${dados.placa}` : ""}`,
    confirmado ? `Detalhes e cancelamento: ${dados.link}` : `Assim que a loja confirmar, você recebe uma mensagem. Acompanhe: ${dados.link}`,
  ].join("\n\n");
}

export function mensagemNovoAgendamentoLoja(dados: DadosAgendamento & { whatsappCliente: string }): string {
  return [
    `Novo agendamento pela agenda online.`,
    `${dados.cliente} · ${dados.whatsappCliente}\n${dados.servico}\n${dados.quando}${dados.placa ? `\nVeículo ${dados.placa}` : ""}`,
    "Confirme no painel da Synex Auto, na aba Agenda.",
  ].join("\n\n");
}

export function mensagemAgendamentoConfirmado(dados: DadosAgendamento): string {
  return [
    `Olá, ${dados.cliente}! Seu horário na ${dados.empresa} está confirmado.`,
    `${dados.servico}\n${dados.quando}`,
    `Se precisar cancelar: ${dados.link}`,
  ].join("\n\n");
}

export function mensagemAgendamentoCancelado(dados: DadosAgendamento): string {
  return [
    `Olá, ${dados.cliente}. Seu agendamento de ${dados.servico} para ${dados.quando} na ${dados.empresa} foi cancelado.`,
    `Para marcar outro horário: ${dados.link}`,
  ].join("\n\n");
}

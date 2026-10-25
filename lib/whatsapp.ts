import "server-only";

type Provedor = "evolution" | "zapi";

type EnvioWhatsapp = {
  telefone: string;
  mensagem: string;
};

type ResultadoEnvio = { enviado: true } | { enviado: false; motivo: string };

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

type DadosMensagem = {
  empresa: string;
  cliente: string;
  placa: string;
  link: string;
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
  return [textos[status], `Acompanhe: ${dados.link}`].join("\n\n");
}

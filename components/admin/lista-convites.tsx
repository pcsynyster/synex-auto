"use client";

import { useState, useTransition } from "react";
import { removerConvite } from "@/app/actions/admin";
import { BotaoWhatsapp } from "@/components/ui/botao-whatsapp";
import { formatarMoeda } from "@/lib/formato";

type ConvitePendente = { email: string; nome_empresa: string | null; dias_teste: number; valor_mensal: number };

function Item({ convite, appUrl }: { convite: ConvitePendente; appUrl: string }) {
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();
  const link = `${appUrl}/login?convite=${encodeURIComponent(convite.email)}`;
  const mensagem = [
    `Olá! Seu acesso à Synex Auto${convite.nome_empresa ? ` para a ${convite.nome_empresa}` : ""} está liberado.`,
    `Crie sua conta com este e-mail (${convite.email}) pelo link:`,
    link,
    convite.dias_teste > 0 ? `São ${convite.dias_teste} dias grátis para testar.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o link:", link);
    }
  }

  return (
    <li className="grid gap-3 rounded-2xl border border-borda bg-elevado/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{convite.nome_empresa ?? convite.email}</p>
          <p className="truncate text-xs text-suave">{convite.email}</p>
          <p className="text-xs text-suave">
            {convite.dias_teste} dias de teste · {formatarMoeda(Number(convite.valor_mensal))}/mês
          </p>
        </div>
        <button
          type="button"
          disabled={pendente}
          onClick={() => iniciar(async () => void (await removerConvite(convite.email)))}
          className="shrink-0 text-xs text-suave underline underline-offset-4"
        >
          Remover
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copiar} className="h-12 rounded-full border border-borda text-sm">
          {copiado ? "Copiado" : "Copiar link"}
        </button>
        <BotaoWhatsapp link={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} rotulo="Enviar" />
      </div>
    </li>
  );
}

export function ListaConvites({ convites, appUrl }: { convites: ConvitePendente[]; appUrl: string }) {
  if (convites.length === 0) return null;

  return (
    <section className="cartao grid grid-cols-1 gap-3 p-4">
      <h2 className="text-sm font-semibold">Convites aguardando cadastro</h2>
      <ul className="grid gap-2">
        {convites.map((convite) => (
          <Item key={convite.email} convite={convite} appUrl={appUrl} />
        ))}
      </ul>
    </section>
  );
}

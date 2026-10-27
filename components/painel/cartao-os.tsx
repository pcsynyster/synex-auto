"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { atualizarStatusOS } from "@/app/actions/ordens";
import { excluirOrdemServico } from "@/app/actions/editar";
import { BotaoWhatsapp } from "@/components/ui/botao-whatsapp";
import { formatarMoeda } from "@/lib/formato";
import { formatarPlaca } from "@/lib/placa";
import { ROTULO_STATUS, progressoStatus, proximoStatus } from "@/lib/os-status";
import type { StatusOS } from "@/types/database.types";

type CartaoOSProps = {
  id: string;
  status: StatusOS;
  token: string;
  placa: string;
  modelo: string;
  cliente: string;
  valor: number;
  usouPlano: boolean;
  podeExcluir?: boolean;
};

export function CartaoOS({ id, status, token, placa, modelo, cliente, valor, usouPlano, podeExcluir = false }: CartaoOSProps) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluida, setExcluida] = useState(false);
  const proximo = proximoStatus(status);

  function excluir() {
    setAviso(null);
    iniciar(async () => {
      const resultado = await excluirOrdemServico(id);
      if (!resultado.ok) return setAviso(resultado.erro);
      setExcluida(true);
    });
  }

  if (excluida) return null;

  function avancar() {
    if (!proximo) return;
    setAviso(null);
    iniciar(async () => {
      const resultado = await atualizarStatusOS(id, proximo);
      if (!resultado.ok) return setAviso(resultado.erro);
      if (resultado.aviso) setAviso(resultado.aviso);
      setWhatsapp(resultado.whatsapp ?? null);
    });
  }

  return (
    <article className="cartao p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-block rounded-md bg-texto px-2 py-0.5 font-mono text-base font-bold tracking-[0.18em] text-fundo">{formatarPlaca(placa)}</p>
          <p className="mt-1.5 truncate text-sm text-suave">
            {modelo} · {cliente}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status === "pronto" ? "bg-texto text-fundo" : "border border-borda text-suave"}`}>{ROTULO_STATUS[status]}</span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-elevado">
        <div className="barra-prata h-full rounded-full transition-[width] duration-500" style={{ width: `${progressoStatus(status)}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-suave">
        <span>{usouPlano ? (valor > 0 ? `Plano + ${formatarMoeda(valor)}` : "Crédito do plano") : formatarMoeda(valor)}</span>
        <span className="flex items-center gap-4">
          {podeExcluir && (
            <button type="button" onClick={() => setConfirmarExclusao(true)} className="text-alerta underline underline-offset-4">
              Excluir
            </button>
          )}
          <Link href={`/painel/os/${id}`} className="font-semibold text-texto underline underline-offset-4">
            Editar
          </Link>
          <a href={`/os/${token}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            Link do cliente
          </a>
        </span>
      </div>

      {aviso && <p className="mt-2 text-xs text-alerta">{aviso}</p>}

      {whatsapp && (
        <div className="mt-3">
          <BotaoWhatsapp link={whatsapp} rotulo="Avisar cliente no WhatsApp" aoClicar={() => setWhatsapp(null)} />
        </div>
      )}

      {confirmarExclusao ? (
        <div className="mt-3 grid gap-2 rounded-2xl border border-alerta/50 bg-alerta/10 p-3">
          <p className="text-sm font-semibold">Excluir esta OS?</p>
          <p className="text-xs text-suave">As fotos e os serviços somem e o link do cliente para de funcionar. Não dá para desfazer.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmarExclusao(false)} className="h-10 rounded-full border border-borda text-sm">
              Voltar
            </button>
            <button type="button" onClick={excluir} disabled={pendente} className="h-10 rounded-full bg-alerta text-sm font-semibold text-fundo disabled:opacity-50">
              {pendente ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      ) : proximo && (
        <button
          type="button"
          onClick={avancar}
          disabled={pendente}
          className="mt-3 h-11 w-full rounded-full border border-borda bg-elevado/70 text-sm font-semibold text-texto transition-colors hover:border-prata/60 disabled:opacity-50"
        >
          {pendente ? "Atualizando..." : `Avançar para ${ROTULO_STATUS[proximo]}`}
        </button>
      )}
    </article>
  );
}

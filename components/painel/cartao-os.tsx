"use client";

import { useState, useTransition } from "react";
import { atualizarStatusOS } from "@/app/actions/ordens";
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
};

export function CartaoOS({ id, status, token, placa, modelo, cliente, valor, usouPlano }: CartaoOSProps) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const proximo = proximoStatus(status);

  function avancar() {
    if (!proximo) return;
    setAviso(null);
    iniciar(async () => {
      const resultado = await atualizarStatusOS(id, proximo);
      if (!resultado.ok) setAviso(resultado.erro);
      else if (resultado.aviso) setAviso(resultado.aviso);
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
        <a href={`/os/${token}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          Link do cliente
        </a>
      </div>

      {aviso && <p className="mt-2 text-xs text-alerta">{aviso}</p>}

      {proximo && (
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

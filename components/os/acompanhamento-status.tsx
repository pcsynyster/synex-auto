"use client";

import { useCallback, useEffect, useState } from "react";
import { ROTULO_STATUS, indiceStatus, progressoStatus } from "@/lib/os-status";
import { formatarHorario } from "@/lib/formato";
import { STATUS_OS, type StatusOS } from "@/types/database.types";

type EstadoOS = {
  status: StatusOS;
  atualizadoEm: string;
  prontoEm: string | null;
  entregueEm: string | null;
};

const INTERVALO_MS = 15000;

const DESCRICAO: Record<StatusOS, string> = {
  recebido: "Seu veículo foi recebido e vistoriado.",
  lavando: "A lavagem está em andamento.",
  acabamento: "Estamos finalizando os detalhes.",
  pronto: "Pode vir buscar. Seu veículo está pronto.",
  entregue: "Veículo entregue. Obrigado pela preferência.",
};

export function AcompanhamentoStatus({ token, inicial }: { token: string; inicial: EstadoOS }) {
  const [estado, setEstado] = useState(inicial);

  const atualizar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/os/${token}`, { cache: "no-store" });
      if (resposta.ok) setEstado((await resposta.json()) as EstadoOS);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (estado.status === "entregue") return;

    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") void atualizar();
    }, INTERVALO_MS);

    const aoVoltar = () => {
      if (document.visibilityState === "visible") void atualizar();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [estado.status, atualizar]);

  const atual = indiceStatus(estado.status);
  const pronto = estado.status === "pronto" || estado.status === "entregue";

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-[1.75rem] leading-tight font-semibold ${pronto ? "texto-prata" : ""}`} aria-live="polite">
          {ROTULO_STATUS[estado.status]}
        </p>
        <span className="font-mono text-sm text-suave">{progressoStatus(estado.status)}%</span>
      </div>
      <p className="mt-1 text-sm text-suave">{DESCRICAO[estado.status]}</p>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-elevado"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressoStatus(estado.status)}
      >
        <div
          className="barra-prata h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(progressoStatus(estado.status), 6)}%` }}
        />
      </div>

      <ol className="mt-5 grid gap-3">
        {STATUS_OS.map((status, indice) => {
          const concluido = indice < atual || estado.status === "entregue";
          const corrente = indice === atual && estado.status !== "entregue";
          return (
            <li key={status} className="flex items-center gap-3">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs ${
                  concluido
                    ? "border-texto bg-texto text-fundo"
                    : corrente
                      ? "border-texto text-texto"
                      : "border-borda text-suave"
                }`}
              >
                {concluido ? (
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  indice + 1
                )}
              </span>
              <span className={`text-sm ${concluido || corrente ? "text-texto" : "text-suave"}`}>{ROTULO_STATUS[status]}</span>
              {corrente && <span className="ml-auto size-2 animate-pulse rounded-full bg-texto" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <p className="mt-5 text-xs text-suave">
        {estado.entregueEm
          ? `Entregue em ${formatarHorario(estado.entregueEm)}`
          : estado.prontoEm
            ? `Pronto desde ${formatarHorario(estado.prontoEm)}`
            : `Atualizado em ${formatarHorario(estado.atualizadoEm)}`}
      </p>
    </div>
  );
}

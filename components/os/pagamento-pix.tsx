"use client";

import { useState } from "react";
import { formatarMoeda } from "@/lib/formato";

export function PagamentoPix({ copiaECola, valor }: { copiaECola: string; valor: number }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(copiaECola);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section className="cartao p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Pagar com Pix</h2>
        <span className="texto-prata text-2xl font-semibold">{formatarMoeda(valor)}</span>
      </div>
      <p className="mt-1 text-xs text-suave">Copie o código e cole na área Pix do app do seu banco.</p>
      <p className="mt-3 break-all rounded-2xl border border-borda bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-suave select-all">
        {copiaECola}
      </p>
      <button
        type="button"
        onClick={copiar}
        className="mt-4 h-12 w-full rounded-full bg-texto text-sm font-semibold text-fundo transition-[transform,background-color] hover:bg-white active:scale-[0.98]"
      >
        {copiado ? "Código copiado" : "Copiar código Pix"}
      </button>
    </section>
  );
}

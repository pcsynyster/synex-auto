"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { formatarHorario } from "@/lib/formato";

export function GaleriaVistoria({ fotos, registradaEm }: { fotos: string[]; registradaEm: string }) {
  const [aberta, setAberta] = useState<number | null>(null);

  const fechar = useCallback(() => setAberta(null), []);
  const mover = useCallback(
    (passo: number) => setAberta((atual) => (atual === null ? null : (atual + passo + fotos.length) % fotos.length)),
    [fotos.length],
  );

  useEffect(() => {
    if (aberta === null) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fechar();
      if (evento.key === "ArrowRight") mover(1);
      if (evento.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [aberta, fechar, mover]);

  const fotoAberta = aberta === null ? undefined : fotos[aberta];

  return (
    <section className="cartao p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Vistoria de entrada</h2>
        <span className="text-xs text-suave">{formatarHorario(registradaEm)}</span>
      </div>
      <p className="mt-1 text-xs text-suave">Registro do estado do veículo no momento em que chegou.</p>

      <ul className="mt-3 grid grid-cols-3 gap-2">
        {fotos.map((foto, indice) => (
          <li key={foto}>
            <button
              type="button"
              onClick={() => setAberta(indice)}
              className="relative block aspect-square w-full overflow-hidden rounded-lg border border-borda bg-elevado"
              aria-label={`Abrir foto ${indice + 1} da vistoria`}
            >
              <Image src={foto} alt="" fill sizes="(max-width: 448px) 33vw, 140px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {fotoAberta && aberta !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto da vistoria"
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl"
          onClick={fechar}
        >
          <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
            <span className="font-mono text-sm text-suave">
              {aberta + 1} / {fotos.length}
            </span>
            <button type="button" onClick={fechar} className="rounded-full border border-borda px-3 py-1.5 text-sm">
              Fechar
            </button>
          </div>
          <div className="relative flex-1" onClick={(evento) => evento.stopPropagation()}>
            <Image src={fotoAberta} alt={`Foto ${aberta + 1} da vistoria`} fill sizes="100vw" className="object-contain" priority />
          </div>
          {fotos.length > 1 && (
            <div className="flex gap-2 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(evento) => evento.stopPropagation()}>
              <button type="button" onClick={() => mover(-1)} className="flex-1 rounded-full border border-borda py-3 text-sm">
                Anterior
              </button>
              <button type="button" onClick={() => mover(1)} className="flex-1 rounded-full border border-borda py-3 text-sm">
                Próxima
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

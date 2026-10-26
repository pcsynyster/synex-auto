"use client";

import { useState, useTransition } from "react";
import { adicionarBloqueio, removerBloqueio } from "@/app/actions/agenda";
import { rotuloDataLonga } from "@/lib/datas";

type Bloqueio = { id: string; data: string; motivo: string | null };

export function Bloqueios({ bloqueios, hoje }: { bloqueios: Bloqueio[]; hoje: string }) {
  const [data, setData] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function adicionar() {
    if (!data) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await adicionarBloqueio(data, motivo);
      if (!resultado.ok) return setErro(resultado.erro);
      setData("");
      setMotivo("");
    });
  }

  function remover(id: string) {
    iniciar(async () => {
      const resultado = await removerBloqueio(id);
      if (!resultado.ok) setErro(resultado.erro);
    });
  }

  const campo = "h-11 min-w-0 rounded-xl border border-borda bg-elevado px-3 text-sm [color-scheme:dark] focus:border-prata focus:outline-none";

  return (
    <section className="cartao grid grid-cols-1 gap-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">Dias fechados</h2>
        <p className="text-xs text-suave">Feriados, folgas e manutenção. Ninguém consegue agendar nesses dias.</p>
      </div>
      {bloqueios.length > 0 && (
        <ul className="grid gap-2">
          {bloqueios.map((bloqueio) => (
            <li key={bloqueio.id} className="flex items-center justify-between gap-3 rounded-2xl border border-borda bg-elevado/40 px-4 py-2.5">
              <span className="min-w-0">
                <span className="block text-sm">{rotuloDataLonga(bloqueio.data)}</span>
                {bloqueio.motivo && <span className="block truncate text-xs text-suave">{bloqueio.motivo}</span>}
              </span>
              <button type="button" onClick={() => remover(bloqueio.id)} disabled={pendente} className="shrink-0 text-xs text-suave underline underline-offset-4">
                Reabrir
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input type="date" min={hoje} value={data} onChange={(evento) => setData(evento.target.value)} className={campo} aria-label="Data" />
        <input value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Motivo" maxLength={120} className={campo} />
        <button type="button" onClick={adicionar} disabled={!data || pendente} className="h-11 rounded-full bg-texto px-4 text-sm font-semibold text-fundo disabled:opacity-40">
          Fechar
        </button>
      </div>
      {erro && <p className="text-xs text-alerta">{erro}</p>}
    </section>
  );
}

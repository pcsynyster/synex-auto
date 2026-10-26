"use client";

import { useState, useTransition } from "react";
import { alterarLink } from "@/app/actions/link";
import { CopiarLink } from "@/components/agenda/copiar-link";
import { linkAgenda, sugerirSlug } from "@/lib/agenda";

type Props = {
  appUrl: string;
  slug: string;
  sugestao: string;
  tenantId?: string;
  compacto?: boolean;
};

export function EditarLink({ appUrl, slug, sugestao, tenantId, compacto = false }: Props) {
  const [atual, setAtual] = useState(slug);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(slug);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const link = linkAgenda(appUrl, atual);
  const dominio = appUrl.replace(/^https?:\/\//, "");

  function abrir() {
    setErro(null);
    setValor(/-[a-f0-9]{6}$/.test(atual) ? sugerirSlug(sugestao) || atual : atual);
    setEditando(true);
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await alterarLink(valor, tenantId);
      if (!resultado.ok) return setErro(resultado.erro);
      setAtual(resultado.dados);
      setEditando(false);
    });
  }

  if (editando) {
    return (
      <div className="grid gap-2">
        <label className="flex h-11 min-w-0 items-center rounded-2xl border border-borda bg-elevado pl-4 text-sm focus-within:border-prata">
          <span className="shrink-0 text-suave">{dominio}/</span>
          <input
            value={valor}
            onChange={(evento) => setValor(evento.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            maxLength={40}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-full min-w-0 flex-1 bg-transparent pr-4 text-texto focus:outline-none"
          />
        </label>
        {erro && <p className="text-xs text-alerta">{erro}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setEditando(false)} className="h-10 rounded-full border border-borda text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={pendente || valor.length < 3}
            className="h-10 rounded-full bg-texto text-sm font-semibold text-fundo disabled:opacity-50"
          >
            {pendente ? "Salvando..." : "Salvar link"}
          </button>
        </div>
        {!compacto && <p className="text-xs text-suave">O link antigo continua funcionando e leva para o novo.</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <a href={link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate rounded-full border border-borda bg-black/40 px-4 py-2.5 font-mono text-xs text-suave">
          {link.replace(/^https?:\/\//, "")}
        </a>
        <CopiarLink link={link} />
      </div>
      <button type="button" onClick={abrir} className="w-fit text-xs text-suave underline underline-offset-4">
        Personalizar link
      </button>
    </div>
  );
}

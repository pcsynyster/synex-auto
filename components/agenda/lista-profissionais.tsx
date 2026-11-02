"use client";

import { useState, useTransition } from "react";
import { salvarProfissional } from "@/app/actions/agenda";

type Profissional = { id: string; nome: string; ativo: boolean };

function Linha({ item }: { item: Profissional }) {
  const [nome, setNome] = useState(item.nome);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const mudou = nome.trim() !== item.nome;

  function salvar(dados: { nome?: string; ativo?: boolean }) {
    setErro(null);
    iniciar(async () => {
      const resultado = await salvarProfissional({ id: item.id, nome: dados.nome ?? item.nome, ativo: dados.ativo ?? item.ativo });
      if (!resultado.ok) setErro(resultado.erro);
    });
  }

  return (
    <li className={`grid min-w-0 grid-cols-1 gap-2 rounded-2xl border border-borda bg-elevado/40 p-3 ${item.ativo ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2">
        <input
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          maxLength={60}
          aria-label="Nome da profissional"
          className="h-10 min-w-0 flex-1 rounded-xl border border-borda bg-elevado px-3 text-sm focus:border-prata focus:outline-none"
        />
        {mudou ? (
          <button type="button" onClick={() => salvar({ nome })} disabled={pendente} className="h-10 shrink-0 rounded-full bg-rosa px-4 text-xs font-semibold text-white">
            Salvar
          </button>
        ) : (
          <button type="button" onClick={() => salvar({ ativo: !item.ativo })} disabled={pendente} className="h-10 shrink-0 rounded-full border border-borda px-4 text-xs text-suave">
            {item.ativo ? "Pausar" : "Reativar"}
          </button>
        )}
      </div>
      {!item.ativo && <p className="text-[11px] text-suave">Pausada: não aparece para as clientes.</p>}
      {erro && <p className="text-xs text-alerta">{erro}</p>}
    </li>
  );
}

export function ListaProfissionais({ profissionais }: { profissionais: Profissional[] }) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function adicionar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await salvarProfissional({ nome, ativo: true });
      if (!resultado.ok) return setErro(resultado.erro);
      setNome("");
    });
  }

  return (
    <section className="cartao grid grid-cols-1 gap-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">Equipe</h2>
        <p className="text-xs text-suave">Cada profissional tem a própria agenda. A cliente escolhe com quem quer ou pega a primeira livre.</p>
      </div>
      <ul className="grid min-w-0 grid-cols-1 gap-2">
        {profissionais.map((item) => (
          <Linha key={`${item.id}-${item.nome}-${item.ativo}`} item={item} />
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Nome da nova profissional"
          maxLength={60}
          className="h-11 min-w-0 flex-1 rounded-xl border border-borda bg-elevado px-3 text-sm focus:border-prata focus:outline-none"
        />
        <button type="button" onClick={adicionar} disabled={pendente || nome.trim().length < 2} className="h-11 shrink-0 rounded-full bg-rosa px-4 text-sm font-semibold text-white disabled:opacity-40">
          Adicionar
        </button>
      </div>
      {erro && <p className="text-xs text-alerta">{erro}</p>}
    </section>
  );
}

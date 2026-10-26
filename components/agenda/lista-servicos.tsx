"use client";

import { useState, useTransition } from "react";
import { salvarServico } from "@/app/actions/agenda";
import { formatarDuracao } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import type { Servico } from "@/types/database.types";

type ServicoLista = Pick<Servico, "id" | "nome" | "duracao_min" | "preco" | "ativo">;

function Editor({ servico, aoFechar }: { servico: ServicoLista | null; aoFechar: () => void }) {
  const [nome, setNome] = useState(servico?.nome ?? "");
  const [duracao, setDuracao] = useState(String(servico?.duracao_min ?? 60));
  const [preco, setPreco] = useState(servico ? String(Number(servico.preco)).replace(".", ",") : "");
  const [ativo, setAtivo] = useState(servico?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await salvarServico({
        id: servico?.id,
        nome,
        duracao_min: Number(duracao),
        preco: Number(preco.replace(/\./g, "").replace(",", ".")) || 0,
        ativo,
      });
      if (!resultado.ok) return setErro(resultado.erro);
      aoFechar();
    });
  }

  const campo = "h-11 w-full min-w-0 rounded-xl border border-borda bg-elevado px-3 text-sm focus:border-prata focus:outline-none";

  return (
    <div className="grid gap-3 rounded-2xl border border-prata/40 bg-black/40 p-3">
      <input value={nome} onChange={(evento) => setNome(evento.target.value)} placeholder="Nome do serviço" className={campo} autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="text-[11px] text-suave">Duração (min)</span>
          <input value={duracao} onChange={(evento) => setDuracao(evento.target.value.replace(/\D/g, ""))} inputMode="numeric" className={campo} />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] text-suave">Preço (R$)</span>
          <input value={preco} onChange={(evento) => setPreco(evento.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
        </label>
      </div>
      {servico && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(evento) => setAtivo(evento.target.checked)} className="size-4 accent-white" />
          Aparece na agenda online
        </label>
      )}
      {erro && <p className="text-xs text-alerta">{erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={aoFechar} className="h-10 rounded-full border border-borda text-sm">
          Cancelar
        </button>
        <button type="button" onClick={salvar} disabled={pendente} className="h-10 rounded-full bg-texto text-sm font-semibold text-fundo disabled:opacity-50">
          {pendente ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

export function ListaServicos({ servicos }: { servicos: ServicoLista[] }) {
  const [editando, setEditando] = useState<string | "novo" | null>(null);

  return (
    <section className="cartao grid grid-cols-1 gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Serviços</h2>
        {editando === null && (
          <button type="button" onClick={() => setEditando("novo")} className="rounded-full border border-borda px-3 py-1 text-xs">
            Adicionar
          </button>
        )}
      </div>
      {editando === "novo" && <Editor servico={null} aoFechar={() => setEditando(null)} />}
      <ul className="grid gap-2">
        {servicos.map((servico) =>
          editando === servico.id ? (
            <li key={servico.id}>
              <Editor servico={servico} aoFechar={() => setEditando(null)} />
            </li>
          ) : (
            <li key={servico.id}>
              <button
                type="button"
                onClick={() => setEditando(servico.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-borda bg-elevado/40 px-4 py-3 text-left ${servico.ativo ? "" : "opacity-50"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{servico.nome}</span>
                  <span className="block text-xs text-suave">
                    {formatarDuracao(servico.duracao_min)}
                    {servico.ativo ? "" : " · oculto"}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatarMoeda(Number(servico.preco))}</span>
              </button>
            </li>
          ),
        )}
      </ul>
      <p className="text-xs text-suave">A duração define quanto tempo o horário fica ocupado na agenda.</p>
    </section>
  );
}

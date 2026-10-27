"use client";

import { useState, useTransition } from "react";
import { salvarPix } from "@/app/actions/pix";
import { exibirChavePix, TIPOS_PIX, tipoDaChave, type TipoPix } from "@/lib/chave-pix";

const PLACEHOLDER: Record<TipoPix, string> = {
  cpf: "000.000.000-00",
  telefone: "(84) 99999-9999",
  email: "pix@sualoja.com",
  aleatoria: "Cole a chave do app do banco",
};

export function FormPix({ chave, titular }: { chave: string | null; titular: string | null }) {
  const [tipo, setTipo] = useState<TipoPix>(tipoDaChave(chave));
  const [valor, setValor] = useState(chave ? exibirChavePix(chave) : "");
  const [nome, setNome] = useState(titular ?? "");
  const [salva, setSalva] = useState(chave);
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar(remover = false) {
    setMensagem(null);
    iniciar(async () => {
      const resultado = await salvarPix({ tipo, chave: remover ? "" : valor, titular: nome });
      if (!resultado.ok) return setMensagem({ ok: false, texto: resultado.erro });
      setSalva(resultado.dados);
      if (remover) {
        setValor("");
        setNome("");
      } else if (resultado.dados) setValor(exibirChavePix(resultado.dados));
      setMensagem({ ok: true, texto: remover ? "Pix removido." : "Pix salvo. Ele vai junto quando você avisar que o carro está pronto." });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-4 gap-1 rounded-full border border-borda bg-elevado/60 p-1">
        {TIPOS_PIX.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            onClick={() => {
              setTipo(opcao.id);
              setMensagem(null);
            }}
            className={`h-9 rounded-full text-[12px] font-medium ${tipo === opcao.id ? "bg-texto text-fundo" : "text-suave"}`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-suave">Chave Pix</span>
        <input
          value={valor}
          onChange={(evento) => {
            setValor(evento.target.value);
            setMensagem(null);
          }}
          inputMode={tipo === "email" ? "email" : tipo === "aleatoria" ? "text" : "numeric"}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder={PLACEHOLDER[tipo]}
          className="h-12 w-full min-w-0 rounded-2xl border border-borda bg-elevado px-4 text-base focus:border-prata focus:outline-none"
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-suave">Nome do titular da conta</span>
        <input
          value={nome}
          onChange={(evento) => {
            setNome(evento.target.value);
            setMensagem(null);
          }}
          maxLength={60}
          placeholder="Como aparece no banco"
          className="h-12 w-full min-w-0 rounded-2xl border border-borda bg-elevado px-4 text-base focus:border-prata focus:outline-none"
        />
      </label>
      {mensagem && <p className={`text-xs ${mensagem.ok ? "text-texto" : "text-alerta"}`}>{mensagem.texto}</p>}
      <div className={`grid gap-2 ${salva ? "grid-cols-[auto_1fr]" : "grid-cols-1"}`}>
        {salva && (
          <button type="button" onClick={() => salvar(true)} disabled={pendente} className="h-11 rounded-full border border-borda px-5 text-sm text-suave">
            Remover
          </button>
        )}
        <button
          type="button"
          onClick={() => salvar()}
          disabled={pendente || valor.trim() === ""}
          className="h-11 rounded-full bg-texto text-sm font-semibold text-fundo disabled:opacity-50"
        >
          {pendente ? "Salvando..." : "Salvar Pix"}
        </button>
      </div>
      <p className="text-[11px] text-suave">Confira a chave com cuidado: o cliente paga direto para ela.</p>
    </div>
  );
}

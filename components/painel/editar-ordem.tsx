"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { editarOrdemServico } from "@/app/actions/editar";
import { Botao } from "@/components/ui/botao";
import { formatarMoeda } from "@/lib/formato";
import { comprimirImagem } from "@/lib/imagem";
import type { ServicoAvulso } from "@/types/database.types";

const MAX_FOTOS = 6;

type Props = {
  osId: string;
  fotos: string[];
  servicos: ServicoAvulso[];
  observacoes: string;
  usouPlano: boolean;
};

export function EditarOrdem({ osId, fotos: fotosIniciais, servicos: servicosIniciais, observacoes: obsInicial, usouPlano }: Props) {
  const [mantidas, setMantidas] = useState<string[]>(fotosIniciais);
  const [novas, setNovas] = useState<File[]>([]);
  const [servicos, setServicos] = useState<ServicoAvulso[]>(servicosIniciais);
  const [nomeServico, setNomeServico] = useState("");
  const [valorServico, setValorServico] = useState("");
  const [observacoes, setObservacoes] = useState(obsInicial);
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const previas = useMemo(() => novas.map((foto) => URL.createObjectURL(foto)), [novas]);
  useEffect(() => () => previas.forEach((url) => URL.revokeObjectURL(url)), [previas]);

  const total = servicos.reduce((soma, servico) => soma + servico.valor, 0);
  const vagas = MAX_FOTOS - mantidas.length - novas.length;

  async function adicionarFotos(lista: FileList | null) {
    if (!lista || vagas <= 0) return;
    const comprimidas = await Promise.all(Array.from(lista).slice(0, vagas).map(comprimirImagem));
    setNovas((atuais) => [...atuais, ...comprimidas]);
    setMensagem(null);
  }

  function adicionarServico() {
    const valor = Number(valorServico.replace(",", "."));
    if (!nomeServico.trim() || !Number.isFinite(valor) || valor < 0) return;
    setServicos((atuais) => [...atuais, { nome: nomeServico.trim(), valor }]);
    setNomeServico("");
    setValorServico("");
    setMensagem(null);
  }

  function alterarValor(indice: number, texto: string) {
    const valor = Number(texto.replace(",", "."));
    setServicos((atuais) => atuais.map((item, posicao) => (posicao === indice ? { ...item, valor: Number.isFinite(valor) && valor >= 0 ? valor : 0 } : item)));
    setMensagem(null);
  }

  function salvar() {
    const formData = new FormData();
    formData.set("os_id", osId);
    formData.set("servicos", JSON.stringify(servicos));
    formData.set("fotos_mantidas", JSON.stringify(mantidas));
    formData.set("observacoes", observacoes);
    novas.forEach((foto) => formData.append("fotos", foto));
    iniciar(async () => {
      const resultado = await editarOrdemServico(formData);
      if (!resultado.ok) return setMensagem({ ok: false, texto: resultado.erro });
      setNovas([]);
      setMensagem({ ok: true, texto: "Alterações salvas. O link do cliente já mostra a versão nova." });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <section className="cartao p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Fotos da vistoria</h2>
          <span className="font-mono text-xs text-suave">
            {mantidas.length + novas.length}/{MAX_FOTOS}
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {mantidas.map((url, indice) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-lg border border-borda">
              <Image src={url} alt={`Foto ${indice + 1}`} fill sizes="120px" className="object-cover" />
              <button
                type="button"
                onClick={() => {
                  setMantidas((atuais) => atuais.filter((item) => item !== url));
                  setMensagem(null);
                }}
                className="absolute top-1 right-1 rounded-md bg-fundo/80 px-1.5 py-0.5 text-[11px]"
              >
                Remover
              </button>
            </li>
          ))}
          {previas.map((url, indice) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-lg border border-prata/60">
              <Image src={url} alt={`Nova foto ${indice + 1}`} fill unoptimized className="object-cover" />
              <span className="absolute bottom-1 left-1 rounded-md bg-texto px-1.5 py-0.5 text-[10px] font-semibold text-fundo">Nova</span>
              <button
                type="button"
                onClick={() => setNovas((atuais) => atuais.filter((_, posicao) => posicao !== indice))}
                className="absolute top-1 right-1 rounded-md bg-fundo/80 px-1.5 py-0.5 text-[11px]"
              >
                Remover
              </button>
            </li>
          ))}
          {vagas > 0 && (
            <li>
              <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed border-borda text-xs text-suave">
                <span className="text-center">
                  <span className="block text-2xl leading-none text-texto">+</span>
                  Foto
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  className="sr-only"
                  onChange={(evento) => {
                    void adicionarFotos(evento.target.files);
                    evento.target.value = "";
                  }}
                />
              </label>
            </li>
          )}
        </ul>
      </section>

      <section className="cartao grid grid-cols-1 gap-3 p-4">
        <h2 className="text-sm font-semibold">Serviços e valores</h2>
        {usouPlano && <p className="text-xs text-suave">Esta OS usou 1 crédito do plano. Coloque aqui só os extras cobrados.</p>}
        {servicos.length > 0 && (
          <ul className="grid gap-2">
            {servicos.map((servico, indice) => (
              <li key={`${servico.nome}-${indice}`} className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2 text-sm">
                <span className="truncate">{servico.nome}</span>
                <input
                  defaultValue={String(servico.valor).replace(".", ",")}
                  onChange={(evento) => alterarValor(indice, evento.target.value)}
                  inputMode="decimal"
                  aria-label={`Valor de ${servico.nome}`}
                  className="h-10 min-w-0 rounded-2xl border border-borda bg-elevado px-3 text-right font-mono text-sm focus:border-prata focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setServicos((atuais) => atuais.filter((_, posicao) => posicao !== indice));
                    setMensagem(null);
                  }}
                  className="text-xs text-suave"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-[1fr_6.5rem_auto] gap-2">
          <input
            value={nomeServico}
            onChange={(evento) => setNomeServico(evento.target.value)}
            placeholder="Novo serviço"
            className="h-11 min-w-0 rounded-2xl border border-borda bg-elevado px-3 text-sm focus:border-prata focus:outline-none"
          />
          <input
            value={valorServico}
            onChange={(evento) => setValorServico(evento.target.value)}
            inputMode="decimal"
            placeholder="R$ 0,00"
            className="h-11 min-w-0 rounded-2xl border border-borda bg-elevado px-3 text-sm focus:border-prata focus:outline-none"
          />
          <button type="button" onClick={adicionarServico} className="h-11 rounded-full border border-borda px-4 text-sm">
            Incluir
          </button>
        </div>
        <textarea
          value={observacoes}
          onChange={(evento) => {
            setObservacoes(evento.target.value);
            setMensagem(null);
          }}
          maxLength={500}
          rows={2}
          placeholder="Observações internas"
          className="rounded-2xl border border-borda bg-elevado px-3 py-2 text-sm focus:border-prata focus:outline-none"
        />
        <div className="flex justify-between border-t border-borda pt-3 text-sm font-semibold">
          <span>Total a cobrar</span>
          <span className="font-mono">{formatarMoeda(total)}</span>
        </div>
      </section>

      {mensagem && <p className={`text-sm ${mensagem.ok ? "text-texto" : "text-alerta"}`}>{mensagem.texto}</p>}

      <Botao type="button" onClick={salvar} disabled={pendente} className="h-14 text-base">
        {pendente ? "Salvando..." : "Salvar alterações"}
      </Botao>
    </div>
  );
}

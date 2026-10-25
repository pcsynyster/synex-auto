"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { criarOrdemServico } from "@/app/actions/ordens";
import { Botao } from "@/components/ui/botao";
import { formatarMoeda } from "@/lib/formato";
import { comprimirImagem } from "@/lib/imagem";
import type { ServicoAvulso } from "@/types/database.types";

const MAX_FOTOS = 6;

type Concluido = { link: string; aviso?: string };

export function FormOrdem({ veiculoId, temPlano }: { veiculoId: string; temPlano: boolean }) {
  const [fotos, setFotos] = useState<File[]>([]);
  const [servicos, setServicos] = useState<ServicoAvulso[]>([]);
  const [nomeServico, setNomeServico] = useState("");
  const [valorServico, setValorServico] = useState("");
  const [usarPlano, setUsarPlano] = useState(temPlano);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<Concluido | null>(null);
  const [pendente, iniciar] = useTransition();

  const previas = useMemo(() => fotos.map((foto) => URL.createObjectURL(foto)), [fotos]);
  useEffect(() => () => previas.forEach((url) => URL.revokeObjectURL(url)), [previas]);

  const total = servicos.reduce((soma, servico) => soma + servico.valor, 0);

  async function adicionarFotos(lista: FileList | null) {
    if (!lista) return;
    const vagas = MAX_FOTOS - fotos.length;
    const novas = await Promise.all(Array.from(lista).slice(0, vagas).map(comprimirImagem));
    setFotos((atuais) => [...atuais, ...novas].slice(0, MAX_FOTOS));
  }

  function adicionarServico() {
    const valor = Number(valorServico.replace(",", "."));
    if (!nomeServico.trim() || !Number.isFinite(valor) || valor < 0) return;
    setServicos((atuais) => [...atuais, { nome: nomeServico.trim(), valor }]);
    setNomeServico("");
    setValorServico("");
  }

  function enviar() {
    setErro(null);
    const formData = new FormData();
    formData.set("veiculo_id", veiculoId);
    formData.set("servicos", JSON.stringify(servicos));
    formData.set("usar_plano", String(usarPlano));
    formData.set("observacoes", observacoes);
    fotos.forEach((foto) => formData.append("fotos", foto));

    iniciar(async () => {
      const resultado = await criarOrdemServico(formData);
      if (!resultado.ok) return setErro(resultado.erro);
      setConcluido({ link: `${window.location.origin}/os/${resultado.dados.token_publico}`, aviso: resultado.aviso });
    });
  }

  if (concluido) {
    return (
      <section className="cartao grid gap-3 p-5">
        <p className="texto-prata text-xl font-semibold">Ordem de serviço aberta</p>
        <p className="text-sm text-suave">
          {concluido.aviso ?? "O cliente recebeu o link de acompanhamento com as fotos da vistoria no WhatsApp."}
        </p>
        <p className="break-all rounded-lg border border-borda bg-fundo/60 p-3 font-mono text-xs">{concluido.link}</p>
        <div className="grid grid-cols-2 gap-2">
          <Botao variante="secundario" type="button" onClick={() => void navigator.clipboard.writeText(concluido.link)}>
            Copiar link
          </Botao>
          <Botao type="button" onClick={() => window.location.assign("/painel")}>
            Ir para o pátio
          </Botao>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="cartao p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Vistoria de entrada</h2>
          <span className="font-mono text-xs text-suave">
            {fotos.length}/{MAX_FOTOS}
          </span>
        </div>
        <p className="mt-1 text-xs text-suave">Fotografe arranhões, amassados e rodas antes de começar.</p>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {previas.map((url, indice) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-lg border border-borda">
              <Image src={url} alt={`Foto ${indice + 1}`} fill unoptimized className="object-cover" />
              <button
                type="button"
                onClick={() => setFotos((atuais) => atuais.filter((_, posicao) => posicao !== indice))}
                className="absolute top-1 right-1 rounded-md bg-fundo/80 px-1.5 py-0.5 text-[11px]"
              >
                Remover
              </button>
            </li>
          ))}
          {fotos.length < MAX_FOTOS && (
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

      <section className="grid gap-3 cartao p-4">
        <h2 className="text-sm font-semibold">Serviços</h2>
        {temPlano && (
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Usar 1 crédito do plano</span>
            <input
              type="checkbox"
              checked={usarPlano}
              onChange={(evento) => setUsarPlano(evento.target.checked)}
              className="size-5 accent-white"
            />
          </label>
        )}
        {servicos.length > 0 && (
          <ul className="grid gap-2">
            {servicos.map((servico, indice) => (
              <li key={`${servico.nome}-${indice}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{servico.nome}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono">{formatarMoeda(servico.valor)}</span>
                  <button
                    type="button"
                    onClick={() => setServicos((atuais) => atuais.filter((_, posicao) => posicao !== indice))}
                    className="text-xs text-suave"
                  >
                    Remover
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-[1fr_6.5rem_auto] gap-2">
          <input
            value={nomeServico}
            onChange={(evento) => setNomeServico(evento.target.value)}
            placeholder={usarPlano ? "Extra (ex.: cera)" : "Serviço"}
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
          onChange={(evento) => setObservacoes(evento.target.value)}
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

      {erro && <p className="text-sm text-alerta">{erro}</p>}

      <Botao type="button" onClick={enviar} disabled={pendente} className="h-14 text-base">
        {pendente ? "Abrindo OS..." : "Abrir OS e avisar cliente"}
      </Botao>
    </div>
  );
}

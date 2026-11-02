"use client";

import { useState, useTransition } from "react";
import { atualizarStatusAgendamento } from "@/app/actions/agenda";
import { BotaoWhatsapp } from "@/components/ui/botao-whatsapp";
import { ROTULO_STATUS_AGENDAMENTO } from "@/lib/agenda";
import { horaNoFuso } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { formatarTelefone, linkWhatsapp } from "@/lib/telefone";
import type { Agendamento } from "@/types/database.types";

type Acao = "confirmado" | "cancelado" | "nao_compareceu" | "concluido";

const ROTULO_ACAO: Record<Acao, string> = {
  confirmado: "Confirmar",
  cancelado: "Cancelar horário",
  nao_compareceu: "Marcar que não veio",
  concluido: "Marcar como atendida",
};

const ESTILO_STATUS: Record<Agendamento["status"], string> = {
  pendente: "border border-rosa/70 text-texto",
  confirmado: "bg-rosa text-white",
  concluido: "border border-borda text-suave",
  cancelado: "border border-borda text-suave",
  nao_compareceu: "border border-borda text-suave",
};

type Props = Pick<
  Agendamento,
  "id" | "nome_cliente" | "whatsapp" | "servico_nome" | "preco" | "inicio" | "fim" | "status" | "observacoes"
> & { fuso: string; profissional?: string | null };

export function CartaoAgendamento(props: Props) {
  const { id, nome_cliente, whatsapp, servico_nome, preco, inicio, fim, status, observacoes, fuso, profissional } = props;
  const [ultimaAcao, setUltimaAcao] = useState<Acao | null>(null);
  const [confirmar, setConfirmar] = useState<Acao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [linkAviso, setLinkAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const encerrado = !linkAviso && (status === "cancelado" || status === "nao_compareceu" || status === "concluido");

  function executar(acao: Acao) {
    setAviso(null);
    iniciar(async () => {
      const resultado = await atualizarStatusAgendamento(id, acao);
      setConfirmar(null);
      if (!resultado.ok) return setAviso(resultado.erro);
      setUltimaAcao(acao);
      if (resultado.aviso) setAviso(resultado.aviso);
      setLinkAviso(resultado.whatsapp ?? null);
    });
  }

  return (
    <article className={`cartao grid grid-cols-1 gap-3 p-4 ${encerrado ? "opacity-55" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl leading-none font-semibold tabular-nums">{horaNoFuso(inicio, fuso)}</p>
          <p className="mt-1 text-xs text-suave">até {horaNoFuso(fim, fuso)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTILO_STATUS[status]}`}>
          {ROTULO_STATUS_AGENDAMENTO[status]}
        </span>
      </div>

      <div className="grid gap-1 border-t border-borda pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-semibold">{nome_cliente}</p>
          <a href={linkWhatsapp(whatsapp)} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-suave underline underline-offset-4">
            {formatarTelefone(whatsapp)}
          </a>
        </div>
        <p className="text-sm text-suave">
          {servico_nome} · {formatarMoeda(Number(preco))}
        </p>
        {profissional && (
          <p className="text-sm">
            <span className="rounded-full border border-borda px-2 py-0.5 text-xs text-texto">{profissional}</span>
          </p>
        )}
        {observacoes && <p className="mt-1 rounded-xl bg-elevado px-3 py-2 text-xs text-suave">{observacoes}</p>}
      </div>

      {aviso && <p className="text-xs text-alerta">{aviso}</p>}

      {linkAviso && (
        <BotaoWhatsapp
          link={linkAviso}
          rotulo={
            ultimaAcao === "cancelado"
              ? "Avisar cancelamento no WhatsApp"
              : ultimaAcao === "concluido"
                ? "Enviar agradecimento e Pix no WhatsApp"
                : "Enviar confirmação no WhatsApp"
          }
          aoClicar={() => setLinkAviso(null)}
        />
      )}

      {confirmar ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setConfirmar(null)} className="h-11 rounded-full border border-borda text-sm">
            Voltar
          </button>
          <button
            type="button"
            onClick={() => executar(confirmar)}
            disabled={pendente}
            className="h-11 rounded-full bg-rosa text-sm font-semibold text-white disabled:opacity-50"
          >
            {pendente ? "Salvando..." : ROTULO_ACAO[confirmar]}
          </button>
        </div>
      ) : status === "pendente" ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setConfirmar("cancelado")} className="h-11 rounded-full border border-borda text-sm text-suave">
            Recusar
          </button>
          <button
            type="button"
            onClick={() => executar("confirmado")}
            disabled={pendente}
            className="h-11 rounded-full bg-rosa text-sm font-semibold text-white disabled:opacity-50"
          >
            {pendente ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      ) : status === "confirmado" ? (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => executar("concluido")}
            disabled={pendente}
            className="flex h-11 items-center justify-center rounded-full bg-rosa text-sm font-semibold text-white disabled:opacity-50"
          >
            {pendente ? "Salvando..." : "Marcar como atendida"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmar("nao_compareceu")} className="h-10 rounded-full border border-borda text-xs text-suave">
              Não veio
            </button>
            <button type="button" onClick={() => setConfirmar("cancelado")} className="h-10 rounded-full border border-borda text-xs text-suave">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

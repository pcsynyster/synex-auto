"use client";

import { useState, useTransition } from "react";
import { definirStatusAssinatura, registrarPagamento } from "@/app/actions/admin";
import { situacaoAssinatura } from "@/lib/assinatura";
import { formatarMoeda } from "@/lib/formato";
import { linkWhatsapp } from "@/lib/telefone";
import type { Database } from "@/types/database.types";

type Estetica = Database["public"]["Functions"]["admin_listar_esteticas"]["Returns"][number];

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function CartaoEstetica({ estetica, hoje, appUrl }: { estetica: Estetica; hoje: string; appUrl: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarBloqueio, setConfirmarBloqueio] = useState(false);
  const [pendente, iniciar] = useTransition();
  const situacao = situacaoAssinatura(estetica.status_assinatura, estetica.assinatura_valida_ate, hoje);

  function executar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    iniciar(async () => {
      const resultado = await acao();
      setConfirmarBloqueio(false);
      if (!resultado.ok) setErro(resultado.erro ?? "Erro.");
    });
  }

  const prazo = situacao.ativa
    ? situacao.diasRestantes === 0
      ? "vence hoje"
      : `${situacao.diasRestantes} ${situacao.diasRestantes === 1 ? "dia" : "dias"} restantes`
    : situacao.diasRestantes < 0
      ? `venceu há ${Math.abs(situacao.diasRestantes)} ${Math.abs(situacao.diasRestantes) === 1 ? "dia" : "dias"}`
      : "acesso suspenso";

  const cobranca = `Olá! A mensalidade da Synex Auto (${formatarMoeda(Number(estetica.valor_mensal))}) da ${estetica.nome} vence em ${formatarData(estetica.assinatura_valida_ate)}. Posso te mandar o Pix?`;

  return (
    <article className={`cartao grid grid-cols-1 gap-3 p-4 ${situacao.ativa ? "" : "border-alerta/40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{estetica.nome}</p>
          <p className="truncate text-xs text-suave">{estetica.email_dono ?? "sem dono"}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            situacao.ativa ? (estetica.status_assinatura === "ativa" ? "bg-texto text-fundo" : "border border-borda text-texto") : "bg-alerta text-fundo"
          }`}
        >
          {situacao.rotulo}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 border-t border-borda pt-3 text-center">
        <div>
          <dt className="text-[11px] text-suave">Vencimento</dt>
          <dd className="text-sm font-semibold tabular-nums">{formatarData(estetica.assinatura_valida_ate)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-suave">Mensalidade</dt>
          <dd className="text-sm font-semibold tabular-nums">{formatarMoeda(Number(estetica.valor_mensal))}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-suave">OS em 30 dias</dt>
          <dd className="text-sm font-semibold tabular-nums">{estetica.os_30_dias}</dd>
        </div>
      </dl>
      <p className={`text-xs ${situacao.ativa ? "text-suave" : "text-alerta"}`}>{prazo}</p>

      {erro && <p className="text-xs text-alerta">{erro}</p>}

      {confirmarBloqueio ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setConfirmarBloqueio(false)} className="h-11 rounded-full border border-borda text-sm">
            Voltar
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => executar(() => definirStatusAssinatura(estetica.id, "inadimplente"))}
            className="h-11 rounded-full bg-alerta text-sm font-semibold text-fundo disabled:opacity-50"
          >
            Bloquear acesso
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          <button
            type="button"
            disabled={pendente}
            onClick={() => executar(() => registrarPagamento(estetica.id, 30))}
            className="h-11 rounded-full bg-texto text-sm font-semibold text-fundo disabled:opacity-50"
          >
            {pendente ? "Salvando..." : "Pagou: liberar +30 dias"}
          </button>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={linkWhatsapp(estetica.telefone, cobranca)}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center rounded-full border border-borda text-xs"
            >
              Cobrar
            </a>
            <a
              href={`${appUrl}/agendar/${estetica.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center rounded-full border border-borda text-xs"
            >
              Agenda
            </a>
            {estetica.status_assinatura === "inadimplente" || estetica.status_assinatura === "cancelada" ? (
              <button
                type="button"
                disabled={pendente}
                onClick={() => executar(() => definirStatusAssinatura(estetica.id, "ativa"))}
                className="h-10 rounded-full border border-borda text-xs"
              >
                Reativar
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmarBloqueio(true)} className="h-10 rounded-full border border-borda text-xs text-alerta">
                Bloquear
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

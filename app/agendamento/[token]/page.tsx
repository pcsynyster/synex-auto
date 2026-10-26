import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelarAgendamento } from "@/components/agenda/cancelar-agendamento";
import { RodapeSynex } from "@/components/ui/rodape-synex";
import { PADRAO_TOKEN, ROTULO_STATUS_AGENDAMENTO, type AgendamentoPublico } from "@/lib/agenda";
import { dataNoFuso, formatarDuracao, horaNoFuso, rotuloDataLonga } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { formatarPlaca } from "@/lib/placa";
import { criarClienteAnonimo } from "@/lib/supabase/anon";
import { linkWhatsapp } from "@/lib/telefone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seu agendamento",
  robots: { index: false, follow: false },
};

const ESTILO_STATUS = {
  pendente: "border border-borda text-texto",
  confirmado: "bg-texto text-fundo",
  concluido: "border border-borda text-suave",
  cancelado: "border border-borda text-suave line-through",
  nao_compareceu: "border border-borda text-suave",
} as const;

export default async function PaginaAgendamento({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!PADRAO_TOKEN.test(token)) notFound();

  const { data } = await criarClienteAnonimo().rpc("agendamento_publico", { p_token: token });
  const agendamento = data as AgendamentoPublico | null;
  if (!agendamento) notFound();

  const data_ = dataNoFuso(agendamento.inicio, agendamento.fuso);
  const ativo = agendamento.status === "pendente" || agendamento.status === "confirmado";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-suave">Seu agendamento</p>
        <h1 className="mt-1 text-2xl leading-tight font-semibold">{agendamento.empresa}</h1>
      </header>

      <section className="cartao grid grid-cols-1 gap-5 p-5">
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${ESTILO_STATUS[agendamento.status]}`}>
          {ROTULO_STATUS_AGENDAMENTO[agendamento.status]}
        </span>
        <div>
          <p className="texto-prata text-[2.5rem] leading-none font-semibold tabular-nums">{horaNoFuso(agendamento.inicio, agendamento.fuso)}</p>
          <p className="mt-2 text-base">{rotuloDataLonga(data_)}</p>
        </div>
        <dl className="grid gap-2 border-t border-borda pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-suave">Serviço</dt>
            <dd className="text-right">{agendamento.servico}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-suave">Duração</dt>
            <dd>{formatarDuracao(agendamento.duracao_min)}</dd>
          </div>
          {agendamento.placa && (
            <div className="flex justify-between gap-4">
              <dt className="text-suave">Veículo</dt>
              <dd className="font-mono">
                {formatarPlaca(agendamento.placa)}
                {agendamento.modelo ? ` · ${agendamento.modelo}` : ""}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-suave">Valor</dt>
            <dd className="font-semibold">{formatarMoeda(Number(agendamento.preco))}</dd>
          </div>
        </dl>
        {agendamento.status === "pendente" && (
          <p className="rounded-2xl border border-borda bg-black/40 px-4 py-3 text-sm text-suave">
            A loja vai confirmar seu horário e você recebe a confirmação pelo WhatsApp.
          </p>
        )}
      </section>

      <div className="grid gap-2">
        <a
          href={linkWhatsapp(agendamento.telefone_empresa)}
          className="flex h-12 items-center justify-center rounded-full border border-borda bg-elevado/60 text-sm font-semibold"
        >
          Falar com a loja
        </a>
        {agendamento.pode_cancelar && <CancelarAgendamento token={token} />}
        {!ativo && (
          <Link
            href={`/agendar/${agendamento.slug}`}
            className="flex h-12 items-center justify-center rounded-full bg-texto text-sm font-semibold text-fundo"
          >
            Agendar novo horário
          </Link>
        )}
        {ativo && !agendamento.pode_cancelar && (
          <p className="text-center text-xs text-suave">Faltando menos de 2 horas, o cancelamento é feito direto com a loja.</p>
        )}
      </div>

      <RodapeSynex texto="Agenda por" />
    </main>
  );
}

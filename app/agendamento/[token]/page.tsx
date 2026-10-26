import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelarAgendamento } from "@/components/agenda/cancelar-agendamento";
import { BotaoWhatsapp } from "@/components/ui/botao-whatsapp";
import { RodapeSynex } from "@/components/ui/rodape-synex";
import { PADRAO_TOKEN, ROTULO_STATUS_AGENDAMENTO, type AgendamentoPublico } from "@/lib/agenda";
import { dataNoFuso, formatarDuracao, horaNoFuso, rotuloDataLonga } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { formatarPlaca } from "@/lib/placa";
import { criarClienteAnonimo } from "@/lib/supabase/anon";
import { linkWhatsapp } from "@/lib/telefone";
import { imagensCompartilhamento, urlLogo } from "@/lib/logo";
import { LogoLoja } from "@/components/ui/logo-loja";

export const dynamic = "force-dynamic";

async function carregar(token: string): Promise<AgendamentoPublico | null> {
  if (!PADRAO_TOKEN.test(token)) return null;
  const { data } = await criarClienteAnonimo().rpc("agendamento_publico", { p_token: token });
  return (data as AgendamentoPublico | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const agendamento = await carregar((await params).token);
  if (!agendamento) return { title: "Seu agendamento", robots: { index: false, follow: false } };
  const titulo = `${agendamento.empresa} · Seu agendamento`;
  const descricao = `${agendamento.servico} em ${rotuloDataLonga(dataNoFuso(agendamento.inicio, agendamento.fuso))}, às ${horaNoFuso(agendamento.inicio, agendamento.fuso)}.`;
  return {
    title: { absolute: titulo },
    description: descricao,
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: descricao, siteName: agendamento.empresa, images: imagensCompartilhamento(agendamento.slug, agendamento.logo_versao, agendamento.empresa) },
  };
}

const ESTILO_STATUS = {
  pendente: "border border-borda text-texto",
  confirmado: "bg-texto text-fundo",
  concluido: "border border-borda text-suave",
  cancelado: "border border-borda text-suave line-through",
  nao_compareceu: "border border-borda text-suave",
} as const;

export default async function PaginaAgendamento({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const agendamento = await carregar(token);
  if (!agendamento) notFound();

  const data_ = dataNoFuso(agendamento.inicio, agendamento.fuso);
  const ativo = agendamento.status === "pendente" || agendamento.status === "confirmado";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <LogoLoja url={urlLogo(agendamento.slug, agendamento.logo_versao)} nome={agendamento.empresa} />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-suave">Seu agendamento</p>
          <h1 className="mt-1 text-2xl leading-tight font-semibold">{agendamento.empresa}</h1>
        </div>
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
        {agendamento.status === "pendente" ? (
          <BotaoWhatsapp
            rotulo="Avisar a loja no WhatsApp"
            link={linkWhatsapp(
              agendamento.telefone_empresa,
              `Olá! Sou ${agendamento.nome} e acabei de agendar ${agendamento.servico} para ${rotuloDataLonga(data_)}, às ${horaNoFuso(agendamento.inicio, agendamento.fuso)}${agendamento.placa ? `, veículo ${formatarPlaca(agendamento.placa)}` : ""}.`,
            )}
          />
        ) : (
          <a
            href={linkWhatsapp(agendamento.telefone_empresa)}
            className="flex h-12 items-center justify-center rounded-full border border-borda bg-elevado/60 text-sm font-semibold"
          >
            Falar com a loja
          </a>
        )}
        {agendamento.pode_cancelar && <CancelarAgendamento token={token} />}
        {!ativo && (
          <Link
            href={`/${agendamento.slug}`}
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

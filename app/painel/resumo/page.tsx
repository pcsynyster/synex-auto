import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraficoBarras } from "@/components/resumo/grafico-barras";
import { ROTULO_STATUS_AGENDAMENTO } from "@/lib/agenda";
import { dataNoFuso, horaNoFuso } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { obterContexto } from "@/lib/sessao";
import { faixaDoPeriodo, LISTAS, lerLista, lerPeriodo, PERIODOS, preencherSerie, type Resumo } from "@/lib/resumo";

export const metadata: Metadata = { title: "Resumo" };

const LIMITE = 100;

function dataCurta(iso: string, fuso: string): string {
  const [, mes, dia] = dataNoFuso(iso, fuso).split("-");
  return `${dia}/${mes}`;
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="cartao grid gap-1 p-4">
      <p className="text-xs text-suave">{rotulo}</p>
      <p className="text-2xl font-semibold tabular-nums">{valor}</p>
      {detalhe && <p className="text-[11px] text-suave">{detalhe}</p>}
    </div>
  );
}

export default async function PaginaResumo({ searchParams }: { searchParams: Promise<{ p?: string; lista?: string }> }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  const parametros = await searchParams;
  const periodo = lerPeriodo(parametros.p);
  const lista = lerLista(parametros.lista);
  const fuso = ctx.tenant.fuso;
  const faixa = faixaDoPeriodo(periodo, fuso);
  const agora = new Date().toISOString();

  const base = ctx.supabase.from("agendamentos").select("id, nome_cliente, servico_nome, preco, inicio, status, profissionais(nome)");
  const consultaLista =
    lista === "atendidos"
      ? base.eq("status", "concluido").gte("inicio", faixa.inicio).lt("inicio", faixa.fim).order("inicio", { ascending: false }).limit(LIMITE)
      : lista === "passados"
        ? base
            .gte("inicio", faixa.inicio)
            .lt("inicio", agora < faixa.fim ? agora : faixa.fim)
            .order("inicio", { ascending: false })
            .limit(LIMITE)
        : base.in("status", ["pendente", "confirmado"]).gte("inicio", agora).order("inicio").limit(LIMITE);

  const [{ data: dados }, { data: itens }] = await Promise.all([
    ctx.supabase.rpc("resumo_painel", { p_inicio: faixa.inicio, p_fim: faixa.fim, p_agrupar: faixa.agrupar }),
    consultaLista,
  ]);

  const resumo = (dados as Resumo | null) ?? null;
  if (!resumo) {
    return <p className="rounded-[1.25rem] border border-dashed border-borda p-8 text-center text-sm text-suave">Não foi possível carregar o resumo.</p>;
  }

  const recebido = Number(resumo.recebido);
  const ticket = resumo.atendimentos > 0 ? recebido / resumo.atendimentos : 0;
  const serie = faixa.agrupar === "dia" ? preencherSerie(resumo.serie, faixa.primeiroDia, faixa.hoje) : resumo.serie;
  const ag = resumo.agendamentos;
  const encerrados = ag.concluido + ag.nao_compareceu;
  const comparecimento = encerrados > 0 ? Math.round((ag.concluido / encerrados) * 100) : null;
  const rotuloPeriodo = PERIODOS.find((item) => item.id === periodo)?.rotulo.toLowerCase() ?? "";
  const href = (p: string, l: string) => `/painel/resumo?p=${p}&lista=${l}`;
  const registros = (itens ?? []) as unknown[];

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Resumo</h1>
        <span className="rounded-full border border-borda px-2.5 py-1 text-xs text-suave">{resumo.proximos} próximos horários</span>
      </div>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Período">
        {PERIODOS.map((item) => (
          <Link
            key={item.id}
            href={href(item.id, lista)}
            aria-current={item.id === periodo ? "page" : undefined}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
              item.id === periodo ? "border-rosa bg-rosa font-semibold text-white" : "border-borda text-suave hover:text-texto"
            }`}
          >
            {item.rotulo}
          </Link>
        ))}
      </nav>

      <section className="cartao grid gap-4 p-5">
        <div>
          <p className="text-xs text-suave">Recebido · {rotuloPeriodo}</p>
          <p className="texto-prata mt-1 text-4xl font-semibold tabular-nums">{formatarMoeda(recebido)}</p>
          <p className="mt-1 text-[11px] text-suave">Soma dos atendimentos marcados como atendidos no período.</p>
        </div>
        {periodo !== "hoje" && serie.length > 1 && <GraficoBarras serie={serie} porMes={faixa.agrupar === "mes"} />}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Indicador rotulo="Atendimentos" valor={String(resumo.atendimentos)} />
        <Indicador rotulo="Ticket médio" valor={formatarMoeda(ticket)} />
        <Indicador rotulo="Clientes" valor={String(resumo.clientes)} />
        <Indicador rotulo="Agendamentos" valor={String(ag.total)} detalhe={comparecimento !== null ? `${comparecimento}% compareceram` : undefined} />
      </div>

      <section className="cartao grid gap-3 p-4">
        <h2 className="text-sm font-semibold">Agendamentos · {rotuloPeriodo}</h2>
        <dl className="grid grid-cols-4 gap-2 text-center">
          {[
            ["Atendidos", ag.concluido],
            ["Em aberto", ag.aberto],
            ["Cancelados", ag.cancelado],
            ["Não vieram", ag.nao_compareceu],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="rounded-2xl bg-elevado/70 px-1 py-3">
              <dd className="text-lg font-semibold tabular-nums">{valor}</dd>
              <dt className="text-[11px] text-suave">{rotulo}</dt>
            </div>
          ))}
        </dl>
      </section>

      {resumo.profissionais.length > 1 && (
        <section className="cartao grid gap-3 p-4">
          <h2 className="text-sm font-semibold">Por profissional</h2>
          <ul className="grid gap-2.5">
            {resumo.profissionais.map((item) => {
              const largura = (Number(item.valor) / Math.max(1, Number(resumo.profissionais[0]?.valor ?? 1))) * 100;
              return (
                <li key={item.nome} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{item.nome}</span>
                    <span className="shrink-0 text-xs text-suave tabular-nums">
                      {item.qtd} {item.qtd === 1 ? "atendimento" : "atendimentos"} · {formatarMoeda(Number(item.valor))}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-elevado">
                    <div className="barra-prata h-full rounded-full" style={{ width: `${largura}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {resumo.servicos.length > 0 && (
        <section className="cartao grid gap-3 p-4">
          <h2 className="text-sm font-semibold">Serviços mais feitos</h2>
          <ul className="grid gap-2.5">
            {resumo.servicos.map((servico) => {
              const largura = (servico.qtd / (resumo.servicos[0]?.qtd ?? 1)) * 100;
              return (
                <li key={servico.nome} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{servico.nome}</span>
                    <span className="shrink-0 text-xs text-suave tabular-nums">
                      {servico.qtd}x · {formatarMoeda(Number(servico.valor))}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-elevado">
                    <div className="barra-prata h-full rounded-full" style={{ width: `${largura}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="grid min-w-0 grid-cols-1 gap-3">
        <nav className="grid grid-cols-3 gap-1 rounded-full border border-borda bg-elevado/60 p-1" aria-label="Lista">
          {LISTAS.map((item) => (
            <Link
              key={item.id}
              href={href(periodo, item.id)}
              aria-current={item.id === lista ? "page" : undefined}
              className={`flex h-9 items-center justify-center rounded-full px-1 text-center text-[12px] leading-tight font-medium ${
                item.id === lista ? "bg-rosa text-white" : "text-suave"
              }`}
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>

        {registros.length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-borda p-6 text-center text-sm text-suave">
            {lista === "atendidos"
              ? "Nenhum atendimento neste período."
              : lista === "passados"
                ? "Nenhum agendamento neste período."
                : "Nenhum agendamento marcado daqui pra frente."}
          </p>
        ) : (
          <ul className="cartao min-w-0 divide-y divide-borda overflow-hidden">
            {(itens as unknown as {
              id: string;
              nome_cliente: string;
              servico_nome: string;
              preco: number;
              inicio: string;
              status: keyof typeof ROTULO_STATUS_AGENDAMENTO;
              profissionais: { nome: string } | null;
            }[]).map((item) => (
              <li key={item.id}>
                <Link href={`/painel/agenda?data=${dataNoFuso(item.inicio, fuso)}`} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.nome_cliente}</span>
                    <span className="mt-0.5 block truncate text-xs text-suave">
                      {dataCurta(item.inicio, fuso)} às {horaNoFuso(item.inicio, fuso)} · {item.servico_nome}
                      {item.profissionais ? ` · ${item.profissionais.nome}` : ""}
                    </span>
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatarMoeda(Number(item.preco))}</span>
                    <span className={`text-[11px] ${item.status === "pendente" || item.status === "confirmado" ? "text-texto" : "text-suave"}`}>
                      {ROTULO_STATUS_AGENDAMENTO[item.status]}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {registros.length === LIMITE && <p className="text-center text-xs text-suave">Mostrando os {LIMITE} mais recentes.</p>}
      </section>
    </div>
  );
}

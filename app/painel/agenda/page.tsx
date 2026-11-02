import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CartaoAgendamento } from "@/components/agenda/cartao-agendamento";
import { EditarLink } from "@/components/agenda/editar-link";
import { env } from "@/lib/env";
import { dataNoFuso, dataValida, diaDoMes, hojeNoFuso, limitesDoDia, rotuloDataLonga, rotuloDiaCurto, somarDias } from "@/lib/datas";
import { obterContexto } from "@/lib/sessao";
import { z } from "zod";

export const metadata: Metadata = { title: "Agenda" };

const DIAS_NA_FAIXA = 14;

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<{ data?: string; p?: string }> }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  const fuso = ctx.tenant.fuso;
  const hoje = hojeNoFuso(fuso);
  const { data: parametro, p: paramProf } = await searchParams;
  const profissionalId = paramProf && z.uuid().safeParse(paramProf).success ? paramProf : null;
  const data = parametro && dataValida(parametro) ? parametro : hoje;
  const inicioFaixa = data < hoje ? data : hoje;
  const fimFaixa = somarDias(inicioFaixa, DIAS_NA_FAIXA);

  const dia = limitesDoDia(data, fuso);
  const faixa = { inicio: limitesDoDia(inicioFaixa, fuso).inicio, fim: limitesDoDia(fimFaixa, fuso).inicio };

  let consultaDia = ctx.supabase
    .from("agendamentos")
    .select("id, nome_cliente, whatsapp, servico_nome, preco, inicio, fim, status, observacoes, profissional_id, profissionais(nome)")
    .gte("inicio", dia.inicio)
    .lt("inicio", dia.fim)
    .order("inicio");
  let consultaFaixa = ctx.supabase
    .from("agendamentos")
    .select("inicio, status")
    .in("status", ["pendente", "confirmado"])
    .gte("inicio", faixa.inicio)
    .lt("inicio", faixa.fim);
  if (profissionalId) {
    consultaDia = consultaDia.eq("profissional_id", profissionalId);
    consultaFaixa = consultaFaixa.eq("profissional_id", profissionalId);
  }

  const [{ data: agendamentos }, { data: ativosFaixa }, { data: tenant }, { data: equipe }] = await Promise.all([
    consultaDia,
    consultaFaixa,
    ctx.supabase.from("tenants").select("agenda_ativa").eq("id", ctx.tenantId).single(),
    ctx.supabase.from("profissionais").select("id, nome").eq("ativo", true).order("ordem").order("nome"),
  ]);
  const profissionais = equipe ?? [];
  const query = (d: string | null, pr: string | null) => {
    const q = new URLSearchParams();
    if (d && d !== hoje) q.set("data", d);
    if (pr) q.set("p", pr);
    const t = q.toString();
    return t ? `/painel/agenda?${t}` : "/painel/agenda";
  };

  const porDia = new Map<string, { total: number; pendentes: number }>();
  for (const item of ativosFaixa ?? []) {
    const chave = dataNoFuso(item.inicio, fuso);
    const atual = porDia.get(chave) ?? { total: 0, pendentes: 0 };
    porDia.set(chave, { total: atual.total + 1, pendentes: atual.pendentes + (item.status === "pendente" ? 1 : 0) });
  }

  const lista = agendamentos ?? [];
  const ativos = lista.filter((item) => item.status === "pendente" || item.status === "confirmado");

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="texto-prata text-2xl font-semibold tracking-tight">Agenda</h1>
        <Link href={`/painel/novo${data !== hoje ? `?data=${data}` : ""}`} className="rounded-full brilho px-4 py-2 text-sm font-semibold text-white">
          + Novo agendamento
        </Link>
      </div>

      {profissionais.length > 1 && (
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label="Profissional">
          {[{ id: null as string | null, nome: "Todas" }, ...profissionais].map((item) => {
            const ativo = item.id === profissionalId;
            return (
              <Link
                key={item.id ?? "todas"}
                href={query(data, item.id)}
                aria-current={ativo ? "page" : undefined}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                  ativo ? "brilho font-semibold text-white" : "border-borda text-suave hover:text-texto"
                }`}
              >
                {item.nome}
              </Link>
            );
          })}
        </nav>
      )}

      <section className="cartao grid grid-cols-1 gap-3 p-4">
        <div>
          <p className="text-sm font-semibold">Link de agendamento</p>
          <p className="mt-0.5 text-xs text-suave">
            {tenant?.agenda_ativa === false
              ? "A agenda online está desligada. Ative em Ajustes."
              : "Coloque na bio do Instagram e no status do WhatsApp."}
          </p>
        </div>
        <EditarLink appUrl={env.appUrl} slug={ctx.tenant.slug} sugestao={ctx.tenant.nome} />
      </section>

      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {Array.from({ length: DIAS_NA_FAIXA }, (_, indice) => {
          const opcao = somarDias(inicioFaixa, indice);
          const ativo = opcao === data;
          const resumo = porDia.get(opcao);
          return (
            <Link
              key={opcao}
              href={query(opcao, profissionalId)}
              aria-current={ativo ? "date" : undefined}
              className={`relative flex w-14 shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl border py-2.5 transition-colors ${
                ativo ? "brilho text-white" : "border-borda bg-elevado/50"
              }`}
            >
              <span className={`text-[11px] ${ativo ? "text-white/60" : "text-suave"}`}>{opcao === hoje ? "Hoje" : rotuloDiaCurto(opcao)}</span>
              <span className="text-lg font-semibold">{diaDoMes(opcao)}</span>
              <span className={`h-4 text-[10px] font-semibold ${ativo ? "text-white/70" : "text-suave"}`}>{resumo ? resumo.total : ""}</span>
              {resumo && resumo.pendentes > 0 && (
                <span className={`absolute top-1.5 right-1.5 size-1.5 rounded-full ${ativo ? "bg-white" : "brilho"}`} aria-label="Tem pendentes" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{data === hoje ? "Hoje" : rotuloDataLonga(data)}</h2>
        <span className="rounded-full border border-borda px-2.5 py-1 text-xs text-suave">
          {ativos.length} {ativos.length === 1 ? "horário" : "horários"}
        </span>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-[1.25rem] border border-dashed border-borda p-8 text-center text-sm text-suave">
          Nenhum agendamento neste dia.
          <Link href={`/painel/novo${data !== hoje ? `?data=${data}` : ""}`} className="mt-2 block text-texto underline underline-offset-4">
            Marcar um horário
          </Link>
        </p>
      ) : (
        <ul className="grid gap-3">
          {lista.map((item) => (
            <li key={item.id}>
              <CartaoAgendamento
                {...item}
                fuso={fuso}
                profissional={profissionais.length > 1 || !item.profissionais ? (item.profissionais?.nome ?? null) : null}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NovoAgendamento } from "@/components/agenda/novo-agendamento";
import { dataValida, hojeNoFuso } from "@/lib/datas";
import { obterContexto } from "@/lib/sessao";

export const metadata: Metadata = { title: "Novo agendamento" };

export default async function PaginaNovoAgendamento({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  const { data: parametro } = await searchParams;
  const hoje = hojeNoFuso(ctx.tenant.fuso);
  const dataInicial = parametro && dataValida(parametro) && parametro >= hoje ? parametro : hoje;

  const [{ data: servicos }, { data: profissionais }] = await Promise.all([
    ctx.supabase.from("servicos").select("id, nome, descricao, duracao_min, preco").eq("ativo", true).order("ordem").order("nome"),
    ctx.supabase.from("profissionais").select("id, nome").eq("ativo", true).order("ordem").order("nome"),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="texto-prata text-2xl font-semibold tracking-tight">Novo agendamento</h1>
        <Link href="/painel/agenda" className="text-xs text-suave">
          Voltar
        </Link>
      </div>
      <p className="-mt-2 text-sm text-suave">Para quando a cliente chama no WhatsApp ou liga. Já entra confirmado.</p>
      <NovoAgendamento
        servicos={(servicos ?? []).map((s) => ({ ...s, preco: Number(s.preco) }))}
        profissionais={profissionais ?? []}
        hoje={hoje}
        dataInicial={dataInicial}
        fuso={ctx.tenant.fuso}
      />
    </div>
  );
}

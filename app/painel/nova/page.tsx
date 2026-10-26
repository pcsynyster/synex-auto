import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { NovaEntrada, type PreenchimentoEntrada } from "@/components/painel/nova-entrada";
import { obterContexto } from "@/lib/sessao";

export const metadata: Metadata = { title: "Nova entrada" };

export default async function PaginaNovaEntrada({ searchParams }: { searchParams: Promise<{ agendamento?: string }> }) {
  const { agendamento: agendamentoId } = await searchParams;
  if (!agendamentoId || !z.uuid().safeParse(agendamentoId).success) return <NovaEntrada />;

  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  const { data } = await ctx.supabase
    .from("agendamentos")
    .select("id, nome_cliente, whatsapp, placa, modelo, servico_nome, preco, status")
    .eq("id", agendamentoId)
    .in("status", ["pendente", "confirmado"])
    .maybeSingle();

  if (!data) return <NovaEntrada />;

  const preenchimento: PreenchimentoEntrada = {
    agendamentoId: data.id,
    placa: data.placa ?? "",
    nome: data.nome_cliente,
    whatsapp: data.whatsapp.replace(/^55/, ""),
    modelo: data.modelo ?? "",
    servico: { nome: data.servico_nome, valor: Number(data.preco) },
  };

  return <NovaEntrada preenchimento={preenchimento} />;
}

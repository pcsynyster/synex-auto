import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { EditarOrdem } from "@/components/painel/editar-ordem";
import { EditarVeiculo } from "@/components/painel/editar-veiculo";
import { ExcluirOrdem } from "@/components/painel/excluir-ordem";
import { formatarPlaca } from "@/lib/placa";
import { ROTULO_STATUS } from "@/lib/os-status";
import { obterContexto } from "@/lib/sessao";
import { formatarTelefone } from "@/lib/telefone";
import type { ServicoAvulso } from "@/types/database.types";

export const metadata: Metadata = { title: "Editar OS" };

function lerServicos(valor: unknown): ServicoAvulso[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is ServicoAvulso => typeof item?.nome === "string" && typeof item?.valor === "number");
}

export default async function PaginaEditarOS({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  const { data: os } = await ctx.supabase
    .from("ordens_servico")
    .select("id, status, fotos_vistoria, servicos_avulsos, observacoes, token_publico, plano_assinatura_id, veiculos(id, placa, modelo, categoria, clientes(id, nome, whatsapp))")
    .eq("id", id)
    .maybeSingle();

  if (!os?.veiculos?.clientes) notFound();
  const veiculo = os.veiculos;
  const cliente = os.veiculos.clientes;

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Editar OS</h1>
        <Link href="/painel" className="text-xs text-suave">
          Voltar
        </Link>
      </div>

      <section className="cartao grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-block rounded-md bg-texto px-2.5 py-1 font-mono text-lg font-bold tracking-[0.18em] text-fundo">{formatarPlaca(veiculo.placa)}</p>
            <p className="mt-1.5 truncate text-sm text-suave">
              {veiculo.modelo} · {cliente.nome} · {formatarTelefone(cliente.whatsapp)}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-borda px-2.5 py-1 text-xs text-suave">{ROTULO_STATUS[os.status]}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <a href={`/os/${os.token_publico}`} target="_blank" rel="noreferrer" className="text-suave underline underline-offset-4">
            Ver link do cliente
          </a>
        </div>
      </section>

      <EditarVeiculo
        veiculoId={veiculo.id}
        placa={veiculo.placa}
        modelo={veiculo.modelo}
        categoria={veiculo.categoria}
        nome={cliente.nome}
        whatsapp={formatarTelefone(cliente.whatsapp)}
      />

      <EditarOrdem
        osId={os.id}
        fotos={os.fotos_vistoria}
        servicos={lerServicos(os.servicos_avulsos)}
        observacoes={os.observacoes ?? ""}
        usouPlano={os.plano_assinatura_id !== null}
      />

      {ctx.papel === "dono" && <ExcluirOrdem osId={os.id} placa={formatarPlaca(veiculo.placa)} />}
    </div>
  );
}

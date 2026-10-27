import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CartaoOS } from "@/components/painel/cartao-os";
import { obterContexto } from "@/lib/sessao";

export const metadata: Metadata = { title: "Serviços" };

export default async function PaginaPainel() {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  const inicioDoDia = new Date();
  inicioDoDia.setUTCHours(3, 0, 0, 0);
  if (inicioDoDia > new Date()) inicioDoDia.setUTCDate(inicioDoDia.getUTCDate() - 1);

  const { data: ordens } = await ctx.supabase
    .from("ordens_servico")
    .select("id, status, valor_total, token_publico, plano_assinatura_id, criado_em, veiculos(placa, modelo, clientes(nome))")
    .or(`status.neq.entregue,entregue_em.gte."${inicioDoDia.toISOString()}"`)
    .order("criado_em", { ascending: false })
    .limit(100);

  const lista = ordens ?? [];
  const emAndamento = lista.filter((os) => os.status !== "entregue").length;

  return (
    <div className="grid gap-4">
      <Link
        href="/painel/nova"
        className="flex h-14 items-center justify-center gap-2 rounded-full bg-texto text-base font-semibold text-fundo transition-transform hover:bg-white active:scale-[0.99]"
      >
        Nova entrada por placa
      </Link>

      {!ctx.tenant.chave_pix && ctx.papel === "dono" && (
        <Link href="/painel/agenda/config#pix" className="flex items-center justify-between gap-3 rounded-2xl border border-borda bg-elevado/60 px-4 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Cadastre seu Pix</span>
            <span className="block text-xs text-suave">Ele vai junto quando você avisar que o carro está pronto.</span>
          </span>
          <span className="shrink-0 rounded-full bg-texto px-3.5 py-1.5 text-xs font-semibold text-fundo">Cadastrar</span>
        </Link>
      )}

      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Serviços de hoje</h1>
        <span className="rounded-full border border-borda px-2.5 py-1 text-xs text-suave">{emAndamento} em andamento</span>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-[1.25rem] border border-dashed border-borda p-8 text-center text-sm text-suave">
          Nenhum serviço em andamento. Registre a primeira entrada.
        </p>
      ) : (
        <ul className="grid gap-3">
          {lista.map((os) =>
            os.veiculos ? (
              <li key={os.id}>
                <CartaoOS
                  id={os.id}
                  status={os.status}
                  token={os.token_publico}
                  placa={os.veiculos.placa}
                  modelo={os.veiculos.modelo}
                  cliente={os.veiculos.clientes?.nome ?? ""}
                  valor={Number(os.valor_total)}
                  usouPlano={os.plano_assinatura_id !== null}
                  podeExcluir={ctx.papel === "dono"}
                />
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
}

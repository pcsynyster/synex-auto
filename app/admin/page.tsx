import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CartaoEstetica } from "@/components/admin/cartao-estetica";
import { FormConvite } from "@/components/admin/form-convite";
import { ListaConvites } from "@/components/admin/lista-convites";
import { SimboloSynex } from "@/components/ui/marca";
import { situacaoAssinatura } from "@/lib/assinatura";
import { hojeNoFuso, FUSO_PADRAO } from "@/lib/datas";
import { env } from "@/lib/env";
import { formatarMoeda } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function PaginaAdmin() {
  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?voltar=/admin");

  const { data: admin } = await supabase.rpc("eh_admin");
  if (admin !== true) notFound();

  const [{ data: esteticas }, { data: convites }] = await Promise.all([
    supabase.rpc("admin_listar_esteticas"),
    supabase.from("convites").select("email, nome_empresa, dias_teste, valor_mensal").is("usado_em", null).order("criado_em", { ascending: false }),
  ]);

  const hoje = hojeNoFuso(FUSO_PADRAO);
  const lista = esteticas ?? [];
  const situacoes = lista.map((item) => situacaoAssinatura(item.status_assinatura, item.assinatura_valida_ate, hoje));
  const pagantes = lista.filter((item, indice) => item.status_assinatura === "ativa" && situacoes[indice]?.ativa);
  const emTeste = lista.filter((item, indice) => item.status_assinatura === "trial" && situacoes[indice]?.ativa).length;
  const pendentes = situacoes.filter((situacao) => !situacao.ativa).length;
  const receita = pagantes.reduce((soma, item) => soma + Number(item.valor_mensal), 0);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-black/70 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
        <span className="flex items-center gap-3">
          <SimboloSynex className="w-8" />
          <span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-suave">Synex Auto</span>
            <span className="block text-sm font-semibold">Administração</span>
          </span>
        </span>
        <Link href="/painel" className="rounded-full border border-borda px-3.5 py-1.5 text-xs text-suave">
          Meu painel
        </Link>
      </header>

      <main className="grid grid-cols-1 gap-4 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <section className="grid grid-cols-3 gap-2">
          <div className="cartao p-3 text-center">
            <p className="texto-prata text-xl font-semibold tabular-nums">{formatarMoeda(receita).replace(",00", "")}</p>
            <p className="text-[11px] text-suave">por mês</p>
          </div>
          <div className="cartao p-3 text-center">
            <p className="text-xl font-semibold tabular-nums">{pagantes.length}</p>
            <p className="text-[11px] text-suave">pagantes · {emTeste} em teste</p>
          </div>
          <div className="cartao p-3 text-center">
            <p className={`text-xl font-semibold tabular-nums ${pendentes ? "text-alerta" : ""}`}>{pendentes}</p>
            <p className="text-[11px] text-suave">vencidas</p>
          </div>
        </section>

        <FormConvite />
        <ListaConvites convites={convites ?? []} appUrl={env.appUrl} />

        <h2 className="mt-2 text-base font-semibold">Estéticas</h2>
        {lista.length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-borda p-8 text-center text-sm text-suave">Nenhuma estética cadastrada.</p>
        ) : (
          <ul className="grid gap-3">
            {lista.map((item) => (
              <li key={item.id}>
                <CartaoEstetica estetica={item} hoje={hoje} appUrl={env.appUrl} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

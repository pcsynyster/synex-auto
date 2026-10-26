import Link from "next/link";
import { redirect } from "next/navigation";
import { sair } from "@/app/actions/auth";
import { AbasPainel } from "@/components/painel/abas";
import { SimboloSynex } from "@/components/ui/marca";
import { obterContexto } from "@/lib/sessao";
import { situacaoAssinatura, WHATSAPP_SYNEX } from "@/lib/assinatura";
import { hojeNoFuso } from "@/lib/datas";
import { linkWhatsapp } from "@/lib/telefone";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  const [{ count: pendentes }, { data: admin }] = await Promise.all([
    ctx.supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente")
      .gte("inicio", new Date().toISOString()),
    ctx.supabase.rpc("eh_admin"),
  ]);

  const situacao = situacaoAssinatura(ctx.tenant.status_assinatura, ctx.tenant.assinatura_valida_ate, hojeNoFuso(ctx.tenant.fuso));
  const avisoTeste = ctx.tenant.status_assinatura === "trial" && situacao.ativa && situacao.diasRestantes <= 5;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 grid gap-3 border-b border-white/[0.06] bg-black/70 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/painel" className="flex min-w-0 items-center gap-3">
            <SimboloSynex className="w-8 shrink-0" />
            <span className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-suave">Synex Auto</span>
              <span className="block truncate text-sm font-semibold">{ctx.tenant.nome}</span>
            </span>
          </Link>
          <span className="flex shrink-0 items-center gap-2">
            {admin === true && (
              <Link href="/admin" className="rounded-full bg-texto px-3.5 py-1.5 text-xs font-semibold text-fundo">
                Admin
              </Link>
            )}
            <form action={sair}>
              <button type="submit" className="rounded-full border border-borda px-3.5 py-1.5 text-xs text-suave transition-colors hover:text-texto">
                Sair
              </button>
            </form>
          </span>
        </div>
        <AbasPainel pendentes={pendentes ?? 0} />
      </header>
      {(!situacao.ativa || avisoTeste) && (
        <div className={`mx-4 mt-4 grid gap-2 rounded-2xl border p-4 ${situacao.ativa ? "border-borda bg-elevado/60" : "border-alerta/50 bg-alerta/10"}`}>
          <p className="text-sm font-semibold">
            {situacao.ativa
              ? `Seu teste grátis termina em ${situacao.diasRestantes === 0 ? "hoje" : `${situacao.diasRestantes} ${situacao.diasRestantes === 1 ? "dia" : "dias"}`}.`
              : "Sua assinatura está suspensa."}
          </p>
          <p className="text-xs text-suave">
            {situacao.ativa
              ? "Fale com a Synex para ativar a mensalidade e continuar usando sem interrupção."
              : "Você ainda consulta o pátio, mas não abre novas OS e a agenda online fica fechada para clientes. Regularize para voltar ao normal."}
          </p>
          <a
            href={linkWhatsapp(WHATSAPP_SYNEX, `Olá! Quero ${situacao.ativa ? "ativar" : "renovar"} a mensalidade da Synex Auto da ${ctx.tenant.nome}.`)}
            className="flex h-10 items-center justify-center rounded-full bg-texto text-sm font-semibold text-fundo"
          >
            Falar com a Synex
          </a>
        </div>
      )}
      <div className="flex-1 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}

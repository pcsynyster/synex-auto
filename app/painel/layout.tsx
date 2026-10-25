import Link from "next/link";
import { redirect } from "next/navigation";
import { sair } from "@/app/actions/auth";
import { SimboloSynex } from "@/components/ui/marca";
import { obterContexto } from "@/lib/sessao";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-black/70 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
        <Link href="/painel" className="flex min-w-0 items-center gap-3">
          <SimboloSynex className="w-8 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-suave">Synex Auto</span>
            <span className="block truncate text-sm font-semibold">{ctx.tenant.nome}</span>
          </span>
        </Link>
        <form action={sair}>
          <button type="submit" className="rounded-full border border-borda px-3.5 py-1.5 text-xs text-suave transition-colors hover:text-texto">
            Sair
          </button>
        </form>
      </header>
      <div className="flex-1 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}

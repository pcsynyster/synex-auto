import type { Metadata } from "next";
import { FormAcesso } from "@/components/painel/form-acesso";
import { LogoSynex } from "@/components/ui/marca";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-10 px-6 py-12">
      <div className="grid gap-8">
        <LogoSynex className="w-36" />
        <div className="grid gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-suave">Synex Auto</p>
          <h1 className="texto-prata text-[1.75rem] leading-[1.15] font-semibold">
            Entrada por placa, vistoria com foto e cliente avisado no WhatsApp.
          </h1>
        </div>
      </div>
      <FormAcesso voltar={voltar ?? "/painel"} />
      <p className="text-center text-xs text-suave">Synex Sistemas · Sistemas e soluções web sob medida</p>
    </main>
  );
}

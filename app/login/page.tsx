import type { Metadata } from "next";
import { FormAcesso } from "@/components/painel/form-acesso";
import { LogoSynex } from "@/components/ui/marca";
import { WHATSAPP_SYNEX } from "@/lib/assinatura";
import { linkWhatsapp } from "@/lib/telefone";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ voltar?: string; convite?: string }> }) {
  const { voltar, convite } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-10 px-6 py-12">
      <div className="grid gap-8">
        <LogoSynex className="w-36" />
        <div className="grid gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-suave">Agenda online</p>
          <h1 className="texto-prata text-[1.75rem] leading-[1.15] font-semibold">Agenda online para salões de unhas.</h1>
          <p className="text-sm leading-relaxed text-suave">
            Suas clientes marcam pelo link, cada profissional com a própria agenda, confirmação pelo WhatsApp e resumo do faturamento.
          </p>
        </div>
      </div>
      <FormAcesso voltar={voltar ?? "/painel"} convite={convite} />
      <p className="text-center text-xs text-suave">
        Quer usar no seu salão?{" "}
        <a
          href={linkWhatsapp(WHATSAPP_SYNEX, "Olá! Tenho um salão de unhas e quero conhecer a agenda online da Synex.")}
          className="text-texto underline underline-offset-4"
        >
          Fale com a Synex
        </a>
      </p>
    </main>
  );
}

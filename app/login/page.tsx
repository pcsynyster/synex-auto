import type { Metadata } from "next";
import { Brilhos } from "@/components/ui/brilhos";
import { FormAcesso } from "@/components/painel/form-acesso";
import { LogoSynex } from "@/components/ui/marca";
import { WHATSAPP_SYNEX } from "@/lib/assinatura";
import { linkWhatsapp } from "@/lib/telefone";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ voltar?: string; convite?: string }> }) {
  const { voltar, convite } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <div className="grid gap-6">
        <LogoSynex className="w-32" />
        <div className="destaque-hero grid gap-3 p-6">
          <Brilhos />
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">Agenda online</p>
          <h1 className="text-[2rem] leading-[1.08] font-semibold tracking-tight [text-shadow:0_4px_24px_rgba(120,0,70,0.35)]">Seu salão de unhas, lotado e organizado.</h1>
          <p className="text-sm leading-relaxed text-white/90">
            Suas clientes marcam pelo link, cada profissional com a própria agenda, confirmação pelo WhatsApp e resumo do faturamento.
          </p>
        </div>
      </div>
      <div className="cartao p-5">
        <FormAcesso voltar={voltar ?? "/painel"} convite={convite} />
      </div>
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

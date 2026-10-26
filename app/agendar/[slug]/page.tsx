import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgendarCliente } from "@/components/agenda/agendar-cliente";
import { RodapeSynex } from "@/components/ui/rodape-synex";
import { PADRAO_SLUG, type AgendaPublica } from "@/lib/agenda";
import { criarClienteAnonimo } from "@/lib/supabase/anon";
import { linkWhatsapp } from "@/lib/telefone";

export const dynamic = "force-dynamic";

async function carregarAgenda(slug: string): Promise<AgendaPublica | null> {
  if (!PADRAO_SLUG.test(slug)) return null;
  const { data } = await criarClienteAnonimo().rpc("agenda_publica", { p_slug: slug });
  return (data as AgendaPublica | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const agenda = await carregarAgenda((await params).slug);
  return { title: agenda ? `Agendar na ${agenda.nome}` : "Agenda" };
}

export default async function PaginaAgendar({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agenda = await carregarAgenda(slug);
  if (!agenda) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-suave">Agendamento online</p>
          <h1 className="mt-1 text-2xl leading-tight font-semibold">{agenda.nome}</h1>
          {agenda.cidade && <p className="mt-1 text-sm text-suave">{agenda.cidade}</p>}
        </div>
        <a
          href={linkWhatsapp(agenda.telefone)}
          className="shrink-0 rounded-full border border-borda bg-elevado/60 px-3.5 py-1.5 text-sm text-texto transition-colors hover:border-prata/60"
        >
          WhatsApp
        </a>
      </header>

      {agenda.servicos.length > 0 ? (
        <AgendarCliente slug={slug} agenda={agenda} />
      ) : (
        <p className="cartao p-6 text-center text-sm text-suave">Nenhum serviço disponível para agendamento no momento.</p>
      )}

      <RodapeSynex texto="Agenda por" />
    </main>
  );
}

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { AgendarCliente } from "@/components/agenda/agendar-cliente";
import { Brilhos } from "@/components/ui/brilhos";
import { RodapeSynex } from "@/components/ui/rodape-synex";
import { PADRAO_SLUG, type AgendaPublica } from "@/lib/agenda";
import { criarClienteAnonimo } from "@/lib/supabase/anon";
import { linkWhatsapp } from "@/lib/telefone";
import { imagensCompartilhamento, urlLogo } from "@/lib/logo";
import { LogoLoja } from "@/components/ui/logo-loja";

export const dynamic = "force-dynamic";

async function carregarAgenda(slug: string): Promise<AgendaPublica | null> {
  if (!PADRAO_SLUG.test(slug)) return null;
  const { data } = await criarClienteAnonimo().rpc("agenda_publica", { p_slug: slug });
  return (data as AgendaPublica | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const agenda = await carregarAgenda((await params).slug);
  if (!agenda) return { title: "Agenda" };
  const titulo = `Agende seu horário · ${agenda.nome}`;
  const descricao = `Escolha o serviço, o dia e o horário${agenda.cidade ? ` na ${agenda.nome}, ${agenda.cidade}` : ""}. Confirmação pelo WhatsApp.`;
  return {
    title: { absolute: titulo },
    description: descricao,
    openGraph: { title: titulo, description: descricao, siteName: agenda.nome, images: imagensCompartilhamento(agenda.slug, agenda.logo_versao, agenda.nome) },
  };
}

export default async function PaginaAgendar({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agenda = await carregarAgenda(slug);
  if (!agenda) {
    const atual = PADRAO_SLUG.test(slug) ? (await criarClienteAnonimo().rpc("slug_atual", { p_slug: slug })).data : null;
    if (atual) permanentRedirect(`/${atual}`);
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="destaque-hero grid gap-5 p-5">
        <Brilhos />
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-[1.15rem] bg-white/30 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.55),0_12px_30px_-8px_rgba(90,0,60,0.55)]">
            <LogoLoja url={urlLogo(agenda.slug, agenda.logo_versao)} nome={agenda.nome} />
          </div>
          <a
            href={linkWhatsapp(agenda.telefone)}
            className="shrink-0 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-medium text-white ring-1 ring-white/45 backdrop-blur transition-colors hover:bg-white/30"
          >
            WhatsApp
          </a>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">Agendamento online</p>
          <h1 className="mt-1.5 text-[2rem] leading-[1.05] font-semibold tracking-tight [text-shadow:0_2px_18px_rgba(120,0,70,0.35)]">{agenda.nome}</h1>
          {agenda.cidade && <p className="mt-1.5 text-sm text-white/85">{agenda.cidade}</p>}
        </div>
        <ul className="flex flex-wrap gap-2 text-xs font-medium">
          {["Marque em 1 minuto", "Confirmação no WhatsApp", ...(agenda.profissionais.length > 1 ? ["Escolha sua profissional"] : [])].map((item) => (
            <li key={item} className="rounded-full bg-white/20 px-3 py-1.5 ring-1 ring-white/40 backdrop-blur">
              {item}
            </li>
          ))}
        </ul>
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

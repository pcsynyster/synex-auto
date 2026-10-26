import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarOSPublica } from "@/lib/os-publica";
import { imagensCompartilhamento, urlLogo } from "@/lib/logo";
import { LogoLoja } from "@/components/ui/logo-loja";
import { formatarPlaca } from "@/lib/placa";
import { normalizarWhatsapp } from "@/lib/telefone";
import { gerarPixCopiaECola } from "@/lib/pix";
import { AcompanhamentoStatus } from "@/components/os/acompanhamento-status";
import { GaleriaVistoria } from "@/components/os/galeria-vistoria";
import { PagamentoPix } from "@/components/os/pagamento-pix";
import { ResumoServicos } from "@/components/os/resumo-servicos";
import { SimboloSynex } from "@/components/ui/marca";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const os = await buscarOSPublica((await params).token);
  if (!os) return { title: "Acompanhe seu veículo", robots: { index: false, follow: false } };
  const titulo = `${os.empresa.nome} · Acompanhe seu veículo`;
  const descricao = `Status do seu ${os.veiculo.modelo} (${formatarPlaca(os.veiculo.placa)}), fotos da vistoria e pagamento.`;
  return {
    title: { absolute: titulo },
    description: descricao,
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: descricao, siteName: os.empresa.nome, images: imagensCompartilhamento(os.empresa.slug, os.empresa.logoVersao, os.empresa.nome) },
  };
}

export default async function PaginaOSPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const os = await buscarOSPublica(token);

  if (!os) notFound();

  const pix =
    os.empresa.chavePix && os.valorTotal > 0
      ? gerarPixCopiaECola({
          chave: os.empresa.chavePix,
          recebedor: os.empresa.nome,
          cidade: os.empresa.cidade,
          valor: os.valorTotal,
          identificador: `OS${token.slice(0, 20)}`,
        })
      : null;

  const whatsappEmpresa = `https://wa.me/${normalizarWhatsapp(os.empresa.telefone) ?? os.empresa.telefone}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <LogoLoja url={urlLogo(os.empresa.slug, os.empresa.logoVersao)} nome={os.empresa.nome} />
          <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-suave">Acompanhamento</p>
          <h1 className="mt-0.5 text-xl font-semibold">{os.empresa.nome}</h1>
          </div>
        </div>
        <a
          href={whatsappEmpresa}
          className="shrink-0 rounded-full border border-borda bg-elevado/60 px-3.5 py-1.5 text-sm text-texto transition-colors hover:border-prata/60"
        >
          Falar com a loja
        </a>
      </header>

      <section className="cartao p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-texto px-2.5 py-1 font-mono text-base font-bold tracking-[0.18em] text-fundo">
            {formatarPlaca(os.veiculo.placa)}
          </span>
          <span className="truncate text-sm text-suave">{os.veiculo.modelo}</span>
        </div>
        <AcompanhamentoStatus
          token={token}
          inicial={{ status: os.status, atualizadoEm: os.atualizadoEm, prontoEm: os.prontoEm, entregueEm: os.entregueEm }}
        />
      </section>

      {os.fotos.length > 0 && <GaleriaVistoria fotos={os.fotos} registradaEm={os.criadoEm} />}

      <ResumoServicos servicos={os.servicos} total={os.valorTotal} />

      {pix && <PagamentoPix copiaECola={pix} valor={os.valorTotal} />}

      <footer className="mt-auto flex items-center justify-center gap-2 pt-6 text-xs text-suave">
        <span>Acompanhamento por</span>
        <SimboloSynex className="w-4" />
        <span className="font-semibold tracking-wide text-texto/80">Synex Sistemas</span>
      </footer>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bloqueios } from "@/components/agenda/bloqueios";
import { FormConfigAgenda } from "@/components/agenda/form-config";
import { ListaServicos } from "@/components/agenda/lista-servicos";
import { EnviarLogo } from "@/components/ui/enviar-logo";
import { FormPix } from "@/components/painel/form-pix";
import { urlLogo } from "@/lib/logo";
import { dataNoFuso, hojeNoFuso } from "@/lib/datas";
import { obterContexto } from "@/lib/sessao";
import type { ConfigAgenda } from "@/app/actions/agenda";

export const metadata: Metadata = { title: "Configurações da loja" };

const HORARIO_PADRAO = { abre: "08:00", fecha: "18:00", ativo: false };

export default async function PaginaConfigAgenda() {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  const [{ data: tenant }, { data: horarios }, { data: servicos }, { data: bloqueios }] = await Promise.all([
    ctx.supabase
      .from("tenants")
      .select("slug, logo_versao, agenda_ativa, confirmacao_automatica, intervalo_agenda_min, capacidade_simultanea, antecedencia_min_horas, janela_dias")
      .eq("id", ctx.tenantId)
      .single(),
    ctx.supabase.from("horarios_funcionamento").select("dia_semana, abre, fecha, ativo"),
    ctx.supabase.from("servicos").select("id, nome, duracao_min, preco, ativo").order("ordem").order("nome"),
    ctx.supabase.from("bloqueios_agenda").select("id, inicio, motivo").gte("fim", new Date().toISOString()).order("inicio"),
  ]);

  if (!tenant) redirect("/painel");

  const config: ConfigAgenda = {
    agenda_ativa: tenant.agenda_ativa,
    confirmacao_automatica: tenant.confirmacao_automatica,
    intervalo_agenda_min: tenant.intervalo_agenda_min as ConfigAgenda["intervalo_agenda_min"],
    capacidade_simultanea: tenant.capacidade_simultanea,
    antecedencia_min_horas: tenant.antecedencia_min_horas,
    janela_dias: tenant.janela_dias,
    horarios: Array.from({ length: 7 }, (_, dia) => {
      const item = horarios?.find((horario) => horario.dia_semana === dia);
      return {
        dia_semana: dia,
        ativo: item?.ativo ?? HORARIO_PADRAO.ativo,
        abre: (item?.abre ?? HORARIO_PADRAO.abre).slice(0, 5),
        fecha: (item?.fecha ?? HORARIO_PADRAO.fecha).slice(0, 5),
      };
    }),
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Configurações da loja</h1>
        <Link href="/painel/agenda" className="text-xs text-suave">
          Voltar
        </Link>
      </div>
      <section className="cartao p-4">
        <h2 className="mb-3 text-sm font-semibold">Logo da loja</h2>
        <EnviarLogo logoUrl={urlLogo(tenant.slug, tenant.logo_versao)} />
      </section>
      <section id="pix" className="cartao scroll-mt-40 p-4">
        <h2 className="text-sm font-semibold">Pix para pagamento</h2>
        <p className="mt-1 mb-3 text-xs text-suave">Vai na mensagem de carro pronto, com o valor do serviço, e no link do cliente com o Pix copia e cola.</p>
        <FormPix chave={ctx.tenant.chave_pix} titular={ctx.tenant.pix_titular} />
      </section>
      <FormConfigAgenda inicial={config} />
      <ListaServicos servicos={servicos ?? []} />
      <Bloqueios
        hoje={hojeNoFuso(ctx.tenant.fuso)}
        bloqueios={(bloqueios ?? []).map((item) => ({ id: item.id, data: dataNoFuso(item.inicio, ctx.tenant.fuso), motivo: item.motivo }))}
      />
    </div>
  );
}

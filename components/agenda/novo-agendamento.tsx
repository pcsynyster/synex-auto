"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { criarAgendamentoPainel, horariosPainel } from "@/app/actions/agenda";
import { Botao } from "@/components/ui/botao";
import { BotaoWhatsapp } from "@/components/ui/botao-whatsapp";
import { Campo } from "@/components/ui/campo";
import type { ProfissionalPublico, ServicoPublico } from "@/lib/agenda";
import { diaDoMes, formatarDuracao, horaNoFuso, rotuloDataLonga, rotuloDiaCurto, somarDias } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";

type Props = {
  servicos: ServicoPublico[];
  profissionais: ProfissionalPublico[];
  hoje: string;
  dataInicial: string;
  fuso: string;
};

const DIAS = 30;

export function NovoAgendamento({ servicos, profissionais, hoje, dataInicial, fuso }: Props) {
  const router = useRouter();
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "");
  const [profissionalId, setProfissionalId] = useState<string | null>(profissionais.length === 1 ? profissionais[0]!.id : null);
  const [data, setData] = useState(dataInicial);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [horario, setHorario] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<{ link?: string } | null>(null);
  const [carregando, iniciarCarga] = useTransition();
  const [enviando, iniciarEnvio] = useTransition();

  useEffect(() => {
    if (!servicoId) return;
    setHorario(null);
    setHorarios(null);
    iniciarCarga(async () => {
      const resultado = await horariosPainel(servicoId, data, profissionalId);
      if (resultado.ok) setHorarios(resultado.dados);
      else setErro(resultado.erro);
    });
  }, [servicoId, data, profissionalId]);

  const servico = servicos.find((item) => item.id === servicoId);

  function salvar(formData: FormData) {
    if (!horario) return setErro("Escolha um horário.");
    setErro(null);
    iniciarEnvio(async () => {
      const resultado = await criarAgendamentoPainel({
        servicoId,
        profissionalId,
        inicio: horario,
        nome: String(formData.get("nome") ?? ""),
        whatsapp: String(formData.get("whatsapp") ?? ""),
        observacoes: String(formData.get("observacoes") ?? ""),
      });
      if (!resultado.ok) return setErro(resultado.erro);
      setConcluido({ link: resultado.whatsapp });
    });
  }

  if (servicos.length === 0) {
    return <p className="rounded-[1.25rem] border border-dashed border-borda p-6 text-center text-sm text-suave">Cadastre seus serviços em Ajustes antes de agendar.</p>;
  }

  if (concluido) {
    return (
      <section className="cartao grid grid-cols-1 gap-3 p-5">
        <p className="texto-prata text-xl font-semibold">Horário marcado</p>
        <p className="text-sm text-suave">
          {servico?.nome} · {rotuloDataLonga(data)}, às {horario ? horaNoFuso(horario, fuso) : ""}
        </p>
        {concluido.link ? (
          <BotaoWhatsapp link={concluido.link} rotulo="Enviar confirmação no WhatsApp" />
        ) : (
          <p className="text-sm text-suave">A cliente recebeu a confirmação no WhatsApp.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Botao variante="secundario" type="button" onClick={() => window.location.reload()}>
            Marcar outro
          </Botao>
          <Botao type="button" onClick={() => router.push(`/painel/agenda${data !== hoje ? `?data=${data}` : ""}`)}>
            Ver agenda
          </Botao>
        </div>
      </section>
    );
  }

  return (
    <form action={salvar} className="grid grid-cols-1 gap-4">
      <section className="cartao grid grid-cols-1 gap-3 p-4">
        <h2 className="text-sm font-semibold">Serviço</h2>
        <div className="grid gap-2">
          {servicos.map((opcao) => {
            const ativo = opcao.id === servicoId;
            return (
              <button
                key={opcao.id}
                type="button"
                onClick={() => setServicoId(opcao.id)}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${ativo ? "border-rosa bg-rosa text-white" : "border-borda bg-elevado/50"}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{opcao.nome}</span>
                  <span className={`block text-xs ${ativo ? "text-white/60" : "text-suave"}`}>{formatarDuracao(opcao.duracao_min)}</span>
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold">{formatarMoeda(opcao.preco)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {profissionais.length > 1 && (
        <section className="cartao grid grid-cols-1 gap-3 p-4">
          <h2 className="text-sm font-semibold">Profissional</h2>
          <div className="grid grid-cols-2 gap-2">
            {[null, ...profissionais].map((opcao) => {
              const ativo = (opcao?.id ?? null) === profissionalId;
              return (
                <button
                  key={opcao?.id ?? "qualquer"}
                  type="button"
                  onClick={() => setProfissionalId(opcao?.id ?? null)}
                  className={`min-h-11 rounded-2xl border px-3 text-sm font-semibold ${ativo ? "border-rosa bg-rosa text-white" : "border-borda bg-elevado/50"} ${opcao ? "" : "col-span-2"}`}
                >
                  {opcao ? opcao.nome : "Primeira livre"}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="cartao grid grid-cols-1 gap-3 p-4">
        <h2 className="text-sm font-semibold">Dia e horário</h2>
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {Array.from({ length: DIAS }, (_, indice) => {
            const opcao = somarDias(hoje, indice);
            const ativo = opcao === data;
            return (
              <button
                key={opcao}
                type="button"
                onClick={() => setData(opcao)}
                className={`flex w-14 shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl border py-2.5 ${ativo ? "border-rosa bg-rosa text-white" : "border-borda bg-elevado/50"}`}
              >
                <span className={`text-[11px] ${ativo ? "text-white/60" : "text-suave"}`}>{opcao === hoje ? "Hoje" : rotuloDiaCurto(opcao)}</span>
                <span className="text-lg font-semibold">{diaDoMes(opcao)}</span>
              </button>
            );
          })}
        </div>
        {carregando || horarios === null ? (
          <div className="grid grid-cols-4 gap-2" aria-busy="true">
            {Array.from({ length: 8 }, (_, indice) => (
              <span key={indice} className="h-11 animate-pulse rounded-full bg-elevado" />
            ))}
          </div>
        ) : horarios.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-borda p-4 text-center text-sm text-suave">Sem horários livres neste dia.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {horarios.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setHorario(opcao)}
                className={`h-11 rounded-full border font-mono text-sm ${opcao === horario ? "border-rosa bg-rosa font-semibold text-white" : "border-borda bg-elevado/50"}`}
              >
                {horaNoFuso(opcao, fuso)}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="cartao grid grid-cols-1 gap-4 p-4">
        <h2 className="text-sm font-semibold">Cliente</h2>
        <Campo rotulo="Nome" name="nome" autoComplete="off" required />
        <Campo rotulo="WhatsApp" name="whatsapp" inputMode="tel" placeholder="(84) 99999-9999" required />
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-suave">Observações (opcional)</span>
          <textarea name="observacoes" rows={2} maxLength={300} className="rounded-2xl border border-borda bg-elevado px-4 py-3 text-base focus:border-prata focus:outline-none" />
        </label>
      </section>

      {erro && <p className="text-sm text-alerta">{erro}</p>}

      <Botao type="submit" disabled={enviando || !horario} className="h-14 text-base">
        {enviando ? "Salvando..." : horario ? `Marcar às ${horaNoFuso(horario, fuso)}` : "Escolha um horário"}
      </Botao>
    </form>
  );
}

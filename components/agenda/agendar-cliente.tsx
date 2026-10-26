"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { agendar, buscarHorarios } from "@/app/actions/agenda-publica";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import type { AgendaPublica, ServicoPublico } from "@/lib/agenda";
import { diaDaSemana, diaDoMes, formatarDuracao, horaNoFuso, rotuloDataLonga, rotuloDiaCurto, somarDias } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { normalizarPlaca } from "@/lib/placa";

function Etapa({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao grid grid-cols-1 gap-4 p-4">
      <h2 className="flex items-center gap-3 text-sm font-semibold">
        <span className="grid size-6 place-items-center rounded-full bg-texto text-xs text-fundo">{numero}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function AgendarCliente({ slug, agenda }: { slug: string; agenda: AgendaPublica }) {
  const router = useRouter();
  const [servico, setServico] = useState<ServicoPublico | null>(null);
  const [data, setData] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [horario, setHorario] = useState<string | null>(null);
  const [placa, setPlaca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, iniciarCarga] = useTransition();
  const [enviando, iniciarEnvio] = useTransition();
  const refHorarios = useRef<HTMLDivElement>(null);
  const refDados = useRef<HTMLDivElement>(null);

  const dias = useMemo(() => {
    const bloqueados = new Set(agenda.dias_bloqueados);
    const abertos = new Set(agenda.dias_abertos);
    return Array.from({ length: agenda.janela_dias + 1 }, (_, indice) => {
      const dia = somarDias(agenda.hoje, indice);
      return { dia, disponivel: abertos.has(diaDaSemana(dia)) && !bloqueados.has(dia) };
    });
  }, [agenda]);

  function carregarHorarios(servicoId: string, dia: string) {
    setHorarios(null);
    setHorario(null);
    setErro(null);
    iniciarCarga(async () => {
      const resultado = await buscarHorarios(slug, servicoId, dia);
      if (resultado.ok) setHorarios(resultado.dados);
      else setErro(resultado.erro);
    });
  }

  function escolherServico(opcao: ServicoPublico) {
    setServico(opcao);
    const dia = data ?? dias.find((item) => item.disponivel)?.dia ?? null;
    setData(dia);
    if (dia) carregarHorarios(opcao.id, dia);
  }

  function escolherDia(dia: string) {
    setData(dia);
    if (servico) carregarHorarios(servico.id, dia);
  }

  useEffect(() => {
    if (servico) refHorarios.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [servico]);

  useEffect(() => {
    if (horario) refDados.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [horario]);

  function enviar(formData: FormData) {
    if (!servico || !horario) return;
    setErro(null);
    iniciarEnvio(async () => {
      const resultado = await agendar({
        slug,
        servicoId: servico.id,
        inicio: horario,
        nome: String(formData.get("nome") ?? ""),
        whatsapp: String(formData.get("whatsapp") ?? ""),
        placa,
        modelo: String(formData.get("modelo") ?? ""),
        observacoes: String(formData.get("observacoes") ?? ""),
      });
      if (!resultado.ok) {
        setErro(resultado.erro);
        if (data) carregarHorarios(servico.id, data);
        return;
      }
      router.push(`/agendamento/${resultado.dados.token}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <Etapa numero={1} titulo="Escolha o serviço">
        <ul className="grid gap-2">
          {agenda.servicos.map((opcao) => {
            const ativo = servico?.id === opcao.id;
            return (
              <li key={opcao.id}>
                <button
                  type="button"
                  onClick={() => escolherServico(opcao)}
                  aria-pressed={ativo}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                    ativo ? "border-texto bg-texto text-fundo" : "border-borda bg-elevado/50 hover:border-prata/50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{opcao.nome}</span>
                    <span className={`block text-xs ${ativo ? "text-fundo/60" : "text-suave"}`}>
                      {formatarDuracao(opcao.duracao_min)}
                      {opcao.descricao ? ` · ${opcao.descricao}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold">{formatarMoeda(Number(opcao.preco))}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Etapa>

      {servico && (
        <div ref={refHorarios} className="scroll-mt-4">
          <Etapa numero={2} titulo="Dia e horário">
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {dias.map(({ dia, disponivel }) => {
                const ativo = dia === data;
                return (
                  <button
                    key={dia}
                    type="button"
                    disabled={!disponivel}
                    onClick={() => escolherDia(dia)}
                    className={`flex w-14 shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl border py-2.5 transition-colors disabled:opacity-30 ${
                      ativo ? "border-texto bg-texto text-fundo" : "border-borda bg-elevado/50"
                    }`}
                  >
                    <span className={`text-[11px] ${ativo ? "text-fundo/60" : "text-suave"}`}>{rotuloDiaCurto(dia)}</span>
                    <span className="text-lg font-semibold">{diaDoMes(dia)}</span>
                  </button>
                );
              })}
            </div>

            {data && <p className="text-sm text-suave">{rotuloDataLonga(data)}</p>}

            {carregando || horarios === null ? (
              <div className="grid grid-cols-4 gap-2" aria-busy="true">
                {Array.from({ length: 8 }, (_, indice) => (
                  <span key={indice} className="h-11 animate-pulse rounded-full bg-elevado" />
                ))}
              </div>
            ) : horarios.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-borda p-4 text-center text-sm text-suave">
                Sem horários livres neste dia. Tente outra data.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {horarios.map((opcao) => {
                  const ativo = opcao === horario;
                  return (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setHorario(opcao)}
                      className={`h-11 rounded-full border font-mono text-sm transition-colors ${
                        ativo ? "border-texto bg-texto font-semibold text-fundo" : "border-borda bg-elevado/50 hover:border-prata/50"
                      }`}
                    >
                      {horaNoFuso(opcao, agenda.fuso)}
                    </button>
                  );
                })}
              </div>
            )}
          </Etapa>
        </div>
      )}

      {servico && horario && data && (
        <div ref={refDados} className="scroll-mt-4">
          <Etapa numero={3} titulo="Seus dados">
            <div className="rounded-2xl border border-borda bg-black/40 px-4 py-3 text-sm">
              <p className="font-semibold">{servico.nome}</p>
              <p className="text-suave">
                {rotuloDataLonga(data)}, às {horaNoFuso(horario, agenda.fuso)} · {formatarMoeda(Number(servico.preco))}
              </p>
            </div>
            <form action={enviar} className="grid gap-4">
              <Campo rotulo="Nome" name="nome" autoComplete="name" required />
              <Campo rotulo="WhatsApp" name="whatsapp" inputMode="tel" autoComplete="tel" placeholder="(84) 99999-9999" required />
              <div className="grid grid-cols-2 gap-3">
                <Campo
                  rotulo="Placa (opcional)"
                  name="placa"
                  value={placa}
                  onChange={(evento) => setPlaca(normalizarPlaca(evento.target.value).slice(0, 7))}
                  autoCapitalize="characters"
                  placeholder="ABC1D23"
                  className="font-mono tracking-widest uppercase"
                />
                <Campo rotulo="Modelo (opcional)" name="modelo" placeholder="Onix, HB20..." />
              </div>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-suave">Observações (opcional)</span>
                <textarea
                  name="observacoes"
                  rows={2}
                  maxLength={300}
                  className="rounded-2xl border border-borda bg-elevado px-4 py-3 text-base focus:border-prata focus:outline-none"
                />
              </label>
              {erro && <p className="text-sm text-alerta">{erro}</p>}
              <Botao type="submit" disabled={enviando} className="h-14 text-base">
                {enviando ? "Agendando..." : "Confirmar agendamento"}
              </Botao>
            </form>
          </Etapa>
        </div>
      )}

      {erro && !horario && <p className="text-sm text-alerta">{erro}</p>}
    </div>
  );
}

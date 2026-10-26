"use client";

import { useState, useTransition } from "react";
import { salvarConfigAgenda, type ConfigAgenda } from "@/app/actions/agenda";
import { Botao } from "@/components/ui/botao";
import { nomeDiaSemana } from "@/lib/datas";

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const INTERVALOS = [15, 20, 30, 45, 60] as const;
const HORAS = Array.from({ length: 48 }, (_, indice) => `${String(Math.floor(indice / 2)).padStart(2, "0")}:${indice % 2 ? "30" : "00"}`);

function SeletorHora({ valor, aoMudar, rotulo }: { valor: string; aoMudar: (valor: string) => void; rotulo: string }) {
  const opcoes = HORAS.includes(valor) ? HORAS : [...HORAS, valor].sort();
  return (
    <select
      aria-label={rotulo}
      value={valor}
      onChange={(evento) => aoMudar(evento.target.value)}
      className="h-10 w-0 min-w-0 flex-1 appearance-none rounded-xl border border-borda bg-elevado px-1 text-center text-sm tabular-nums focus:border-prata focus:outline-none"
    >
      {opcoes.map((hora) => (
        <option key={hora} value={hora}>
          {hora}
        </option>
      ))}
    </select>
  );
}

function Interruptor({ ligado, aoMudar, rotulo }: { ligado: boolean; aoMudar: (valor: boolean) => void; rotulo: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => aoMudar(!ligado)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${ligado ? "bg-texto" : "bg-borda"}`}
    >
      <span className={`absolute top-1 size-5 rounded-full transition-all ${ligado ? "left-6 bg-fundo" : "left-1 bg-suave"}`} />
    </button>
  );
}

function Numero({ rotulo, valor, aoMudar, min, max, sufixo }: { rotulo: string; valor: number; aoMudar: (valor: number) => void; min: number; max: number; sufixo: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-suave">{rotulo}</span>
      <span className="flex h-12 items-center rounded-2xl border border-borda bg-elevado pr-4 focus-within:border-prata">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={valor}
          onChange={(evento) => aoMudar(Math.min(max, Math.max(min, Number(evento.target.value) || min)))}
          className="h-full w-full min-w-0 bg-transparent px-4 text-base focus:outline-none"
        />
        <span className="text-sm text-suave">{sufixo}</span>
      </span>
    </label>
  );
}

export function FormConfigAgenda({ inicial }: { inicial: ConfigAgenda }) {
  const [config, setConfig] = useState(inicial);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function alterar<K extends keyof ConfigAgenda>(chave: K, valor: ConfigAgenda[K]) {
    setConfig((atual) => ({ ...atual, [chave]: valor }));
    setMensagem(null);
  }

  function alterarDia(dia: number, campos: Partial<ConfigAgenda["horarios"][number]>) {
    setConfig((atual) => ({
      ...atual,
      horarios: atual.horarios.map((item) => (item.dia_semana === dia ? { ...item, ...campos } : item)),
    }));
    setMensagem(null);
  }

  function salvar() {
    iniciar(async () => {
      const resultado = await salvarConfigAgenda(config);
      setMensagem(resultado.ok ? { tipo: "ok", texto: "Agenda salva." } : { tipo: "erro", texto: resultado.erro });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <section className="cartao grid grid-cols-1 gap-4 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Agenda online</p>
            <p className="text-xs text-suave">Clientes marcam horário pelo link.</p>
          </div>
          <Interruptor rotulo="Agenda online" ligado={config.agenda_ativa} aoMudar={(valor) => alterar("agenda_ativa", valor)} />
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-borda pt-4">
          <div>
            <p className="text-sm font-semibold">Confirmar automaticamente</p>
            <p className="text-xs text-suave">Desligado, cada pedido espera você confirmar.</p>
          </div>
          <Interruptor
            rotulo="Confirmar automaticamente"
            ligado={config.confirmacao_automatica}
            aoMudar={(valor) => alterar("confirmacao_automatica", valor)}
          />
        </div>
      </section>

      <section className="cartao grid grid-cols-1 gap-3 p-4">
        <h2 className="text-sm font-semibold">Horário de funcionamento</h2>
        <ul className="grid grid-cols-1 gap-2">
          {ORDEM_DIAS.map((dia) => {
            const item = config.horarios.find((horario) => horario.dia_semana === dia);
            if (!item) return null;
            return (
              <li key={dia} className="flex items-center gap-3">
                <Interruptor rotulo={nomeDiaSemana(dia)} ligado={item.ativo} aoMudar={(valor) => alterarDia(dia, { ativo: valor })} />
                <span className={`w-9 shrink-0 text-sm ${item.ativo ? "" : "text-suave"}`}>{nomeDiaSemana(dia).slice(0, 3)}</span>
                {item.ativo ? (
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <SeletorHora rotulo={`Abertura ${nomeDiaSemana(dia)}`} valor={item.abre} aoMudar={(valor) => alterarDia(dia, { abre: valor })} />
                    <span className="text-xs text-suave">às</span>
                    <SeletorHora rotulo={`Fechamento ${nomeDiaSemana(dia)}`} valor={item.fecha} aoMudar={(valor) => alterarDia(dia, { fecha: valor })} />
                  </span>
                ) : (
                  <span className="flex-1 text-sm text-suave">Fechado</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="cartao grid grid-cols-1 gap-4 p-4">
        <h2 className="text-sm font-semibold">Regras dos horários</h2>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-suave">Intervalo entre horários</span>
          <div className="grid grid-cols-5 gap-2">
            {INTERVALOS.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => alterar("intervalo_agenda_min", opcao)}
                className={`h-10 rounded-full border text-sm transition-colors ${
                  config.intervalo_agenda_min === opcao ? "border-texto bg-texto font-semibold text-fundo" : "border-borda text-suave"
                }`}
              >
                {opcao}
              </button>
            ))}
          </div>
          <span className="text-xs text-suave">Em minutos. Com 30, o cliente vê 08:00, 08:30, 09:00...</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Numero
            rotulo="Carros ao mesmo tempo"
            valor={config.capacidade_simultanea}
            aoMudar={(valor) => alterar("capacidade_simultanea", valor)}
            min={1}
            max={20}
            sufixo="vagas"
          />
          <Numero
            rotulo="Antecedência mínima"
            valor={config.antecedencia_min_horas}
            aoMudar={(valor) => alterar("antecedencia_min_horas", valor)}
            min={0}
            max={72}
            sufixo="h"
          />
        </div>
        <Numero
          rotulo="Clientes podem marcar até quantos dias à frente"
          valor={config.janela_dias}
          aoMudar={(valor) => alterar("janela_dias", valor)}
          min={1}
          max={60}
          sufixo="dias"
        />
      </section>

      {mensagem && <p className={`text-sm ${mensagem.tipo === "ok" ? "text-texto" : "text-alerta"}`}>{mensagem.texto}</p>}
      <Botao type="button" onClick={salvar} disabled={pendente} className="h-14 text-base">
        {pendente ? "Salvando..." : "Salvar horários"}
      </Botao>
    </div>
  );
}

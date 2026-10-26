"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { registrarEntradaPorPlaca, type EntradaPorPlaca } from "@/app/actions/veiculos";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { FormOrdem } from "@/components/painel/form-ordem";
import { formatarPlaca, normalizarPlaca } from "@/lib/placa";
import { CATEGORIAS_VEICULO, type CategoriaVeiculo } from "@/types/database.types";

type VeiculoCarregado = Extract<EntradaPorPlaca, { situacao: "existente" | "criado" }>["veiculo"];

export type PreenchimentoEntrada = {
  agendamentoId: string;
  placa: string;
  nome: string;
  whatsapp: string;
  modelo: string;
  servico: { nome: string; valor: number };
};

const ROTULO_CATEGORIA: Record<CategoriaVeiculo, string> = {
  hatch: "Hatch",
  sedan: "Sedan",
  suv: "SUV",
  pickup: "Pickup",
};

export function NovaEntrada({ preenchimento }: { preenchimento?: PreenchimentoEntrada }) {
  const [placa, setPlaca] = useState(preenchimento?.placa ?? "");
  const [cadastro, setCadastro] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaVeiculo>("hatch");
  const [veiculo, setVeiculo] = useState<VeiculoCarregado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function processar(formData: FormData) {
    setErro(null);
    iniciar(async () => {
      const resultado = await registrarEntradaPorPlaca({
        placa,
        clienteNome: cadastro ? String(formData.get("cliente_nome") ?? "") : undefined,
        whatsapp: cadastro ? String(formData.get("whatsapp") ?? "") : undefined,
        modelo: cadastro ? String(formData.get("modelo") ?? "") : undefined,
        categoria: cadastro ? categoria : undefined,
      });

      if (!resultado.ok) return setErro(resultado.erro);
      if (resultado.dados.situacao === "cadastro_necessario") return setCadastro(true);
      setVeiculo(resultado.dados.veiculo);
    });
  }

  if (veiculo) {
    return (
      <div className="grid gap-4">
        <section className="cartao p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="rounded-md bg-texto px-2.5 py-1 font-mono text-lg font-bold tracking-[0.18em] text-fundo">{formatarPlaca(veiculo.placa)}</p>
            <button type="button" onClick={() => setVeiculo(null)} className="text-xs text-suave underline underline-offset-4">
              Trocar
            </button>
          </div>
          <p className="mt-1 text-sm text-suave">
            {veiculo.modelo} · {veiculo.cliente.nome}
          </p>
          {veiculo.planoAtivo && (
            <p className="mt-3 rounded-2xl border border-borda bg-elevado px-3 py-2 text-xs text-texto">
              {veiculo.planoAtivo.nome_plano}: {veiculo.planoAtivo.creditos_restantes} de {veiculo.planoAtivo.total_creditos} lavagens
              restantes
            </p>
          )}
        </section>
        <FormOrdem
          veiculoId={veiculo.id}
          temPlano={veiculo.planoAtivo !== null}
          agendamentoId={preenchimento?.agendamentoId}
          servicosIniciais={preenchimento && veiculo.planoAtivo === null ? [preenchimento.servico] : []}
        />
      </div>
    );
  }

  return (
    <form action={processar} className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Entrada por placa</h1>
        <Link href="/painel" className="text-xs text-suave">
          Voltar
        </Link>
      </div>

      {preenchimento && (
        <p className="rounded-2xl border border-borda bg-elevado/60 px-4 py-3 text-sm">
          Agendamento de <strong className="font-semibold">{preenchimento.nome}</strong> · {preenchimento.servico.nome}
          {!preenchimento.placa && <span className="block text-xs text-suave">O cliente não informou a placa. Digite abaixo.</span>}
        </p>
      )}

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-suave">Placa</span>
        <input
          value={placa}
          onChange={(evento) => {
            setPlaca(normalizarPlaca(evento.target.value).slice(0, 7));
            setCadastro(false);
          }}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          inputMode="text"
          placeholder="ABC1D23"
          className="h-20 w-full min-w-0 rounded-[1.25rem] border-2 border-borda bg-texto text-center font-mono text-4xl font-bold tracking-[0.25em] text-fundo uppercase placeholder:text-fundo/20 focus:border-prata focus:outline-none"
          required
        />
      </label>

      {cadastro && (
        <section className="cartao grid grid-cols-1 gap-4 p-4">
          <p className="text-sm">Placa nova. Cadastre o cliente e o veículo.</p>
          <Campo rotulo="Nome do cliente" name="cliente_nome" autoComplete="off" defaultValue={preenchimento?.nome} required />
          <Campo rotulo="WhatsApp do cliente" name="whatsapp" inputMode="tel" placeholder="(84) 99999-9999" defaultValue={preenchimento?.whatsapp} required />
          <Campo rotulo="Modelo" name="modelo" placeholder="Onix, Compass, Hilux..." autoComplete="off" defaultValue={preenchimento?.modelo} required />
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-suave">Categoria</span>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIAS_VEICULO.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setCategoria(opcao)}
                  className={`h-11 rounded-full border text-sm transition-colors ${
                    categoria === opcao ? "border-texto bg-texto font-semibold text-fundo" : "border-borda text-suave"
                  }`}
                >
                  {ROTULO_CATEGORIA[opcao]}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {erro && <p className="text-sm text-alerta">{erro}</p>}

      <Botao type="submit" disabled={pendente || placa.length !== 7}>
        {pendente ? "Buscando..." : cadastro ? "Cadastrar e continuar" : "Buscar placa"}
      </Botao>
    </form>
  );
}

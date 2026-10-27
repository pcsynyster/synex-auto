"use client";

import { useState, useTransition } from "react";
import { editarVeiculoCliente } from "@/app/actions/editar";
import { Campo } from "@/components/ui/campo";
import { normalizarPlaca } from "@/lib/placa";
import { CATEGORIAS_VEICULO, type CategoriaVeiculo } from "@/types/database.types";

const ROTULO_CATEGORIA: Record<CategoriaVeiculo, string> = { hatch: "Hatch", sedan: "Sedan", suv: "SUV", pickup: "Pickup" };

type Props = {
  veiculoId: string;
  placa: string;
  modelo: string;
  categoria: CategoriaVeiculo;
  nome: string;
  whatsapp: string;
};

export function EditarVeiculo(props: Props) {
  const [aberto, setAberto] = useState(false);
  const [placa, setPlaca] = useState(props.placa);
  const [categoria, setCategoria] = useState<CategoriaVeiculo>(props.categoria);
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    iniciar(async () => {
      const resultado = await editarVeiculoCliente({
        veiculoId: props.veiculoId,
        placa,
        modelo: String(formData.get("modelo") ?? ""),
        categoria,
        nome: String(formData.get("nome") ?? ""),
        whatsapp: String(formData.get("whatsapp") ?? ""),
      });
      if (!resultado.ok) return setMensagem({ ok: false, texto: resultado.erro });
      setMensagem({ ok: true, texto: "Dados do veículo e do cliente atualizados." });
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <div className="grid gap-2">
        {mensagem && <p className={`text-xs ${mensagem.ok ? "text-texto" : "text-alerta"}`}>{mensagem.texto}</p>}
        <button type="button" onClick={() => setAberto(true)} className="h-11 rounded-full border border-borda text-sm">
          Editar veículo e cliente
        </button>
      </div>
    );
  }

  return (
    <form action={salvar} className="cartao grid grid-cols-1 gap-4 p-4">
      <h2 className="text-sm font-semibold">Veículo e cliente</h2>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-suave">Placa</span>
        <input
          value={placa}
          onChange={(evento) => setPlaca(normalizarPlaca(evento.target.value).slice(0, 7))}
          autoCapitalize="characters"
          className="h-12 w-full min-w-0 rounded-2xl border border-borda bg-texto text-center font-mono text-xl font-bold tracking-[0.25em] text-fundo uppercase focus:border-prata focus:outline-none"
          required
        />
      </label>
      <Campo rotulo="Modelo" name="modelo" defaultValue={props.modelo} required />
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-suave">Categoria</span>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIAS_VEICULO.map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setCategoria(opcao)}
              className={`h-11 rounded-full border text-sm ${categoria === opcao ? "border-texto bg-texto font-semibold text-fundo" : "border-borda text-suave"}`}
            >
              {ROTULO_CATEGORIA[opcao]}
            </button>
          ))}
        </div>
      </div>
      <Campo rotulo="Nome do cliente" name="nome" defaultValue={props.nome} required />
      <Campo rotulo="WhatsApp do cliente" name="whatsapp" inputMode="tel" defaultValue={props.whatsapp} required />
      {mensagem && <p className="text-xs text-alerta">{mensagem.texto}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAberto(false)} className="h-11 rounded-full border border-borda text-sm">
          Cancelar
        </button>
        <button type="submit" disabled={pendente} className="h-11 rounded-full bg-texto text-sm font-semibold text-fundo disabled:opacity-50">
          {pendente ? "Salvando..." : "Salvar dados"}
        </button>
      </div>
    </form>
  );
}

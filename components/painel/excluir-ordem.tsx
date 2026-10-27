"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { excluirOrdemServico } from "@/app/actions/editar";

export function ExcluirOrdem({ osId, placa }: { osId: string; placa: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function excluir() {
    setErro(null);
    iniciar(async () => {
      const resultado = await excluirOrdemServico(osId);
      if (!resultado.ok) return setErro(resultado.erro);
      router.replace("/painel");
      router.refresh();
    });
  }

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="h-11 rounded-full border border-alerta/40 text-sm text-alerta">
        Excluir esta OS
      </button>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-3 rounded-[1.25rem] border border-alerta/50 bg-alerta/10 p-4">
      <p className="text-sm font-semibold">Excluir a OS do {placa}?</p>
      <p className="text-xs text-suave">
        As fotos e os serviços desta OS somem e o link do cliente para de funcionar. O cliente e o veículo continuam cadastrados. Se usou crédito do plano, o crédito volta.
        Não dá para desfazer.
      </p>
      {erro && <p className="text-xs text-alerta">{erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setConfirmando(false)} className="h-11 rounded-full border border-borda text-sm">
          Voltar
        </button>
        <button type="button" onClick={excluir} disabled={pendente} className="h-11 rounded-full bg-alerta text-sm font-semibold text-fundo disabled:opacity-50">
          {pendente ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </section>
  );
}

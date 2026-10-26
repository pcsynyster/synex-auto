"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelarAgendamentoCliente } from "@/app/actions/agenda-publica";

export function CancelarAgendamento({ token }: { token: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function cancelar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await cancelarAgendamentoCliente(token);
      if (!resultado.ok) return setErro(resultado.erro);
      router.refresh();
    });
  }

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="h-12 rounded-full text-sm text-suave underline-offset-4 hover:underline">
        Cancelar agendamento
      </button>
    );
  }

  return (
    <div className="cartao grid grid-cols-1 gap-3 p-4">
      <p className="text-sm">Cancelar este horário? Ele fica livre para outra pessoa.</p>
      {erro && <p className="text-sm text-alerta">{erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setConfirmando(false)} className="h-11 rounded-full border border-borda text-sm">
          Manter
        </button>
        <button type="button" onClick={cancelar} disabled={pendente} className="h-11 rounded-full bg-texto text-sm font-semibold text-fundo disabled:opacity-50">
          {pendente ? "Cancelando..." : "Sim, cancelar"}
        </button>
      </div>
    </div>
  );
}

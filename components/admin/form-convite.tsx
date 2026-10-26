"use client";

import { useState, useTransition } from "react";
import { convidarEstetica } from "@/app/actions/admin";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";

export function FormConvite() {
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [chave, setChave] = useState(0);
  const [pendente, iniciar] = useTransition();

  function enviar(formData: FormData) {
    setErro(null);
    setOk(null);
    const email = String(formData.get("email") ?? "");
    iniciar(async () => {
      const resultado = await convidarEstetica({
        email,
        nomeEmpresa: String(formData.get("nome_empresa") ?? ""),
        diasTeste: Number(formData.get("dias_teste") ?? 14),
        valorMensal: Number(String(formData.get("valor_mensal") ?? "149").replace(",", ".")),
      });
      if (!resultado.ok) return setErro(resultado.erro);
      setOk(`Convite criado para ${email.trim().toLowerCase()}. Envie o link abaixo.`);
      setChave((atual) => atual + 1);
    });
  }

  return (
    <section className="cartao grid grid-cols-1 gap-4 p-4">
      <div>
        <h2 className="text-sm font-semibold">Autorizar nova estética</h2>
        <p className="text-xs text-suave">Só e-mails autorizados aqui conseguem criar conta.</p>
      </div>
      <form key={chave} action={enviar} className="grid grid-cols-1 gap-3">
        <Campo rotulo="E-mail do dono" name="email" type="email" autoComplete="off" required />
        <Campo rotulo="Nome da estética (opcional)" name="nome_empresa" autoComplete="off" />
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Dias de teste" name="dias_teste" type="number" min={0} max={90} defaultValue={14} inputMode="numeric" />
          <Campo rotulo="Mensalidade (R$)" name="valor_mensal" defaultValue="149" inputMode="decimal" />
        </div>
        {erro && <p className="text-sm text-alerta">{erro}</p>}
        {ok && <p className="text-sm text-texto">{ok}</p>}
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Autorizando..." : "Autorizar e gerar convite"}
        </Botao>
      </form>
    </section>
  );
}

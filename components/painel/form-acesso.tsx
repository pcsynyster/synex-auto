"use client";

import { useActionState, useState } from "react";
import { cadastrar, entrar, type EstadoAuth } from "@/app/actions/auth";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";

type Modo = "entrar" | "cadastrar";

function FormModo({ modo, voltar }: { modo: Modo; voltar: string }) {
  const [estado, acao, pendente] = useActionState<EstadoAuth, FormData>(modo === "entrar" ? entrar : cadastrar, {});

  return (
    <form action={acao} className="grid gap-4">
      <input type="hidden" name="voltar" value={voltar} />
      {modo === "cadastrar" && (
        <>
          <Campo rotulo="Seu nome" name="nome" autoComplete="name" required />
          <Campo rotulo="Nome da estética" name="nome_empresa" autoComplete="organization" required />
          <Campo rotulo="WhatsApp da loja" name="telefone" inputMode="tel" placeholder="(84) 99999-9999" required />
          <Campo rotulo="Cidade" name="cidade" autoComplete="address-level2" required />
        </>
      )}
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
      <Campo
        rotulo="Senha"
        name="senha"
        type="password"
        minLength={8}
        autoComplete={modo === "entrar" ? "current-password" : "new-password"}
        required
      />

      {estado.erro && <p className="text-sm text-alerta">{estado.erro}</p>}
      {estado.mensagem && <p className="text-sm text-texto">{estado.mensagem}</p>}

      <Botao type="submit" disabled={pendente}>
        {pendente ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta e testar grátis"}
      </Botao>
    </form>
  );
}

export function FormAcesso({ voltar }: { voltar: string }) {
  const [modo, setModo] = useState<Modo>("entrar");

  return (
    <div className="grid gap-4">
      <FormModo key={modo} modo={modo} voltar={voltar} />
      <button
        type="button"
        onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")}
        className="text-sm text-suave underline-offset-4 hover:underline"
      >
        {modo === "entrar" ? "Ainda não tem conta? Teste 14 dias grátis" : "Já tenho conta"}
      </button>
    </div>
  );
}

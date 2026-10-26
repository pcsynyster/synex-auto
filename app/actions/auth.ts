"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { normalizarWhatsapp } from "@/lib/telefone";

export type EstadoAuth = { erro?: string; mensagem?: string };

const esquemaEntrar = z.object({
  email: z.email().transform((valor) => valor.trim().toLowerCase()),
  senha: z.string().min(8),
});

const esquemaCadastro = esquemaEntrar.extend({
  nome: z.string().trim().min(2).max(80),
  nomeEmpresa: z.string().trim().min(2).max(120),
  telefone: z.string().transform(normalizarWhatsapp).refine((valor): valor is string => valor !== null, "Telefone inválido"),
  cidade: z.string().trim().min(2).max(60),
});

function gerarSlug(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "empresa"}-${crypto.randomUUID().slice(0, 6)}`;
}

function destinoSeguro(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" && valor.startsWith("/") && !valor.startsWith("//") ? valor : "/painel";
}

export async function entrar(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const validacao = esquemaEntrar.safeParse({ email: formData.get("email"), senha: formData.get("senha") });
  if (!validacao.success) return { erro: "Informe e-mail e senha válidos." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: validacao.data.email,
    password: validacao.data.senha,
  });
  if (error) {
    if (/not confirmed/i.test(error.message)) {
      return { erro: "Seu e-mail ainda não foi confirmado. Abra o e-mail de confirmação que enviamos ou fale com a Synex." };
    }
    return { erro: "E-mail ou senha incorretos." };
  }

  redirect(destinoSeguro(formData.get("voltar")));
}

export async function cadastrar(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const validacao = esquemaCadastro.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
    nome: formData.get("nome"),
    nomeEmpresa: formData.get("nome_empresa"),
    telefone: formData.get("telefone"),
    cidade: formData.get("cidade"),
  });
  if (!validacao.success) return { erro: validacao.error.issues[0]?.message ?? "Confira os dados." };

  const { email, senha, nome, nomeEmpresa, telefone, cidade } = validacao.data;
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, nome_empresa: nomeEmpresa, telefone, cidade, slug: gerarSlug(nomeEmpresa) },
    },
  });

  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { erro: "Esse e-mail já tem conta. Use Entrar." };
    if (/database error/i.test(error.message)) {
      return { erro: "Esse e-mail não tem convite ativo. Use o mesmo e-mail que você passou para a Synex." };
    }
    return { erro: "Não foi possível criar a conta. Tente novamente." };
  }
  if (!data.session) return { mensagem: "Conta criada! Enviamos um e-mail de confirmação. Abra o link (veja também o spam) e depois entre aqui." };

  redirect("/painel");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

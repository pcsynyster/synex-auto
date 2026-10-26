"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusAssinatura } from "@/types/database.types";

async function clienteAdmin() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("eh_admin");
  return data === true ? supabase : null;
}

const esquemaConvite = z.object({
  email: z.email("E-mail inválido.").transform((valor) => valor.trim().toLowerCase()),
  nomeEmpresa: z.string().trim().max(120).optional(),
  diasTeste: z.number().int().min(0).max(90),
  valorMensal: z.number().min(0).max(100000),
});

export type DadosConvite = z.input<typeof esquemaConvite>;

export async function convidarEstetica(dados: DadosConvite): Promise<Resultado<null>> {
  const supabase = await clienteAdmin();
  if (!supabase) return falha("Acesso restrito.");

  const validacao = esquemaConvite.safeParse(dados);
  if (!validacao.success) return falha(validacao.error.issues[0]?.message ?? "Confira os dados.");

  const { email, nomeEmpresa, diasTeste, valorMensal } = validacao.data;
  const { error } = await supabase.from("convites").insert({
    email,
    nome_empresa: nomeEmpresa || null,
    dias_teste: diasTeste,
    valor_mensal: valorMensal,
  });

  if (error?.code === "23505") return falha("Esse e-mail já foi convidado.");
  if (error) return falha("Não foi possível criar o convite.");

  revalidatePath("/admin");
  return sucesso(null);
}

export async function removerConvite(email: string): Promise<Resultado<null>> {
  const supabase = await clienteAdmin();
  if (!supabase) return falha("Acesso restrito.");

  const { error } = await supabase.from("convites").delete().eq("email", email).is("usado_em", null);
  if (error) return falha("Não foi possível remover o convite.");

  revalidatePath("/admin");
  return sucesso(null);
}

export async function registrarPagamento(tenantId: string, dias: number): Promise<Resultado<null>> {
  const supabase = await clienteAdmin();
  if (!supabase) return falha("Acesso restrito.");
  if (!z.uuid().safeParse(tenantId).success || !Number.isInteger(dias) || dias < 1 || dias > 400) return falha("Dados inválidos.");

  const { error } = await supabase.rpc("admin_registrar_pagamento", { p_tenant: tenantId, p_dias: dias });
  if (error) return falha("Não foi possível registrar o pagamento.");

  revalidatePath("/admin");
  return sucesso(null);
}

const STATUS_PERMITIDOS: StatusAssinatura[] = ["ativa", "inadimplente", "cancelada", "trial"];

export async function definirStatusAssinatura(tenantId: string, status: StatusAssinatura, valor?: number): Promise<Resultado<null>> {
  const supabase = await clienteAdmin();
  if (!supabase) return falha("Acesso restrito.");
  if (!z.uuid().safeParse(tenantId).success || !STATUS_PERMITIDOS.includes(status)) return falha("Dados inválidos.");
  if (valor !== undefined && (!Number.isFinite(valor) || valor < 0)) return falha("Valor inválido.");

  const { error } = await supabase.rpc("admin_definir_status", { p_tenant: tenantId, p_status: status, p_valor: valor ?? null });
  if (error) return falha("Não foi possível atualizar a assinatura.");

  revalidatePath("/admin");
  return sucesso(null);
}

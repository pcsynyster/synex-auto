"use server";

import { z } from "zod";
import { obterContexto } from "@/lib/sessao";
import { normalizarPlaca, placaValida } from "@/lib/placa";
import { normalizarWhatsapp } from "@/lib/telefone";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { CATEGORIAS_VEICULO, type Cliente, type PlanoAssinatura, type Veiculo } from "@/types/database.types";

const SELECT_VEICULO = "*, clientes(*)";

type VeiculoComCliente = Veiculo & { cliente: Cliente; planoAtivo: PlanoAssinatura | null };

export type EntradaPorPlaca =
  | { situacao: "existente"; veiculo: VeiculoComCliente }
  | { situacao: "criado"; veiculo: VeiculoComCliente }
  | { situacao: "cadastro_necessario"; placa: string };

const esquemaEntrada = z.object({
  placa: z.string().transform(normalizarPlaca).refine(placaValida, "Placa inválida"),
  clienteNome: z.string().trim().min(2).max(120).optional(),
  whatsapp: z
    .string()
    .transform((valor) => normalizarWhatsapp(valor))
    .refine((valor): valor is string => valor !== null, "WhatsApp inválido")
    .optional(),
  modelo: z.string().trim().min(1).max(80).optional(),
  categoria: z.enum(CATEGORIAS_VEICULO).optional(),
});

export type DadosEntradaPorPlaca = z.input<typeof esquemaEntrada>;

type Contexto = NonNullable<Awaited<ReturnType<typeof obterContexto>>>;

async function carregarVeiculo(ctx: Contexto, placa: string): Promise<VeiculoComCliente | null> {
  const { data } = await ctx.supabase.from("veiculos").select(SELECT_VEICULO).eq("placa", placa).maybeSingle();
  if (!data?.clientes) return null;

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: plano } = await ctx.supabase
    .from("planos_assinaturas")
    .select("*")
    .eq("cliente_id", data.cliente_id)
    .eq("status", "ativo")
    .gt("creditos_restantes", 0)
    .gte("validade", hoje)
    .order("validade", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { clientes, ...veiculo } = data;
  return { ...veiculo, cliente: clientes, planoAtivo: plano ?? null };
}

async function obterOuCriarCliente(ctx: Contexto, nome: string, whatsapp: string): Promise<Cliente | null> {
  const { data: existente } = await ctx.supabase.from("clientes").select("*").eq("whatsapp", whatsapp).maybeSingle();
  if (existente) return existente;

  const { data: criado, error } = await ctx.supabase
    .from("clientes")
    .insert({ tenant_id: ctx.tenantId, nome, whatsapp })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data } = await ctx.supabase.from("clientes").select("*").eq("whatsapp", whatsapp).single();
    return data;
  }

  return criado;
}

export async function buscarVeiculoPorPlaca(placaBruta: string): Promise<Resultado<VeiculoComCliente | null>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");

  const placa = normalizarPlaca(placaBruta);
  if (!placaValida(placa)) return falha("Placa inválida.");

  return sucesso(await carregarVeiculo(ctx, placa));
}

export async function registrarEntradaPorPlaca(dados: DadosEntradaPorPlaca): Promise<Resultado<EntradaPorPlaca>> {
  const ctx = await obterContexto();
  if (!ctx) return falha("Sessão expirada. Entre novamente.");

  const validacao = esquemaEntrada.safeParse(dados);
  if (!validacao.success) return falha(validacao.error.issues[0]?.message ?? "Dados inválidos.");

  const { placa, clienteNome, whatsapp, modelo, categoria } = validacao.data;

  const existente = await carregarVeiculo(ctx, placa);
  if (existente) return sucesso({ situacao: "existente", veiculo: existente });

  if (!clienteNome || !whatsapp || !modelo || !categoria) {
    return sucesso({ situacao: "cadastro_necessario", placa });
  }

  const cliente = await obterOuCriarCliente(ctx, clienteNome, whatsapp);
  if (!cliente) return falha("Não foi possível cadastrar o cliente.");

  const { error } = await ctx.supabase
    .from("veiculos")
    .insert({ tenant_id: ctx.tenantId, cliente_id: cliente.id, placa, modelo, categoria });

  if (error && error.code !== "23505") return falha("Não foi possível cadastrar o veículo.");

  const veiculo = await carregarVeiculo(ctx, placa);
  if (!veiculo) return falha("Não foi possível carregar o veículo.");

  return sucesso({ situacao: error ? "existente" : "criado", veiculo });
}

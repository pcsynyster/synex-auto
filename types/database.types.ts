export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          nome: string;
          telefone: string;
          slug: string;
          cidade: string | null;
          chave_pix: string | null;
          pix_titular: string | null;
          status_assinatura: Database["public"]["Enums"]["status_assinatura_tenant"];
          assinatura_valida_ate: string;
          fuso: string;
          agenda_ativa: boolean;
          confirmacao_automatica: boolean;
          intervalo_agenda_min: number;
          capacidade_simultanea: number;
          antecedencia_min_horas: number;
          janela_dias: number;
          valor_mensal: number;
          logo_versao: number | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          telefone: string;
          slug: string;
          cidade?: string | null;
          chave_pix?: string | null;
          pix_titular?: string | null;
          status_assinatura?: Database["public"]["Enums"]["status_assinatura_tenant"];
          assinatura_valida_ate?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          nome?: string;
          telefone?: string;
          cidade?: string | null;
          chave_pix?: string | null;
          pix_titular?: string | null;
          agenda_ativa?: boolean;
          confirmacao_automatica?: boolean;
          intervalo_agenda_min?: number;
          capacidade_simultanea?: number;
          antecedencia_min_horas?: number;
          janela_dias?: number;
        };
        Relationships: [];
      };
      perfis: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          papel: Database["public"]["Enums"]["papel_perfil"];
          criado_em: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          nome: string;
          papel?: Database["public"]["Enums"]["papel_perfil"];
          criado_em?: string;
        };
        Update: {
          nome?: string;
        };
        Relationships: [
          {
            foreignKeyName: "perfis_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          whatsapp: string;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          whatsapp: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          nome?: string;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      veiculos: {
        Row: {
          id: string;
          tenant_id: string;
          cliente_id: string;
          placa: string;
          modelo: string;
          categoria: Database["public"]["Enums"]["categoria_veiculo"];
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          cliente_id: string;
          placa: string;
          modelo: string;
          categoria: Database["public"]["Enums"]["categoria_veiculo"];
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          cliente_id?: string;
          placa?: string;
          modelo?: string;
          categoria?: Database["public"]["Enums"]["categoria_veiculo"];
        };
        Relationships: [
          {
            foreignKeyName: "veiculos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "veiculos_tenant_id_cliente_id_fkey";
            columns: ["tenant_id", "cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      planos_assinaturas: {
        Row: {
          id: string;
          tenant_id: string;
          cliente_id: string;
          nome_plano: string;
          valor_mensal: number;
          total_creditos: number;
          creditos_restantes: number;
          validade: string;
          status: Database["public"]["Enums"]["status_plano"];
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          cliente_id: string;
          nome_plano: string;
          valor_mensal?: number;
          total_creditos: number;
          creditos_restantes: number;
          validade: string;
          status?: Database["public"]["Enums"]["status_plano"];
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          nome_plano?: string;
          valor_mensal?: number;
          total_creditos?: number;
          creditos_restantes?: number;
          validade?: string;
          status?: Database["public"]["Enums"]["status_plano"];
        };
        Relationships: [
          {
            foreignKeyName: "planos_assinaturas_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planos_assinaturas_tenant_id_cliente_id_fkey";
            columns: ["tenant_id", "cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      ordens_servico: {
        Row: {
          id: string;
          tenant_id: string;
          veiculo_id: string;
          plano_assinatura_id: string | null;
          servicos_avulsos: Json;
          valor_total: number;
          status: Database["public"]["Enums"]["status_os"];
          fotos_vistoria: string[];
          observacoes: string | null;
          token_publico: string;
          criado_em: string;
          atualizado_em: string;
          pronto_em: string | null;
          entregue_em: string | null;
        };
        Insert: never;
        Update: {
          servicos_avulsos?: Json;
          valor_total?: number;
          fotos_vistoria?: string[];
          observacoes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ordens_servico_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_servico_tenant_id_veiculo_id_fkey";
            columns: ["tenant_id", "veiculo_id"];
            isOneToOne: false;
            referencedRelation: "veiculos";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "ordens_servico_tenant_id_plano_assinatura_id_fkey";
            columns: ["tenant_id", "plano_assinatura_id"];
            isOneToOne: false;
            referencedRelation: "planos_assinaturas";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      administradores: {
        Row: { user_id: string; criado_em: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      convites: {
        Row: {
          email: string;
          nome_empresa: string | null;
          dias_teste: number;
          valor_mensal: number;
          criado_em: string;
          usado_em: string | null;
          tenant_id: string | null;
        };
        Insert: {
          email: string;
          nome_empresa?: string | null;
          dias_teste?: number;
          valor_mensal?: number;
        };
        Update: never;
        Relationships: [];
      };
      servicos: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          descricao: string | null;
          duracao_min: number;
          preco: number;
          ativo: boolean;
          ordem: number;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          descricao?: string | null;
          duracao_min: number;
          preco?: number;
          ativo?: boolean;
          ordem?: number;
        };
        Update: {
          nome?: string;
          descricao?: string | null;
          duracao_min?: number;
          preco?: number;
          ativo?: boolean;
          ordem?: number;
        };
        Relationships: [
          {
            foreignKeyName: "servicos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      horarios_funcionamento: {
        Row: {
          tenant_id: string;
          dia_semana: number;
          abre: string;
          fecha: string;
          ativo: boolean;
        };
        Insert: {
          tenant_id: string;
          dia_semana: number;
          abre: string;
          fecha: string;
          ativo?: boolean;
        };
        Update: {
          abre?: string;
          fecha?: string;
          ativo?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "horarios_funcionamento_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      bloqueios_agenda: {
        Row: {
          id: string;
          tenant_id: string;
          inicio: string;
          fim: string;
          motivo: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          inicio: string;
          fim: string;
          motivo?: string | null;
        };
        Update: {
          inicio?: string;
          fim?: string;
          motivo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bloqueios_agenda_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      agendamentos: {
        Row: {
          id: string;
          tenant_id: string;
          servico_id: string | null;
          cliente_id: string | null;
          ordem_servico_id: string | null;
          nome_cliente: string;
          whatsapp: string;
          placa: string | null;
          modelo: string | null;
          servico_nome: string;
          duracao_min: number;
          preco: number;
          inicio: string;
          fim: string;
          status: Database["public"]["Enums"]["status_agendamento"];
          observacoes: string | null;
          origem: string;
          token_publico: string;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: never;
        Update: {
          status?: Database["public"]["Enums"]["status_agendamento"];
          observacoes?: string | null;
          ordem_servico_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agendamentos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      tenant_atual: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      criar_ordem_servico: {
        Args: {
          p_id: string;
          p_veiculo_id: string;
          p_servicos_avulsos: Json;
          p_fotos: string[];
          p_usar_plano: boolean;
          p_observacoes: string | null;
        };
        Returns: Database["public"]["Tables"]["ordens_servico"]["Row"];
      };
      logo_por_slug: {
        Args: { p_slug: string };
        Returns: { conteudo: string; tipo: string }[];
      };
      salvar_logo: {
        Args: { p_tenant: string; p_conteudo: string; p_tipo: string };
        Returns: number;
      };
      remover_logo: {
        Args: { p_tenant: string };
        Returns: undefined;
      };
      alterar_slug: {
        Args: { p_tenant: string; p_slug: string };
        Returns: string;
      };
      resumo_painel: {
        Args: { p_inicio: string; p_fim: string; p_agrupar?: string };
        Returns: Json;
      };
      slug_atual: {
        Args: { p_slug: string };
        Returns: string | null;
      };
      eh_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      admin_listar_esteticas: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          nome: string;
          slug: string;
          telefone: string;
          cidade: string | null;
          email_dono: string | null;
          status_assinatura: Database["public"]["Enums"]["status_assinatura_tenant"];
          assinatura_valida_ate: string;
          valor_mensal: number;
          logo_versao: number | null;
          criado_em: string;
          total_os: number;
          os_30_dias: number;
          ultima_os: string | null;
        }[];
      };
      admin_registrar_pagamento: {
        Args: { p_tenant: string; p_dias: number };
        Returns: Database["public"]["Tables"]["tenants"]["Row"];
      };
      admin_definir_status: {
        Args: {
          p_tenant: string;
          p_status: Database["public"]["Enums"]["status_assinatura_tenant"];
          p_valor?: number | null;
        };
        Returns: Database["public"]["Tables"]["tenants"]["Row"];
      };
      agenda_publica: {
        Args: { p_slug: string };
        Returns: Json;
      };
      horarios_disponiveis: {
        Args: { p_slug: string; p_servico_id: string; p_data: string };
        Returns: string[];
      };
      agendamento_publico: {
        Args: { p_token: string };
        Returns: Json;
      };
      criar_agendamento_publico: {
        Args: {
          p_slug: string;
          p_servico_id: string;
          p_inicio: string;
          p_nome: string;
          p_whatsapp: string;
          p_placa: string | null;
          p_modelo: string | null;
          p_observacoes: string | null;
        };
        Returns: Json;
      };
      cancelar_agendamento_publico: {
        Args: { p_token: string };
        Returns: Json;
      };
      avancar_status_os: {
        Args: {
          p_os_id: string;
          p_status: Database["public"]["Enums"]["status_os"];
        };
        Returns: Database["public"]["Tables"]["ordens_servico"]["Row"];
      };
    };
    Enums: {
      status_agendamento: "pendente" | "confirmado" | "concluido" | "cancelado" | "nao_compareceu";
      status_assinatura_tenant: "trial" | "ativa" | "inadimplente" | "cancelada";
      categoria_veiculo: "hatch" | "sedan" | "suv" | "pickup";
      status_plano: "ativo" | "esgotado" | "expirado" | "cancelado";
      status_os: "recebido" | "lavando" | "acabamento" | "pronto" | "entregue";
      papel_perfil: "dono" | "operador";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Tenant = Tables<"tenants">;
export type Perfil = Tables<"perfis">;
export type Cliente = Tables<"clientes">;
export type Veiculo = Tables<"veiculos">;
export type PlanoAssinatura = Tables<"planos_assinaturas">;
export type OrdemServico = Tables<"ordens_servico">;

export type StatusOS = Enums<"status_os">;
export type CategoriaVeiculo = Enums<"categoria_veiculo">;
export type StatusPlano = Enums<"status_plano">;
export type StatusAgendamento = Enums<"status_agendamento">;
export type Servico = Tables<"servicos">;
export type HorarioFuncionamento = Tables<"horarios_funcionamento">;
export type BloqueioAgenda = Tables<"bloqueios_agenda">;
export type Agendamento = Tables<"agendamentos">;
export type Convite = Tables<"convites">;
export type StatusAssinatura = Enums<"status_assinatura_tenant">;

export type ServicoAvulso = {
  nome: string;
  valor: number;
};

export type CriarOrdemServicoArgs = PublicSchema["Functions"]["criar_ordem_servico"]["Args"];
export type AvancarStatusArgs = PublicSchema["Functions"]["avancar_status_os"]["Args"];

export const STATUS_OS = ["recebido", "lavando", "acabamento", "pronto", "entregue"] as const satisfies readonly StatusOS[];
export const CATEGORIAS_VEICULO = ["hatch", "sedan", "suv", "pickup"] as const satisfies readonly CategoriaVeiculo[];

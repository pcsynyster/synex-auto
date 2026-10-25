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
          status_assinatura: Database["public"]["Enums"]["status_assinatura_tenant"];
          assinatura_valida_ate: string;
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
      avancar_status_os: {
        Args: {
          p_os_id: string;
          p_status: Database["public"]["Enums"]["status_os"];
        };
        Returns: Database["public"]["Tables"]["ordens_servico"]["Row"];
      };
    };
    Enums: {
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

export type ServicoAvulso = {
  nome: string;
  valor: number;
};

export type CriarOrdemServicoArgs = PublicSchema["Functions"]["criar_ordem_servico"]["Args"];
export type AvancarStatusArgs = PublicSchema["Functions"]["avancar_status_os"]["Args"];

export const STATUS_OS = ["recebido", "lavando", "acabamento", "pronto", "entregue"] as const satisfies readonly StatusOS[];
export const CATEGORIAS_VEICULO = ["hatch", "sedan", "suv", "pickup"] as const satisfies readonly CategoriaVeiculo[];

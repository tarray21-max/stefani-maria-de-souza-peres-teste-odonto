export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      client_members: {
        Row: {
          client_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          area: Database["public"]["Enums"]["area_atuacao"]
          cnpj: string | null
          created_at: string
          endereco: string | null
          especialidade: string | null
          id: string
          nome: string
          owner_id: string
          profissional_responsavel: string | null
          telefone: string | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          updated_at: string
        }
        Insert: {
          area?: Database["public"]["Enums"]["area_atuacao"]
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          owner_id: string
          profissional_responsavel?: string | null
          telefone?: string | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["area_atuacao"]
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          owner_id?: string
          profissional_responsavel?: string | null
          telefone?: string | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
        }
        Relationships: []
      }
      custom_items: {
        Row: {
          category: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          norma: string | null
          risco: string | null
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          category: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          norma?: string | null
          risco?: string | null
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          norma?: string | null
          risco?: string | null
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      disabled_items: {
        Row: {
          client_id: string
          created_at: string
          item_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          item_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          item_id?: string
        }
        Relationships: []
      }
      item_images: {
        Row: {
          client_id: string
          created_at: string
          id: string
          item_id: string
          path: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          item_id: string
          path: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          item_id?: string
          path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      item_overrides: {
        Row: {
          client_id: string
          item_id: string
          norma: string | null
          risco: string | null
          title: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          client_id: string
          item_id: string
          norma?: string | null
          risco?: string | null
          title?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          client_id?: string
          item_id?: string
          norma?: string | null
          risco?: string | null
          title?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      monthly_snapshots: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_baseline: boolean
          month: string
          note: string | null
          score: number
          score_by_category: Json
          total_applicable: number
          total_na: number
          total_nao: number
          total_sim: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_baseline?: boolean
          month: string
          note?: string | null
          score: number
          score_by_category?: Json
          total_applicable?: number
          total_na?: number
          total_nao?: number
          total_sim?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_baseline?: boolean
          month?: string
          note?: string | null
          score?: number
          score_by_category?: Json
          total_applicable?: number
          total_na?: number
          total_nao?: number
          total_sim?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reset_log: {
        Row: {
          client_id: string
          created_at: string
          id: string
          justification: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          justification: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          justification?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reset_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          answer: Database["public"]["Enums"]["answer_value"] | null
          client_id: string
          created_at: string
          id: string
          item_id: string
          justification: string | null
          quality: Database["public"]["Enums"]["quality_value"] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          answer?: Database["public"]["Enums"]["answer_value"] | null
          client_id: string
          created_at?: string
          id?: string
          item_id: string
          justification?: string | null
          quality?: Database["public"]["Enums"]["quality_value"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          answer?: Database["public"]["Enums"]["answer_value"] | null
          client_id?: string
          created_at?: string
          id?: string
          item_id?: string
          justification?: string | null
          quality?: Database["public"]["Enums"]["quality_value"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_links: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          mode: Database["public"]["Enums"]["visitor_mode"]
          token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["visitor_mode"]
          token: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["visitor_mode"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_client_role: {
        Args: {
          _client_id: string
          _roles: Database["public"]["Enums"]["member_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_client_member: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      visitor_get_state: { Args: { _token: string }; Returns: Json }
      visitor_set_answer: {
        Args: {
          _answer: string
          _item_id: string
          _justification: string
          _quality: string
          _token: string
        }
        Returns: undefined
      }
      whoami: { Args: never; Returns: Json }
    }
    Enums: {
      answer_value: "sim" | "nao" | "na"
      area_atuacao: "odontologia" | "medicina"
      member_role: "owner" | "editor" | "viewer"
      quality_value: "bom" | "ruim"
      tipo_contrato: "assessoria_odontologica" | "regularizacao_sanitaria"
      visitor_mode: "view" | "edit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      answer_value: ["sim", "nao", "na"],
      area_atuacao: ["odontologia", "medicina"],
      member_role: ["owner", "editor", "viewer"],
      quality_value: ["bom", "ruim"],
      tipo_contrato: ["assessoria_odontologica", "regularizacao_sanitaria"],
      visitor_mode: ["view", "edit"],
    },
  },
} as const

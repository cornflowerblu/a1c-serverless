export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      user_connections: {
        Row: {
          id: string
          user_id: string
          caregiver_id: string
          permissions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          caregiver_id: string
          permissions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          caregiver_id?: string
          permissions?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_connections_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      glucose_readings: {
        Row: {
          created_at: string | null
          id: string
          meal_context: string
          notes: string | null
          run_id: string | null
          timestamp: string
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          meal_context: string
          notes?: string | null
          run_id?: string | null
          timestamp: string
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          meal_context?: string
          notes?: string | null
          run_id?: string | null
          timestamp?: string
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "glucose_readings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "glucose_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          job_type: string
          payload: Json
          processed_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          job_type: string
          payload: Json
          processed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          job_type?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      month_runs: {
        Row: {
          month_id: string
          run_id: string
        }
        Insert: {
          month_id: string
          run_id: string
        }
        Update: {
          month_id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "month_runs_month_id_fkey"
            columns: ["month_id"]
            isOneToOne: false
            referencedRelation: "months"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "month_runs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      months: {
        Row: {
          average_glucose: number | null
          calculated_a1c: number | null
          created_at: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_glucose?: number | null
          calculated_a1c?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_glucose?: number | null
          calculated_a1c?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "months_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          average_glucose: number | null
          calculated_a1c: number | null
          created_at: string | null
          end_date: string
          id: string
          month_id: string | null
          name: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_glucose?: number | null
          calculated_a1c?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          month_id?: string | null
          name: string
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_glucose?: number | null
          calculated_a1c?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          month_id?: string | null
          name?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_month_id_fkey"
            columns: ["month_id"]
            isOneToOne: false
            referencedRelation: "months"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_medical_profiles: {
        Row: {
          birth_year: number | null
          created_at: string | null
          diabetes_type: string | null
          id: string
          preferred_unit: string
          target_a1c: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string | null
          diabetes_type?: string | null
          id?: string
          preferred_unit: string
          target_a1c?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string | null
          diabetes_type?: string | null
          id?: string
          preferred_unit?: string
          target_a1c?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_medical_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          display_unit: string
          id: string
          reminder_enabled: boolean
          reminder_frequency: string
          target_a1c: number | null
          theme: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_unit: string
          id?: string
          reminder_enabled?: boolean
          reminder_frequency: string
          target_a1c?: number | null
          theme: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_unit?: string
          id?: string
          reminder_enabled?: boolean
          reminder_frequency?: string
          target_a1c?: number | null
          theme?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          clerk_id: string | null
          created_at: string | null
          createdAt: string
          email: string | null
          id: string
          name: string | null
          user_role: Database["public"]["Enums"]["UserRole"]
          updated_at: string | null
          updatedAt: string
        }
        Insert: {
          clerk_id?: string | null
          created_at?: string | null
          createdAt?: string
          email?: string | null
          id?: string
          name?: string | null
          user_role?: Database["public"]["Enums"]["UserRole"]
          updated_at?: string | null
          updatedAt: string
        }
        Update: {
          clerk_id?: string | null
          created_at?: string | null
          createdAt?: string
          email?: string | null
          id?: string
          name?: string | null
          user_role?: Database["public"]["Enums"]["UserRole"]
          updated_at?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      wrappers_fdw_stats: {
        Row: {
          bytes_in: number | null
          bytes_out: number | null
          create_times: number | null
          created_at: string
          fdw_name: string
          metadata: Json | null
          rows_in: number | null
          rows_out: number | null
          updated_at: string
        }
        Insert: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Update: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name?: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      airtable_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      airtable_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      airtable_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      auth0_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      auth0_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      auth0_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      big_query_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      big_query_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      big_query_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      click_house_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      click_house_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      click_house_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      cognito_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      cognito_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      cognito_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      firebase_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      firebase_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      firebase_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      get_current_clerk_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      hello_world_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      hello_world_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      hello_world_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      logflare_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      logflare_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      logflare_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      mssql_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      mssql_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      mssql_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      redis_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      redis_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      redis_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      requesting_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      s3_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      s3_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      s3_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      stripe_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      stripe_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      stripe_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
      wasm_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      wasm_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          version: string
          author: string
          website: string
        }[]
      }
      wasm_fdw_validator: {
        Args: { options: string[]; catalog: unknown }
        Returns: undefined
      }
    }
    Enums: {
      UserRole: "admin" | "user" | "caregiver"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      UserRole: ["admin", "user", "caregiver"],
    },
  },
} as const

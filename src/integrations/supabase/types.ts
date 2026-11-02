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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      business_plans: {
        Row: {
          initial_investment: number
          operating_days_per_month: number
          owner_id: string
          target_monthly_profit: number
          updated_at: string
        }
        Insert: {
          initial_investment?: number
          operating_days_per_month?: number
          owner_id?: string
          target_monthly_profit?: number
          updated_at?: string
        }
        Update: {
          initial_investment?: number
          operating_days_per_month?: number
          owner_id?: string
          target_monthly_profit?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          key: string
          label: string
          monthly_amount: number
          owner_id: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          key: string
          label: string
          monthly_amount?: number
          owner_id?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          key?: string
          label?: string
          monthly_amount?: number
          owner_id?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      ingredient_price_history: {
        Row: {
          id: string
          ingredient_id: string
          purchase_price: number
          purchase_qty: number
          purchase_unit: string
          recorded_at: string
          yield_pct: number
        }
        Insert: {
          id?: string
          ingredient_id: string
          purchase_price: number
          purchase_qty: number
          purchase_unit: string
          recorded_at?: string
          yield_pct: number
        }
        Update: {
          id?: string
          ingredient_id?: string
          purchase_price?: number
          purchase_qty?: number
          purchase_unit?: string
          recorded_at?: string
          yield_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_price_history_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: string
          created_at: string
          id: string
          is_sample: boolean
          name: string
          owner_id: string | null
          purchase_price: number
          purchase_qty: number
          purchase_unit: string
          updated_at: string
          yield_pct: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_sample?: boolean
          name: string
          owner_id?: string | null
          purchase_price: number
          purchase_qty: number
          purchase_unit: string
          updated_at?: string
          yield_pct?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_sample?: boolean
          name?: string
          owner_id?: string | null
          purchase_price?: number
          purchase_qty?: number
          purchase_unit?: string
          updated_at?: string
          yield_pct?: number
        }
        Relationships: []
      }
      menu_prices: {
        Row: {
          effective_from: string
          id: string
          price: number
          recipe_id: string
        }
        Insert: {
          effective_from?: string
          id?: string
          price: number
          recipe_id: string
        }
        Update: {
          effective_from?: string
          id?: string
          price?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_prices_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          electricity_allocated_per_recipe: boolean
          expected_monthly_portions: number
          expected_monthly_sales: number
          fuel_allocated_per_recipe: boolean
          id: number
          overhead_method: string
          owner_id: string | null
          review_threshold_pct: number
          rounding_increment: number
          target_margin_pct: number
          updated_at: string
        }
        Insert: {
          electricity_allocated_per_recipe?: boolean
          expected_monthly_portions?: number
          expected_monthly_sales?: number
          fuel_allocated_per_recipe?: boolean
          id?: number
          overhead_method?: string
          owner_id?: string | null
          review_threshold_pct?: number
          rounding_increment?: number
          target_margin_pct?: number
          updated_at?: string
        }
        Update: {
          electricity_allocated_per_recipe?: boolean
          expected_monthly_portions?: number
          expected_monthly_sales?: number
          fuel_allocated_per_recipe?: boolean
          id?: number
          overhead_method?: string
          owner_id?: string | null
          review_threshold_pct?: number
          rounding_increment?: number
          target_margin_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          ingredient_id: string
          quantity: number
          recipe_id: string
          sort_order: number
          unit: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          quantity: number
          recipe_id: string
          sort_order?: number
          unit: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          quantity?: number
          recipe_id?: string
          sort_order?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          batch_portions: number
          category: string
          created_at: string
          fuel_cost: number
          id: string
          is_sample: boolean
          monthly_portions: number
          name: string
          owner_id: string | null
          packaging_cost: number
          portion_note: string | null
          selling_price: number
          updated_at: string
          wastage_pct: number
        }
        Insert: {
          batch_portions?: number
          category?: string
          created_at?: string
          fuel_cost?: number
          id?: string
          is_sample?: boolean
          monthly_portions?: number
          name: string
          owner_id?: string | null
          packaging_cost?: number
          portion_note?: string | null
          selling_price?: number
          updated_at?: string
          wastage_pct?: number
        }
        Update: {
          batch_portions?: number
          category?: string
          created_at?: string
          fuel_cost?: number
          id?: string
          is_sample?: boolean
          monthly_portions?: number
          name?: string
          owner_id?: string | null
          packaging_cost?: number
          portion_note?: string | null
          selling_price?: number
          updated_at?: string
          wastage_pct?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_sample_data: { Args: never; Returns: undefined }
      init_workspace: { Args: never; Returns: undefined }
      load_sample_data: { Args: never; Returns: undefined }
      save_recipe: {
        Args: { p_id: string; p_lines: Json; p_recipe: Json }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
      appointments: {
        Row: {
          created_at: string
          end_time: string
          id: string
          modality_id: string | null
          notes: string | null
          organization_id: string
          start_time: string
          status: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          modality_id?: string | null
          notes?: string | null
          organization_id: string
          start_time: string
          status?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          modality_id?: string | null
          notes?: string | null
          organization_id?: string
          start_time?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          checked_in_at: string
          id: string
          organization_id: string
          source: string | null
          student_id: string
        }
        Insert: {
          checked_in_at?: string
          id?: string
          organization_id: string
          source?: string | null
          student_id: string
        }
        Update: {
          checked_in_at?: string
          id?: string
          organization_id?: string
          source?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string
          expiry_date: string
          id: string
          modality_id: string
          price: number | null
          student_id: string
        }
        Insert: {
          created_at?: string
          expiry_date: string
          id?: string
          modality_id: string
          price?: number | null
          student_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string
          id?: string
          modality_id?: string
          price?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      modalities: {
        Row: {
          created_at: string
          description: string | null
          gympass_modality_id: string | null
          id: string
          name: string
          organization_id: string
          price: number | null
          pricing_type: string | null
          totalpass_modality_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          gympass_modality_id?: string | null
          id?: string
          name: string
          organization_id: string
          price?: number | null
          pricing_type?: string | null
          totalpass_modality_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          gympass_modality_id?: string | null
          id?: string
          name?: string
          organization_id?: string
          price?: number | null
          pricing_type?: string | null
          totalpass_modality_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modalities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          business_hours: string | null
          created_at: string
          gympass_api_key: string | null
          gympass_integration_code: number | null
          id: string
          logo_url: string | null
          name: string
          organization_type: string | null
          owner_name: string | null
          payment_details: string | null
          phone_number: string | null
          reminder_days: number[] | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          subscription_status: string
          totalpass_api_key: string | null
          totalpass_integration_code: string | null
          trial_expires_at: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: string | null
          created_at?: string
          gympass_api_key?: string | null
          gympass_integration_code?: number | null
          id?: string
          logo_url?: string | null
          name: string
          organization_type?: string | null
          owner_name?: string | null
          payment_details?: string | null
          phone_number?: string | null
          reminder_days?: number[] | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          subscription_status?: string
          totalpass_api_key?: string | null
          totalpass_integration_code?: string | null
          trial_expires_at?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: string | null
          created_at?: string
          gympass_api_key?: string | null
          gympass_integration_code?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_type?: string | null
          owner_name?: string | null
          payment_details?: string | null
          phone_number?: string | null
          reminder_days?: number[] | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          subscription_status?: string
          totalpass_api_key?: string | null
          totalpass_integration_code?: string | null
          trial_expires_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          price: number
          product_type: string
          quantity: number
          recurring_interval: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          price: number
          product_type?: string
          quantity?: number
          recurring_interval?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          price?: number
          product_type?: string
          quantity?: number
          recurring_interval?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_sign_in_at: string | null
          organization_id: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_sign_in_at?: string | null
          organization_id?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_sign_in_at?: string | null
          organization_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          quantity_sold: number
          sale_date: string
          student_id: string | null
          total_price: number
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          quantity_sold: number
          sale_date?: string
          student_id?: string | null
          total_price: number
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          quantity_sold?: number
          sale_date?: string
          student_id?: string | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          max_students: number
          modality_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          max_students: number
          modality_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          max_students?: number
          modality_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      student_coach_interactions: {
        Row: {
          conversation_state: string
          created_at: string
          goal_details: Json | null
          id: string
          last_workout_video_links: Json | null
          organization_id: string | null
          plan_suggestion: Json | null
          student_id: string | null
          student_phone_number: string
          updated_at: string
        }
        Insert: {
          conversation_state?: string
          created_at?: string
          goal_details?: Json | null
          id?: string
          last_workout_video_links?: Json | null
          organization_id?: string | null
          plan_suggestion?: Json | null
          student_id?: string | null
          student_phone_number: string
          updated_at?: string
        }
        Update: {
          conversation_state?: string
          created_at?: string
          goal_details?: Json | null
          id?: string
          last_workout_video_links?: Json | null
          organization_id?: string | null
          plan_suggestion?: Json | null
          student_id?: string | null
          student_phone_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_coach_interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_coach_interactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_history: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          notes: string | null
          organization_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          gympass_user_token: string | null
          id: string
          name: string
          organization_id: string
          phone_number: string | null
          totalpass_user_token: string | null
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gympass_user_token?: string | null
          id?: string
          name: string
          organization_id: string
          phone_number?: string | null
          totalpass_user_token?: string | null
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gympass_user_token?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone_number?: string | null
          totalpass_user_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          observations: string | null
          order_index: number
          reps: string | null
          rest_period: string | null
          sets: string | null
          video_url: string | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          observations?: string | null
          order_index?: number
          reps?: string | null
          rest_period?: string | null
          sets?: string | null
          video_url?: string | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          observations?: string | null
          order_index?: number
          reps?: string | null
          rest_period?: string | null
          sets?: string | null
          video_url?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_students: {
        Row: {
          student_id: string
          workout_id: string
        }
        Insert: {
          student_id: string
          workout_id: string
        }
        Update: {
          student_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_students_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          day_of_week: number | null
          description: string | null
          frequency: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          frequency?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          frequency?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extend_trial: {
        Args: {
          org_id: string
          days_to_extend: number
        }
        Returns: undefined
      }
      get_all_organization_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          org_id: string
          org_name: string
          org_created_at: string
          owner_id: string
          owner_name: string
          owner_email: string
          owner_last_sign_in_at: string | null
          owner_is_active: boolean
          student_count: number
          total_enrollment_revenue: number
          total_product_revenue: number
          subscription_status: string
          trial_expires_at: string | null
        }[]
      }
      get_checkin_count: {
        Args: {
          student_id_param: string
        }
        Returns: number
      }
      get_enrollment_revenue_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_modality_popularity: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          count: number
        }[]
      }
      get_monthly_sales_revenue: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          total: number
          month_br: string
        }[]
      }
      get_student_workouts: {
        Args: {
          p_student_id: string
        }
        Returns: Json[]
      }
      get_top_products_this_month: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          total_sold: number
        }[]
      }
      get_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyaof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
}
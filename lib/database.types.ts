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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          rarity: string
          requirements: Json | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          rarity: string
          requirements?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rarity?: string
          requirements?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      character_classes: {
        Row: {
          abilities: Json | null
          base_xp_multiplier: number
          commission_multiplier: number
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          requirements: Json | null
          updated_at: string
        }
        Insert: {
          abilities?: Json | null
          base_xp_multiplier?: number
          commission_multiplier?: number
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          requirements?: Json | null
          updated_at?: string
        }
        Update: {
          abilities?: Json | null
          base_xp_multiplier?: number
          commission_multiplier?: number
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          requirements?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_settings: {
        Row: {
          analytics_settings: Json | null
          company_id: string
          created_at: string
          id: string
          notification_preferences: Json | null
          quest_templates: Json | null
          reward_settings: Json | null
          updated_at: string
        }
        Insert: {
          analytics_settings?: Json | null
          company_id: string
          created_at?: string
          id?: string
          notification_preferences?: Json | null
          quest_templates?: Json | null
          reward_settings?: Json | null
          updated_at?: string
        }
        Update: {
          analytics_settings?: Json | null
          company_id?: string
          created_at?: string
          id?: string
          notification_preferences?: Json | null
          quest_templates?: Json | null
          reward_settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      guild_members: {
        Row: {
          guild_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          guild_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          guild_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          leader_id: string
          member_count: number
          name: string
          total_commission: number
          total_referrals: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_id: string
          member_count?: number
          name: string
          total_commission?: number
          total_referrals?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_id?: string
          member_count?: number
          name?: string
          total_commission?: number
          total_referrals?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guilds_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          company_id: string
          created_at: string
          description: string
          difficulty: string
          end_date: string | null
          id: string
          is_active: boolean
          quest_type: string
          reward_commission: number
          reward_xp: number
          start_date: string | null
          target_type: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          difficulty: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          quest_type: string
          reward_commission?: number
          reward_xp: number
          start_date?: string | null
          target_type: string
          target_value: number
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          difficulty?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          quest_type?: string
          reward_commission?: number
          reward_xp?: number
          start_date?: string | null
          target_type?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_amount: number | null
          commission_status: string | null
          company_id: string
          created_at: string
          id: string
          referral_code: string
          referred_whop_user_id: string
          referrer_id: string
          status: string
          updated_at: string
          whop_payment_id: string | null
          whop_webhook_id: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_status?: string | null
          company_id: string
          created_at?: string
          id?: string
          referral_code: string
          referred_whop_user_id: string
          referrer_id: string
          status?: string
          updated_at?: string
          whop_payment_id?: string | null
          whop_webhook_id?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_status?: string | null
          company_id?: string
          created_at?: string
          id?: string
          referral_code?: string
          referred_whop_user_id?: string
          referrer_id?: string
          status?: string
          updated_at?: string
          whop_payment_id?: string | null
          whop_webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          progress_data: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          progress_data?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          progress_data?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          progress_value: number
          quest_id: string
          reward_claimed: boolean
          reward_claimed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          progress_value?: number
          quest_id: string
          reward_claimed?: boolean
          reward_claimed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          progress_value?: number
          quest_id?: string
          reward_claimed?: boolean
          reward_claimed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          character_class: string
          company_id: string
          created_at: string
          email: string | null
          experience_points: number
          id: string
          level: number
          prestige_level: number
          raw_user_meta: Json | null
          total_commission: number
          total_referrals: number
          updated_at: string
          username: string
          whop_user_id: string
        }
        Insert: {
          avatar_url?: string | null
          character_class: string
          company_id: string
          created_at?: string
          email?: string | null
          experience_points?: number
          id?: string
          level?: number
          prestige_level?: number
          raw_user_meta?: Json | null
          total_commission?: number
          total_referrals?: number
          updated_at?: string
          username: string
          whop_user_id: string
        }
        Update: {
          avatar_url?: string | null
          character_class?: string
          company_id?: string
          created_at?: string
          email?: string | null
          experience_points?: number
          id?: string
          level?: number
          prestige_level?: number
          raw_user_meta?: Json | null
          total_commission?: number
          total_referrals?: number
          updated_at?: string
          username?: string
          whop_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_character_class_fkey"
            columns: ["character_class"]
            isOneToOne: false
            referencedRelation: "character_classes"
            referencedColumns: ["name"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_level: {
        Args: { xp: number }
        Returns: number
      }
      get_quest_analytics: {
        Args: {
          p_company_id: string
          p_quest_type: string | null
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          total_quests: number
          completed_quests: number
          completion_rate: number
          total_users: number
          average_completion_time: number
        }[]
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
    Enums: {},
  },
} as const

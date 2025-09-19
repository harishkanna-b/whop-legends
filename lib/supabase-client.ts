import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser-side operations (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We use Whop SDK for auth
  },
});

// Client for server-side operations (bypasses RLS)
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

// Database types (will be expanded as we implement)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          whop_user_id: string;
          company_id: string;
          username: string;
          email: string | null;
          avatar_url: string | null;
          character_class: 'scout' | 'sage' | 'champion';
          level: number;
          experience_points: number;
          prestige_level: number;
          total_referrals: number;
          total_commission: number;
          created_at: string;
          updated_at: string;
          raw_user_meta: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          whop_user_id: string;
          company_id: string;
          username: string;
          email?: string | null;
          avatar_url?: string | null;
          character_class: 'scout' | 'sage' | 'champion';
          level?: number;
          experience_points?: number;
          prestige_level?: number;
          total_referrals?: number;
          total_commission?: number;
          raw_user_meta?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          whop_user_id?: string;
          company_id?: string;
          username?: string;
          email?: string | null;
          avatar_url?: string | null;
          character_class?: 'scout' | 'sage' | 'champion';
          level?: number;
          experience_points?: number;
          prestige_level?: number;
          total_referrals?: number;
          total_commission?: number;
          raw_user_meta?: Record<string, any> | null;
        };
      };
      character_classes: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          base_xp_multiplier: number;
          commission_multiplier: number;
          abilities: Record<string, any> | null;
          requirements: Record<string, any> | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          base_xp_multiplier: number;
          commission_multiplier: number;
          abilities?: Record<string, any> | null;
          requirements?: Record<string, any> | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          base_xp_multiplier?: number;
          commission_multiplier?: number;
          abilities?: Record<string, any> | null;
          requirements?: Record<string, any> | null;
          is_active?: boolean;
        };
      };
      quests: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          description: string;
          quest_type: 'daily' | 'weekly' | 'monthly' | 'special';
          difficulty: 'easy' | 'medium' | 'hard' | 'epic';
          target_type: 'referrals' | 'commission' | 'level' | 'achievements';
          target_value: number;
          reward_xp: number;
          reward_commission: number;
          is_active: boolean;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          description: string;
          quest_type: 'daily' | 'weekly' | 'monthly' | 'special';
          difficulty: 'easy' | 'medium' | 'hard' | 'epic';
          target_type: 'referrals' | 'commission' | 'level' | 'achievements';
          target_value: number;
          reward_xp: number;
          reward_commission?: number;
          is_active?: boolean;
          start_date?: string | null;
          end_date?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          title?: string;
          description?: string;
          quest_type?: 'daily' | 'weekly' | 'monthly' | 'special';
          difficulty?: 'easy' | 'medium' | 'hard' | 'epic';
          target_type?: 'referrals' | 'commission' | 'level' | 'achievements';
          target_value?: number;
          reward_xp?: number;
          reward_commission?: number;
          is_active?: boolean;
          start_date?: string | null;
          end_date?: string | null;
        };
      };
      user_quests: {
        Row: {
          id: string;
          user_id: string;
          quest_id: string;
          progress_value: number;
          is_completed: boolean;
          completed_at: string | null;
          reward_claimed: boolean;
          reward_claimed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quest_id: string;
          progress_value?: number;
          is_completed?: boolean;
          completed_at?: string | null;
          reward_claimed?: boolean;
          reward_claimed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          quest_id?: string;
          progress_value?: number;
          is_completed?: boolean;
          completed_at?: string | null;
          reward_claimed?: boolean;
          reward_claimed_at?: string | null;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_whop_user_id: string;
          company_id: string;
          referral_code: string;
          status: 'pending' | 'completed' | 'expired';
          commission_amount: number;
          commission_status: 'pending' | 'paid' | 'cancelled';
          whop_payment_id: string | null;
          whop_webhook_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_whop_user_id: string;
          company_id: string;
          referral_code: string;
          status?: 'pending' | 'completed' | 'expired';
          commission_amount?: number;
          commission_status?: 'pending' | 'paid' | 'cancelled';
          whop_payment_id?: string | null;
          whop_webhook_id?: string | null;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_whop_user_id?: string;
          company_id?: string;
          referral_code?: string;
          status?: 'pending' | 'completed' | 'expired';
          commission_amount?: number;
          commission_status?: 'pending' | 'paid' | 'cancelled';
          whop_payment_id?: string | null;
          whop_webhook_id?: string | null;
        };
      };
      achievements: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          category: string;
          rarity: 'common' | 'rare' | 'epic' | 'legendary';
          icon_url: string | null;
          requirements: Record<string, any> | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          category: string;
          rarity: 'common' | 'rare' | 'epic' | 'legendary';
          icon_url?: string | null;
          requirements?: Record<string, any> | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          category?: string;
          rarity?: 'common' | 'rare' | 'epic' | 'legendary';
          icon_url?: string | null;
          requirements?: Record<string, any> | null;
          is_active?: boolean;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
          progress_data: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
          progress_data?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
          progress_data?: Record<string, any> | null;
        };
      };
      guilds: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          leader_id: string;
          member_count: number;
          total_referrals: number;
          total_commission: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          leader_id: string;
          member_count?: number;
          total_referrals?: number;
          total_commission?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          description?: string | null;
          leader_id?: string;
          member_count?: number;
          total_referrals?: number;
          total_commission?: number;
          is_active?: boolean;
        };
      };
      guild_members: {
        Row: {
          id: string;
          guild_id: string;
          user_id: string;
          role: 'leader' | 'officer' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          guild_id: string;
          user_id: string;
          role?: 'leader' | 'officer' | 'member';
          joined_at?: string;
        };
        Update: {
          id?: string;
          guild_id?: string;
          user_id?: string;
          role?: 'leader' | 'officer' | 'member';
          joined_at?: string;
        };
      };
      creator_settings: {
        Row: {
          id: string;
          company_id: string;
          quest_templates: Record<string, any> | null;
          reward_settings: Record<string, any> | null;
          notification_preferences: Record<string, any> | null;
          analytics_settings: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          quest_templates?: Record<string, any> | null;
          reward_settings?: Record<string, any> | null;
          notification_preferences?: Record<string, any> | null;
          analytics_settings?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          quest_templates?: Record<string, any> | null;
          reward_settings?: Record<string, any> | null;
          notification_preferences?: Record<string, any> | null;
          analytics_settings?: Record<string, any> | null;
        };
      };
    };
  };
}
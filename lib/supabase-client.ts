import { createClient } from "@supabase/supabase-js";

// Client-side Supabase clients - lazy initialization to prevent multiple instances
import { SupabaseClient } from "@supabase/supabase-js";
let supabaseInstance: SupabaseClient<Database> | null = null;
let supabaseServiceInstance: SupabaseClient<Database> | null = null;

// Supabase configuration
const getSupabaseConfig = () => {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error("Missing required Supabase environment variables");
	}

	return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
};

// Client for browser-side operations (with RLS)
export const supabase = () => {
	if (supabaseInstance) {
		return supabaseInstance;
	}

	const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
	supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			persistSession: false, // We use Whop SDK for auth
		},
	});

	return supabaseInstance;
};

// Client for server-side operations (bypasses RLS)
export const supabaseService = () => {
	if (supabaseServiceInstance) {
		return supabaseServiceInstance;
	}

	const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();

	if (!supabaseServiceKey) {
		throw new Error("Missing required Supabase service role key");
	}

	supabaseServiceInstance = createClient(supabaseUrl, supabaseServiceKey, {
		auth: {
			persistSession: false,
		},
	});

	return supabaseServiceInstance;
};

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
					character_class: "scout" | "sage" | "champion";
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
					character_class: "scout" | "sage" | "champion";
					level?: number;
					experience_points?: number;
					prestige_level?: number;
					total_referrals?: number;
					total_commission?: number;
					created_at?: string;
					updated_at?: string;
					raw_user_meta?: Record<string, any> | null;
				};
				Update: {
					id?: string;
					whop_user_id?: string;
					company_id?: string;
					username?: string;
					email?: string | null;
					avatar_url?: string | null;
					character_class?: "scout" | "sage" | "champion";
					level?: number;
					experience_points?: number;
					prestige_level?: number;
					total_referrals?: number;
					total_commission?: number;
					created_at?: string;
					updated_at?: string;
					raw_user_meta?: Record<string, any> | null;
				};
			};
			character_classes: {
				Row: {
					id: string;
					name: string;
					description: string | null;
					abilities: Record<string, any> | null;
					xp_multiplier: number;
					commission_multiplier: number;
					is_active: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					description?: string | null;
					abilities?: Record<string, any> | null;
					xp_multiplier?: number;
					commission_multiplier?: number;
					is_active?: boolean;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					description?: string | null;
					abilities?: Record<string, any> | null;
					xp_multiplier?: number;
					commission_multiplier?: number;
					is_active?: boolean;
					created_at?: string;
					updated_at?: string;
				};
			};
			quests: {
				Row: {
					id: string;
					company_id: string;
					title: string;
					description: string;
					quest_type: "daily" | "weekly" | "monthly" | "special";
					difficulty: "easy" | "medium" | "hard" | "legendary";
					experience_reward: number;
					commission_reward: number;
					is_active: boolean;
					max_completions: number | null;
					time_limit_hours: number | null;
					created_at: string;
					updated_at: string;
					expires_at: string | null;
					metadata: Record<string, any> | null;
				};
				Insert: {
					id?: string;
					company_id: string;
					title: string;
					description: string;
					quest_type: "daily" | "weekly" | "monthly" | "special";
					difficulty: "easy" | "medium" | "hard" | "legendary";
					experience_reward?: number;
					commission_reward?: number;
					is_active?: boolean;
					max_completions?: number | null;
					time_limit_hours?: number | null;
					created_at?: string;
					updated_at?: string;
					expires_at?: string | null;
					metadata?: Record<string, any> | null;
				};
				Update: {
					id?: string;
					company_id?: string;
					title?: string;
					description?: string;
					quest_type?: "daily" | "weekly" | "monthly" | "special";
					difficulty?: "easy" | "medium" | "hard" | "legendary";
					experience_reward?: number;
					commission_reward?: number;
					is_active?: boolean;
					max_completions?: number | null;
					time_limit_hours?: number | null;
					created_at?: string;
					updated_at?: string;
					expires_at?: string | null;
					metadata?: Record<string, any> | null;
				};
			};
			user_quests: {
				Row: {
					id: string;
					user_id: string;
					quest_id: string;
					progress_value: number;
					target_value: number;
					is_completed: boolean;
					completed_at: string | null;
					reward_claimed: boolean;
					claimed_at: string | null;
					status: "active" | "completed" | "failed" | "expired";
					created_at: string;
					updated_at: string;
					expires_at: string | null;
					metadata: Record<string, any> | null;
				};
				Insert: {
					id?: string;
					user_id: string;
					quest_id: string;
					progress_value?: number;
					target_value: number;
					is_completed?: boolean;
					completed_at?: string | null;
					reward_claimed?: boolean;
					claimed_at?: string | null;
					status?: "active" | "completed" | "failed" | "expired";
					created_at?: string;
					updated_at?: string;
					expires_at?: string | null;
					metadata?: Record<string, any> | null;
				};
				Update: {
					id?: string;
					user_id?: string;
					quest_id?: string;
					progress_value?: number;
					target_value?: number;
					is_completed?: boolean;
					completed_at?: string | null;
					reward_claimed?: boolean;
					claimed_at?: string | null;
					status?: "active" | "completed" | "failed" | "expired";
					created_at?: string;
					updated_at?: string;
					expires_at?: string | null;
					metadata?: Record<string, any> | null;
				};
			};
			referrals: {
				Row: {
					id: string;
					referrer_id: string;
					referred_whop_user_id: string;
					company_id: string;
					referral_code: string;
					status: "pending" | "completed" | "expired";
					commission_amount: number;
					commission_status: "pending" | "paid" | "cancelled";
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
					status?: "pending" | "completed" | "expired";
					commission_amount?: number;
					commission_status?: "pending" | "paid" | "cancelled";
					whop_payment_id?: string | null;
					whop_webhook_id?: string | null;
				};
				Update: {
					id?: string;
					referrer_id?: string;
					referred_whop_user_id?: string;
					company_id?: string;
					referral_code?: string;
					status?: "pending" | "completed" | "expired";
					commission_amount?: number;
					commission_status?: "pending" | "paid" | "cancelled";
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
					rarity: "common" | "rare" | "epic" | "legendary";
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
					rarity: "common" | "rare" | "epic" | "legendary";
					icon_url?: string | null;
					requirements?: Record<string, any> | null;
					is_active?: boolean;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					display_name?: string;
					description?: string | null;
					category?: string;
					rarity?: "common" | "rare" | "epic" | "legendary";
					icon_url?: string | null;
					requirements?: Record<string, any> | null;
					is_active?: boolean;
					created_at?: string;
					updated_at?: string;
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
					role: "leader" | "officer" | "member";
					joined_at: string;
				};
				Insert: {
					id?: string;
					guild_id: string;
					user_id: string;
					role?: "leader" | "officer" | "member";
					joined_at?: string;
				};
				Update: {
					id?: string;
					guild_id?: string;
					user_id?: string;
					role?: "leader" | "officer" | "member";
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

export type QuestType = 'daily' | 'weekly' | 'monthly' | 'special';
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'epic';
export type QuestStatus = 'active' | 'completed' | 'failed' | 'expired';
export type RequirementType = 'referrals' | 'commission' | 'level' | 'achievements' | 'clicks';

export interface Quest {
  id: string;
  company_id: string;
  title: string;
  description: string;
  quest_type: QuestType;
  difficulty: QuestDifficulty;
  target_type: RequirementType;
  target_value: number;
  reward_xp: number;
  reward_commission: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserQuest {
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
  quest?: Quest;
  status: QuestStatus;
}


export interface QuestTemplate {
  id: string;
  template_name: string;
  quest_type: 'daily' | 'weekly' | 'monthly' | 'special';
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  base_reward_xp: number;
  requirements_template: {
    target_type: 'referrals' | 'commission' | 'level' | 'achievements';
    base_target_value: number;
    scaling_factor: number;
  };
  is_active: boolean;
}

export interface QuestStats {
  total_completed: number;
  completion_rate: number;
  average_completion_time: number;
  favorite_quest_type: string;
  total_xp_earned: number;
  total_commission_earned: number;
  current_streak: number;
  longest_streak: number;
}

export interface QuestGenerationConfig {
  company_id: string;
  user_level: number;
  character_class: 'scout' | 'sage' | 'champion';
  quest_type: 'daily' | 'weekly' | 'monthly';
  difficulty_preferences?: ('easy' | 'medium' | 'hard' | 'epic')[];
}

export interface QuestReward {
  xp: number;
  commission: number;
  achievements?: string[];
  special_rewards?: {
    type: 'badge' | 'title' | 'item';
    name: string;
    description: string;
  }[];
}

export interface QuestFilters {
  quest_type?: 'daily' | 'weekly' | 'monthly' | 'special';
  difficulty?: 'easy' | 'medium' | 'hard' | 'epic';
  status?: 'active' | 'completed' | 'expired';
  target_type?: 'referrals' | 'commission' | 'level' | 'achievements';
}

export interface QuestAnalytics {
  total_quests_generated: number;
  completion_rate_by_type: Record<string, number>;
  average_completion_time_by_type: Record<string, number>;
  popular_quests: Array<{
    quest_id: string;
    title: string;
    completion_count: number;
  }>;
  user_engagement_metrics: {
    daily_active_users: number;
    weekly_active_users: number;
    average_quests_per_user: number;
  };
}

// Additional interfaces from Story 1.4 requirements
export interface QuestRequirement {
  id: string;
  quest_id: string;
  requirement_type: RequirementType;
  target_value: number;
  description: string;
  order_index: number;
  created_at: string;
}

export interface QuestRequirementTemplate {
  requirement_type: RequirementType;
  target_value: number;
  description: string;
  order_index: number;
}

export interface QuestProgress {
  quest_id: string;
  user_id: string;
  current_progress: number;
  target_value: number;
  percentage_complete: number;
  status: QuestStatus;
  time_remaining?: number; // in seconds
}

export interface QuestAnalytics {
  quest_id: string;
  total_users: number;
  completed_users: number;
  completion_rate: number;
  average_completion_time: number; // in seconds
  difficulty_success_rate: Record<QuestDifficulty, number>;
  created_at: string;
}

export interface QuestGenerationParams {
  user_id: string;
  user_level: number;
  character_class: string;
  quest_type: QuestType;
  difficulty?: QuestDifficulty;
}

export interface QuestGenerationResult {
  success: boolean;
  quests: Quest[];
  errors?: string[];
}

// Quest configuration constants
export const QUEST_CONFIG = {
  DAILY_RESET_UTC: 0, // midnight UTC
  WEEKLY_RESET_DAY: 1, // Monday (0 = Sunday, 1 = Monday, etc.)
  MONTHLY_RESET_DAY: 1, // 1st of month

  REWARD_MULTIPLIERS: {
    easy: { xp: 1.0, commission: 1.0 },
    medium: { xp: 1.5, commission: 1.3 },
    hard: { xp: 2.0, commission: 1.8 },
    epic: { xp: 3.0, commission: 2.5 }
  },

  DIFFICULTY_COLOR_MAP: {
    easy: '#10b981', // green
    medium: '#3b82f6', // blue
    hard: '#f59e0b', // amber
    epic: '#ef4444' // red
  },

  QUEST_LIMITS: {
    daily: { min: 3, max: 5 },
    weekly: { min: 1, max: 2 },
    monthly: { min: 1, max: 1 }
  }
} as const;
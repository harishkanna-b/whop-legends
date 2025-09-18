import { supabaseService } from '@/lib/supabase-client';
import { CharacterClassManager, CharacterClass } from './character-classes';
import { LevelingManager, LevelProgression } from './leveling';

export interface UserProfile {
  id: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  level: number;
  totalXP: number;
  characterClass: CharacterClass | null;
  joinedAt: string;
  lastActiveAt: string;
  stats: UserStats;
  achievements: Achievement[];
  recentActivity: Activity[];
  preferences: UserPreferences;
}

export interface UserStats {
  totalReferrals: number;
  completedReferrals: number;
  totalValue: number;
  averageReferralValue: number;
  currentStreak: number;
  bestStreak: number;
  conversionRate: number;
  rank: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface Activity {
  id: string;
  type: 'referral_created' | 'referral_completed' | 'level_up' | 'achievement_unlocked' | 'class_changed';
  description: string;
  metadata?: any;
  createdAt: string;
  xp?: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    levelUp: boolean;
    achievements: boolean;
    referrals: boolean;
    weeklyReport: boolean;
  };
  privacy: {
    showProfile: boolean;
    showStats: boolean;
    showActivity: boolean;
  };
}

export interface ProfileUpdate {
  username?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

export class UserProfileManager {
  /**
   * Get complete user profile
   */
  static async getProfile(userId: string): Promise<UserProfile> {
    try {
      // Get user data
      const { data: user, error: userError } = await supabaseService
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new Error('User not found');
      }

      // Get character class assignment
      const userClass = await CharacterClassManager.getUserClass(userId);
      const characterClass = userClass ? CharacterClassManager.getClassById(userClass.classId) : null;

      // Get level progression
      const progression = await LevelingManager.getUserProgression(userId);

      // Get user statistics
      const stats = await this.getUserStats(userId);

      // Get achievements
      const achievements = await this.getUserAchievements(userId);

      // Get recent activity
      const recentActivity = await this.getRecentActivity(userId, 10);

      // Get user preferences
      const preferences = await this.getUserPreferences(userId);

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatar_url,
        level: progression.currentLevel,
        totalXP: progression.totalXP,
        characterClass,
        joinedAt: user.created_at,
        lastActiveAt: user.last_active_at || user.created_at,
        stats,
        achievements,
        recentActivity,
        preferences,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Get referral statistics
      const { data: referrals, error } = await supabaseService
        .from('referrals')
        .select('status, value, created_at')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const totalReferrals = referrals?.length || 0;
      const completedReferrals = referrals?.filter(r => r.status === 'completed') || [];
      const totalValue = completedReferrals.reduce((sum, ref) => sum + (ref.value || 0), 0);
      const averageReferralValue = completedReferrals.length > 0 ? totalValue / completedReferrals.length : 0;
      const conversionRate = totalReferrals > 0 ? (completedReferrals.length / totalReferrals) * 100 : 0;

      // Calculate streaks
      const { currentStreak, bestStreak } = this.calculateStreaks(referrals || []);

      // Get user rank
      const rank = await this.getUserRank(userId);

      return {
        totalReferrals,
        completedReferrals: completedReferrals.length,
        totalValue,
        averageReferralValue,
        currentStreak,
        bestStreak,
        conversionRate,
        rank,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalReferrals: 0,
        completedReferrals: 0,
        totalValue: 0,
        averageReferralValue: 0,
        currentStreak: 0,
        bestStreak: 0,
        conversionRate: 0,
        rank: 0,
      };
    }
  }

  /**
   * Calculate referral streaks
   */
  private static calculateStreaks(referrals: any[]): { currentStreak: number; bestStreak: number } {
    if (referrals.length === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    // Sort referrals by date
    const sortedReferrals = referrals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Calculate current streak (referrals in last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const currentStreak = sortedReferrals.filter(ref =>
      new Date(ref.created_at) > oneWeekAgo
    ).length;

    // Calculate best streak (maximum referrals in any 7-day period)
    let bestStreak = 0;
    for (let i = 0; i < sortedReferrals.length; i++) {
      const startDate = new Date(sortedReferrals[i].created_at);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const streakInPeriod = sortedReferrals.filter(ref => {
        const refDate = new Date(ref.created_at);
        return refDate >= startDate && refDate <= endDate;
      }).length;

      bestStreak = Math.max(bestStreak, streakInPeriod);
    }

    return { currentStreak, bestStreak };
  }

  /**
   * Get user's rank on leaderboard
   */
  private static async getUserRank(userId: string): Promise<number> {
    try {
      // Get user's total XP
      const { data: userXP } = await supabaseService
        .from('user_classes')
        .select('total_xp')
        .eq('user_id', userId)
        .single();

      if (!userXP) {
        return 0;
      }

      // Count users with higher XP
      const { data: higherXPUsers, error } = await supabaseService
        .from('user_classes')
        .select('id', { count: 'exact' })
        .gt('total_xp', userXP.total_xp);

      if (error) {
        return 0;
      }

      return (higherXPUsers?.length || 0) + 1;
    } catch (error) {
      console.error('Error calculating user rank:', error);
      return 0;
    }
  }

  /**
   * Get user achievements
   */
  static async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      // Get achievement definitions
      const { data: achievementDefs } = await supabaseService
        .from('achievements')
        .select('*');

      // Get user's unlocked achievements
      const { data: userAchievements } = await supabaseService
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      const unlockedSet = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

      return (achievementDefs || []).map(def => ({
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
        category: def.category,
        unlockedAt: unlockedSet.has(def.id) ? userAchievements?.find(ua => ua.achievement_id === def.id)?.unlocked_at : undefined,
        progress: def.requires_progress ? this.getAchievementProgress(userId, def.id) : undefined,
        maxProgress: def.max_progress,
      }));
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }
  }

  /**
   * Get progress for achievement
   */
  private static async getAchievementProgress(userId: string, achievementId: string): Promise<number> {
    // This would need to be implemented based on specific achievement logic
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Get recent user activity
   */
  static async getRecentActivity(userId: string, limit: number = 10): Promise<Activity[]> {
    try {
      // Get XP events
      const { data: xpEvents } = await supabaseService
        .from('user_xp_events')
        .select('type, amount, description, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get level history
      const { data: levelHistory } = await supabaseService
        .from('user_level_history')
        .select('level, achieved_at, achievement')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false })
        .limit(limit);

      // Get achievement unlocks
      const { data: achievementUnlocks } = await supabaseService
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(limit);

      // Get referral history
      const { data: referralHistory } = await supabaseService
        .from('referrals')
        .select('status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Combine and sort all activities
      const activities: Activity[] = [];

      // Add XP events
      (xpEvents || []).forEach(event => {
        activities.push({
          id: `xp-${event.created_at}`,
          type: this.mapXPEventToActivity(event.type),
          description: event.description,
          metadata: event.metadata,
          createdAt: event.created_at,
          xp: event.amount,
        });
      });

      // Add level ups
      (levelHistory || []).forEach(level => {
        activities.push({
          id: `level-${level.achieved_at}`,
          type: 'level_up',
          description: `Reached level ${level.level}`,
          metadata: { level: level.level, achievement: level.achievement },
          createdAt: level.achieved_at,
        });
      });

      // Add achievement unlocks
      (achievementUnlocks || []).forEach(achievement => {
        activities.push({
          id: `achievement-${achievement.unlocked_at}`,
          type: 'achievement_unlocked',
          description: `Achievement unlocked`,
          metadata: { achievementId: achievement.achievement_id },
          createdAt: achievement.unlocked_at,
        });
      });

      // Add referral events
      (referralHistory || []).forEach(referral => {
        activities.push({
          id: `referral-${referral.created_at}`,
          type: referral.status === 'completed' ? 'referral_completed' : 'referral_created',
          description: `Referral ${referral.status}`,
          metadata: { status: referral.status },
          createdAt: referral.created_at,
        });
      });

      // Sort by date and limit
      return activities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Map XP event type to activity type
   */
  private static mapXPEventToActivity(type: string): Activity['type'] {
    switch (type) {
      case 'referral_created':
        return 'referral_created';
      case 'referral_completed':
        return 'referral_completed';
      case 'achievement':
        return 'achievement_unlocked';
      default:
        return 'level_up'; // Default for bonus/penalty events
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const { data, error } = await supabaseService
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Return default preferences
        return {
          theme: 'auto',
          notifications: {
            levelUp: true,
            achievements: true,
            referrals: true,
            weeklyReport: false,
          },
          privacy: {
            showProfile: true,
            showStats: true,
            showActivity: true,
          },
        };
      }

      return {
        theme: data.theme,
        notifications: {
          levelUp: data.notifications?.levelUp ?? true,
          achievements: data.notifications?.achievements ?? true,
          referrals: data.notifications?.referrals ?? true,
          weeklyReport: data.notifications?.weeklyReport ?? false,
        },
        privacy: {
          showProfile: data.privacy?.showProfile ?? true,
          showStats: data.privacy?.showStats ?? true,
          showActivity: data.privacy?.showActivity ?? true,
        },
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Get default preferences
   */
  private static getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      notifications: {
        levelUp: true,
        achievements: true,
        referrals: true,
        weeklyReport: false,
      },
      privacy: {
        showProfile: true,
        showStats: true,
        showActivity: true,
      },
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, update: ProfileUpdate): Promise<UserProfile> {
    try {
      // Update user data
      if (update.username || update.avatarUrl) {
        const { error } = await supabaseService
          .from('users')
          .update({
            username: update.username,
            avatar_url: update.avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) {
          throw error;
        }
      }

      // Update preferences
      if (update.preferences) {
        const { error } = await supabaseService
          .from('user_preferences')
          .upsert({
            user_id: userId,
            theme: update.preferences.theme,
            notifications: update.preferences.notifications,
            privacy: update.preferences.privacy,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          throw error;
        }
      }

      // Update last active timestamp
      await supabaseService
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId);

      // Return updated profile
      return await this.getProfile(userId);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Get public profile (for other users to view)
   */
  static async getPublicProfile(userId: string): Promise<Partial<UserProfile>> {
    try {
      const fullProfile = await this.getProfile(userId);
      const preferences = await this.getUserPreferences(userId);

      // Filter based on privacy settings
      const publicProfile: Partial<UserProfile> = {
        id: fullProfile.id,
        username: preferences.privacy.showProfile ? fullProfile.username : undefined,
        avatarUrl: preferences.privacy.showProfile ? fullProfile.avatarUrl : undefined,
        level: fullProfile.level,
        characterClass: fullProfile.characterClass,
        stats: preferences.privacy.showStats ? fullProfile.stats : undefined,
        achievements: fullProfile.achievements.filter(a => a.unlockedAt), // Only show unlocked achievements
        recentActivity: preferences.privacy.showActivity ? fullProfile.recentActivity : [],
      };

      return publicProfile;
    } catch (error) {
      console.error('Error fetching public profile:', error);
      throw new Error('Failed to fetch public profile');
    }
  }

  /**
   * Search users by username
   */
  static async searchUsers(query: string, limit: number = 10): Promise<Partial<UserProfile>[]> {
    try {
      const { data, error } = await supabaseService
        .from('users')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []).map(user => ({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatar_url,
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Update user's last active timestamp
   */
  static async updateLastActive(userId: string): Promise<void> {
    try {
      await supabaseService
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }
}
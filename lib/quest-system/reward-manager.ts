import { supabase, supabaseService } from '@/lib/supabase-client';
import { QuestReward } from '@/lib/types/quest-types';

export class RewardManager {
  /**
   * Distribute quest rewards to a user
   */
  static async distributeQuestRewards(userId: string, questId: string): Promise<boolean> {
    try {
      // Get quest details
      const { data: quest, error: questError } = await supabaseService
        .from('quests')
        .select('*')
        .eq('id', questId)
        .single();

      if (questError || !quest) {
        console.error('Error fetching quest for reward distribution:', questError);
        return false;
      }

      // Get user current stats
      const { data: user, error: userError } = await supabaseService
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('Error fetching user for reward distribution:', userError);
        return false;
      }

      // Calculate character class multipliers
      const classMultiplier = this.getCharacterClassMultiplier(user.character_class);
      const finalXP = Math.round(quest.reward_xp * classMultiplier.xp);
      const finalCommission = quest.reward_commission * classMultiplier.commission;

      // Update user with rewards
      const { error: updateError } = await supabaseService
        .from('users')
        .update({
          experience_points: finalXP,
          total_commission: finalCommission,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user rewards:', updateError);
        return false;
      }

      // Mark user quest reward as claimed
      const { error: claimError } = await supabaseService
        .from('user_quests')
        .update({
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('quest_id', questId);

      if (claimError) {
        console.error('Error marking reward as claimed:', claimError);
        return false;
      }

      // Log reward distribution
      await this.logRewardDistribution(userId, questId, {
        xp: finalXP,
        commission: finalCommission,
        original_xp: quest.reward_xp,
        original_commission: quest.reward_commission,
        multiplier: classMultiplier
      });

      // Check for achievements
      await this.checkAchievementUnlock(userId, user, finalXP, finalCommission);

      return true;
    } catch (error) {
      console.error('Error in reward distribution:', error);
      return false;
    }
  }

  /**
   * Calculate and preview quest rewards
   */
  static async calculateQuestRewards(userId: string, questId: string): Promise<QuestReward | null> {
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single();

    if (questError || !quest) {
      return null;
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('character_class')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return null;
    }

    const classMultiplier = this.getCharacterClassMultiplier(user.character_class);
    const finalXP = Math.round(quest.reward_xp * classMultiplier.xp);
    const finalCommission = quest.reward_commission * classMultiplier.commission;

    return {
      xp: finalXP,
      commission: finalCommission,
      achievements: await this.getPotentialAchievements(userId, quest)
    };
  }

  /**
   * Bulk distribute rewards for multiple completed quests
   */
  static async bulkDistributeRewards(userId: string): Promise<{
    success: boolean;
    processed_quests: number;
    total_xp: number;
    total_commission: number;
    errors: string[];
  }> {
    const { data: completedQuests, error: questError } = await supabase
      .from('user_quests')
      .select('*, quest:quests(*)')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .eq('reward_claimed', false);

    if (questError || !completedQuests) {
      return {
        success: false,
        processed_quests: 0,
        total_xp: 0,
        total_commission: 0,
        errors: ['Failed to fetch completed quests']
      };
    }

    const result = {
      success: true,
      processed_quests: 0,
      total_xp: 0,
      total_commission: 0,
      errors: [] as string[]
    };

    for (const userQuest of completedQuests) {
      const success = await this.distributeQuestRewards(userId, userQuest.quest_id);

      if (success) {
        result.processed_quests++;
        result.total_xp += userQuest.quest.reward_xp;
        result.total_commission += userQuest.quest.reward_commission;
      } else {
        result.errors.push(`Failed to distribute rewards for quest ${userQuest.quest_id}`);
      }
    }

    return result;
  }

  /**
   * Get reward history for a user
   */
  static async getRewardHistory(userId: string, limit: number = 50): Promise<Array<{
    id: string;
    quest_title: string;
    quest_type: string;
    xp_earned: number;
    commission_earned: number;
    claimed_at: string;
    character_class: string;
  }>> {
    const { data, error } = await supabase
      .from('user_quests')
      .select(`
        id,
        quest_id,
        reward_claimed_at,
        quest:quests(title, quest_type, reward_xp, reward_commission),
        user:users(character_class)
      `)
      .eq('user_id', userId)
      .eq('reward_claimed', true)
      .order('reward_claimed_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      quest_title: item.quest?.[0]?.title || 'Unknown Quest',
      quest_type: item.quest?.[0]?.quest_type || 'unknown',
      xp_earned: item.quest?.[0]?.reward_xp || 0,
      commission_earned: item.quest?.[0]?.reward_commission || 0,
      claimed_at: item.reward_claimed_at || '',
      character_class: (item.user as any)?.[0]?.character_class || 'unknown'
    }));
  }

  /**
   * Get reward statistics for a user
   */
  static async getRewardStats(userId: string): Promise<{
    total_xp_earned: number;
    total_commission_earned: number;
    total_quests_completed: number;
    average_xp_per_quest: number;
    average_commission_per_quest: number;
    most_profitable_quest_type: string;
    reward_streak: number;
  }> {
    const { data: completedQuests, error } = await supabase
      .from('user_quests')
      .select(`
        reward_claimed_at,
        quest:quests(quest_type, reward_xp, reward_commission)
      `)
      .eq('user_id', userId)
      .eq('reward_claimed', true);

    if (error || !completedQuests) {
      return {
        total_xp_earned: 0,
        total_commission_earned: 0,
        total_quests_completed: 0,
        average_xp_per_quest: 0,
        average_commission_per_quest: 0,
        most_profitable_quest_type: 'none',
        reward_streak: 0
      };
    }

    const totalXP = completedQuests.reduce((sum, q) => sum + (q.quest?.[0]?.reward_xp || 0), 0);
    const totalCommission = completedQuests.reduce((sum, q) => sum + (q.quest?.[0]?.reward_commission || 0), 0);
    const totalQuests = completedQuests.length;

    const typeStats: Record<string, { total: number; count: number }> = {};
    completedQuests.forEach(q => {
      const type = q.quest?.[0]?.quest_type || 'unknown';
      const commission = q.quest?.[0]?.reward_commission || 0;

      if (!typeStats[type]) {
        typeStats[type] = { total: 0, count: 0 };
      }

      typeStats[type].total += commission;
      typeStats[type].count += 1;
    });

    const mostProfitableType = Object.entries(typeStats)
      .sort(([,a], [,b]) => b.total - a.total)[0]?.[0] || 'none';

    return {
      total_xp_earned: totalXP,
      total_commission_earned: totalCommission,
      total_quests_completed: totalQuests,
      average_xp_per_quest: totalQuests > 0 ? totalXP / totalQuests : 0,
      average_commission_per_quest: totalQuests > 0 ? totalCommission / totalQuests : 0,
      most_profitable_quest_type: mostProfitableType,
      reward_streak: this.calculateRewardStreak(completedQuests)
    };
  }

  // Private helper methods
  private static getCharacterClassMultiplier(characterClass: string): { xp: number; commission: number } {
    const multipliers: Record<string, { xp: number; commission: number }> = {
      'scout': { xp: 1.2, commission: 1.1 },
      'sage': { xp: 1.5, commission: 1.0 },
      'champion': { xp: 1.3, commission: 1.2 }
    };

    return multipliers[characterClass] || { xp: 1.0, commission: 1.0 };
  }

  private static async logRewardDistribution(
    userId: string,
    questId: string,
    rewards: {
      xp: number;
      commission: number;
      original_xp: number;
      original_commission: number;
      multiplier: { xp: number; commission: number };
    }
  ): Promise<void> {
    // This would log to a reward_transactions table
    // For now, we'll just log to console
    console.log(`Reward distributed: User ${userId}, Quest ${questId}, XP: ${rewards.xp}, Commission: ${rewards.commission}`);
  }

  private static async checkAchievementUnlock(
    userId: string,
    user: any,
    xpEarned: number,
    commissionEarned: number
  ): Promise<void> {
    // This would check if the user has unlocked any achievements
    // based on the rewards received
    // Implementation would depend on the achievement system
  }

  private static async getPotentialAchievements(userId: string, quest: any): Promise<string[]> {
    // This would return potential achievements that could be unlocked
    // by completing this quest
    return [];
  }

  private static calculateRewardStreak(completedQuests: any[]): number {
    if (completedQuests.length === 0) return 0;

    const sortedQuests = completedQuests.sort((a, b) =>
      new Date(b.reward_claimed_at).getTime() - new Date(a.reward_claimed_at).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const quest of sortedQuests) {
      const questDate = new Date(quest.reward_claimed_at);
      questDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - questDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0 || diffDays === 1) {
        streak++;
        currentDate = questDate;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Create special rewards for milestone achievements
   */
  static async createMilestoneReward(userId: string, milestoneType: string, milestoneValue: number): Promise<boolean> {
    try {
      // This would create special milestone rewards
      // like badges, titles, or special items
      console.log(`Creating milestone reward for user ${userId}: ${milestoneType} ${milestoneValue}`);
      return true;
    } catch (error) {
      console.error('Error creating milestone reward:', error);
      return false;
    }
  }

  /**
   * Get pending rewards for a user
   */
  static async getPendingRewards(userId: string): Promise<Array<{
    user_quest_id: string;
    quest_title: string;
    xp_reward: number;
    commission_reward: number;
    completed_at: string;
  }>> {
    const { data, error } = await supabase
      .from('user_quests')
      .select(`
        id,
        quest_id,
        completed_at,
        quest:quests(title, reward_xp, reward_commission)
      `)
      .eq('user_id', userId)
      .eq('is_completed', true)
      .eq('reward_claimed', false);

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      user_quest_id: item.id,
      quest_title: item.quest?.[0]?.title || 'Unknown Quest',
      xp_reward: item.quest?.[0]?.reward_xp || 0,
      commission_reward: item.quest?.[0]?.reward_commission || 0,
      completed_at: item.completed_at || ''
    }));
  }
}
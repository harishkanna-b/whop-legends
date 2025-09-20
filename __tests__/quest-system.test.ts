import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client before imports
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  },
  supabaseService: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  }
}));

import { QuestEngine } from '@/lib/quest-system/quest-engine';
import { QuestGenerator } from '@/lib/quest-system/quest-generator';
import { ProgressTracker } from '@/lib/quest-system/progress-tracker';
import { RewardManager } from '@/lib/quest-system/reward-manager';
import { supabase, supabaseService } from '@/lib/supabase-client';

describe('Quest System', () => {
  let questGenerator: QuestGenerator;
  let progressTracker: ProgressTracker;
  let rewardManager: RewardManager;

  const mockUser = {
    id: 'user-123',
    level: 5,
    character_class: 'scout',
    total_referrals: 10,
    total_commission: 1000,
    achievements_count: 3
  };

  const mockCompany = {
    id: 'company-123',
    settings: {
      quest_difficulty: 'medium',
      reward_multiplier: 1.0
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    questGenerator = new QuestGenerator();
    progressTracker = new ProgressTracker();
    rewardManager = new RewardManager();
  });

  describe('QuestEngine', () => {
    it('should generate user quests', async () => {
      const mockQuests = [
        {
          id: 'quest-1',
          title: 'Refer 5 Friends',
          description: 'Refer 5 new users',
          quest_type: 'daily',
          difficulty: 'easy',
          target_type: 'referrals',
          target_value: 5,
          reward_xp: 100,
          reward_commission: 10
        }
      ];

      supabaseService.from.mockReturnValue({
        select: supabaseService.select,
        insert: supabaseService.insert,
        eq: supabaseService.eq
      });

      supabaseService.select.mockReturnValue(supabaseService);
      supabaseService.insert.mockResolvedValue({
        data: mockQuests,
        error: null
      });

      const result = await QuestEngine.generateUserQuests({
        company_id: mockCompany.id,
        user_id: mockUser.id,
        user_level: mockUser.level,
        character_class: mockUser.character_class,
        quest_type: 'daily'
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Refer 5 Friends');
    });

    it('should update quest progress', async () => {
      const mockQuest = {
        id: 'quest-1',
        user_id: mockUser.id,
        quest_id: 'template-1',
        progress_value: 3,
        is_completed: false
      };

      supabaseService.from.mockReturnValue({
        update: supabaseService.update,
        eq: supabaseService.eq,
        select: supabaseService.select
      });

      supabaseService.update.mockReturnValue(mockSupabase);
      supabaseService.eq.mockReturnValue(mockSupabase);
      supabaseService.select.mockResolvedValue({
        data: { ...mockQuest, progress_value: 5 },
        error: null
      });

      const result = await QuestEngine.updateQuestProgress(mockUser.id, 'quest-1', 5);

      expect(result.progress_value).toBe(5);
    });

    it('should mark quest as completed when target reached', async () => {
      const mockQuest = {
        id: 'quest-1',
        user_id: mockUser.id,
        quest_id: 'template-1',
        progress_value: 5,
        target_value: 5,
        is_completed: false
      };

      supabaseService.from.mockReturnValue({
        update: supabaseService.update,
        eq: supabaseService.eq,
        select: supabaseService.select
      });

      supabaseService.update.mockReturnValue(mockSupabase);
      supabaseService.eq.mockReturnValue(mockSupabase);
      supabaseService.select.mockResolvedValue({
        data: { ...mockQuest, is_completed: true },
        error: null
      });

      const result = await QuestEngine.updateQuestProgress(mockUser.id, 'quest-1', 5);

      expect(result.is_completed).toBe(true);
    });
  });

  describe('QuestGenerator', () => {
    it('should generate daily quests based on user level', async () => {
      const quests = await questGenerator.generateDailyQuests(mockUser, mockCompany);

      expect(quests.length).toBeGreaterThan(0);
      expect(quests[0].quest_type).toBe('daily');
    });

    it('should scale quest difficulty with user level', async () => {
      const beginnerUser = { ...mockUser, level: 1 };
      const advancedUser = { ...mockUser, level: 10 };

      const beginnerQuests = await questGenerator.generateDailyQuests(beginnerUser, mockCompany);
      const advancedQuests = await questGenerator.generateDailyQuests(advancedUser, mockCompany);

      const avgBeginnerDifficulty = beginnerQuests.reduce((sum, q) => sum + q.target_value, 0) / beginnerQuests.length;
      const avgAdvancedDifficulty = advancedQuests.reduce((sum, q) => sum + q.target_value, 0) / advancedQuests.length;

      expect(avgAdvancedDifficulty).toBeGreaterThan(avgBeginnerDifficulty);
    });

    it('should apply character class multipliers to rewards', async () => {
      const scoutUser = { ...mockUser, character_class: 'scout' };
      const sageUser = { ...mockUser, character_class: 'sage' };

      const scoutQuests = await questGenerator.generateDailyQuests(scoutUser, mockCompany);
      const sageQuests = await questGenerator.generateDailyQuests(sageUser, mockCompany);

      const scoutRewards = scoutQuests.reduce((sum, q) => sum + q.reward_xp, 0);
      const sageRewards = sageQuests.reduce((sum, q) => sum + q.reward_xp, 0);

      expect(sageRewards).toBeGreaterThan(scoutRewards);
    });
  });

  describe('ProgressTracker', () => {
    it('should track user progress across different metrics', async () => {
      const progress = await progressTracker.getUserQuestProgress(mockUser.id);

      expect(progress).toHaveProperty('referrals');
      expect(progress).toHaveProperty('commission');
      expect(progress).toHaveProperty('achievements');
    });

    it('should check for completed quests', async () => {
      const completedQuests = await progressTracker.checkQuestCompletions(mockUser.id);

      expect(Array.isArray(completedQuests)).toBe(true);
    });

    it('should handle progress updates correctly', async () => {
      const metricType = 'referrals';
      const newValue = 15;

      supabaseService.from.mockReturnValue({
        update: supabaseService.update,
        eq: supabaseService.eq
      });

      supabaseService.update.mockReturnValue(mockSupabase);
      supabaseService.eq.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const result = await progressTracker.trackUserProgress(
        mockUser.id,
        metricType,
        newValue
      );

      expect(result.success).toBe(true);
    });
  });

  describe('RewardManager', () => {
    it('should calculate quest rewards with character class multipliers', () => {
      const quest = {
        reward_xp: 100,
        reward_commission: 10
      };

      const scoutRewards = rewardManager.calculateQuestRewards(quest, 'scout');
      const sageRewards = rewardManager.calculateQuestRewards(quest, 'sage');

      expect(sageRewards.xp).toBeGreaterThan(scoutRewards.xp);
    });

    it('should distribute rewards to user', async () => {
      const reward = {
        xp: 150,
        commission: 15
      };

      supabaseService.from.mockReturnValue({
        update: supabaseService.update,
        eq: supabaseService.eq,
        select: supabaseService.select
      });

      supabaseService.update.mockReturnValue(mockSupabase);
      supabaseService.eq.mockReturnValue(mockSupabase);
      supabaseService.select.mockResolvedValue({
        data: {
          id: mockUser.id,
          total_xp: mockUser.total_xp + reward.xp,
          total_commission: mockUser.total_commission + reward.commission
        },
        error: null
      });

      const result = await rewardManager.distributeQuestRewards(mockUser.id, reward);

      expect(result.total_xp).toBe(mockUser.total_xp + reward.xp);
      expect(result.total_commission).toBe(mockUser.total_commission + reward.commission);
    });

    it('should handle milestone rewards', async () => {
      const milestoneQuest = {
        id: 'milestone-quest',
        is_milestone: true,
        milestone_type: 'level_10',
        reward_xp: 500,
        reward_commission: 50,
        special_rewards: ['badge_pioneer']
      };

      supabaseService.from.mockReturnValue({
        insert: supabaseService.insert,
        update: supabaseService.update,
        eq: supabaseService.eq
      });

      supabaseService.insert.mockResolvedValue({
        data: { success: true },
        error: null
      });

      supabaseService.update.mockReturnValue(mockSupabase);
      supabaseService.eq.mockReturnValue(mockSupabase);

      const result = await rewardManager.distributeQuestRewards(mockUser.id, milestoneQuest);

      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete quest lifecycle', async () => {
      // Generate quest
      const quests = await QuestEngine.generateUserQuests(mockUser.id, mockCompany.id, 'daily');
      expect(quests.length).toBeGreaterThan(0);

      const questId = quests[0].id;

      // Update progress
      const updatedQuest = await QuestEngine.updateQuestProgress(mockUser.id, questId, 5);
      expect(updatedQuest.progress_value).toBe(5);

      // Check completion
      const completedQuests = await progressTracker.checkQuestCompletions(mockUser.id);
      expect(completedQuests.length).toBeGreaterThanOrEqual(0);

      // Claim rewards (if completed)
      if (completedQuests.length > 0) {
        const rewards = rewardManager.calculateQuestRewards(
          completedQuests[0].quest,
          mockUser.character_class
        );
        expect(rewards.xp).toBeGreaterThan(0);
        expect(rewards.commission).toBeGreaterThan(0);
      }
    });

    it('should handle error cases gracefully', async () => {
      // Test with invalid user ID
      const result = await QuestEngine.getUserActiveQuests('invalid-user');
      expect(result).toEqual([]);

      // Test with invalid quest ID
      const progressResult = await QuestEngine.updateQuestProgress(mockUser.id, 'invalid-quest', 10);
      expect(progressResult).toBeNull();
    });
  });
});
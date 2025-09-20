import { RewardManager } from '@/lib/quest-system/reward-manager';
import { QuestReward, UserQuest, Quest } from '@/lib/types/quest-types';
import { SecurityValidator } from '@/lib/security/validation';

// Mock dependencies
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(),
  },
  supabaseService: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/security/validation', () => ({
  SecurityValidator: {
    validateUserId: jest.fn(),
  },
}));

describe('RewardManager - Quest Reward Distribution', () => {
  const mockUserId = 'test-user-id';
  const mockUserQuestId = 'test-user-quest-id';
  const mockQuestId = 'test-quest-id';
  const mockCompanyId = 'test-company-id';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default validation responses
    (SecurityValidator.validateUserId as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
    });
  });

  describe('Reward Calculation', () => {
    it('should calculate base rewards correctly', () => {
      const quest: Quest = {
        id: mockQuestId,
        company_id: mockCompanyId,
        title: 'Test Quest',
        description: 'Test quest description',
        quest_type: 'daily',
        difficulty: 'easy',
        target_type: 'referrals',
        target_value: 10,
        reward_xp: 100,
        reward_commission: 10.00,
        is_active: true,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const rewards = RewardManager.calculateQuestRewards(quest);

      expect(rewards.xp).toBe(100);
      expect(rewards.commission).toBe(10.00);
    });

    it('should apply character class multipliers correctly', () => {
      const baseRewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      // Scout: 1.1x XP, 1.0x commission
      const scoutRewards = RewardManager.applyCharacterClassMultiplier(baseRewards, 'scout');
      expect(scoutRewards.xp).toBe(110);
      expect(scoutRewards.commission).toBe(10.00);

      // Sage: 1.0x XP, 1.2x commission
      const sageRewards = RewardManager.applyCharacterClassMultiplier(baseRewards, 'sage');
      expect(sageRewards.xp).toBe(100);
      expect(sageRewards.commission).toBe(12.00);

      // Champion: 1.15x XP, 1.1x commission
      const championRewards = RewardManager.applyCharacterClassMultiplier(baseRewards, 'champion');
      expect(championRewards.xp).toBe(115);
      expect(championRewards.commission).toBe(11.00);
    });

    it('should apply difficulty multipliers', () => {
      const baseRewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      const easyRewards = RewardManager.applyDifficultyMultiplier(baseRewards, 'easy');
      const mediumRewards = RewardManager.applyDifficultyMultiplier(baseRewards, 'medium');
      const hardRewards = RewardManager.applyDifficultyMultiplier(baseRewards, 'hard');
      const epicRewards = RewardManager.applyDifficultyMultiplier(baseRewards, 'epic');

      expect(easyRewards.xp).toBe(100); // 1.0x
      expect(mediumRewards.xp).toBe(150); // 1.5x
      expect(hardRewards.xp).toBe(200); // 2.0x
      expect(epicRewards.xp).toBe(300); // 3.0x
    });

    it('should apply quest type multipliers', () => {
      const baseRewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      const dailyRewards = RewardManager.applyQuestTypeMultiplier(baseRewards, 'daily');
      const weeklyRewards = RewardManager.applyQuestTypeMultiplier(baseRewards, 'weekly');
      const monthlyRewards = RewardManager.applyQuestTypeMultiplier(baseRewards, 'monthly');

      expect(dailyRewards.xp).toBe(100); // 1.0x
      expect(weeklyRewards.xp).toBe(200); // 2.0x
      expect(monthlyRewards.xp).toBe(500); // 5.0x
    });

    it('should calculate streak bonuses', () => {
      const baseRewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      // No streak
      const noStreakRewards = RewardManager.applyStreakBonus(baseRewards, 0);
      expect(noStreakRewards.xp).toBe(100);

      // 3-day streak
      const streak3Rewards = RewardManager.applyStreakBonus(baseRewards, 3);
      expect(streak3Rewards.xp).toBe(110); // 1.1x

      // 7-day streak
      const streak7Rewards = RewardManager.applyStreakBonus(baseRewards, 7);
      expect(streak7Rewards.xp).toBe(125); // 1.25x

      // 30-day streak
      const streak30Rewards = RewardManager.applyStreakBonus(baseRewards, 30);
      expect(streak30Rewards.xp).toBe(150); // 1.5x
    });

    it('should round monetary rewards correctly', () => {
      const unroundedRewards: QuestReward = {
        xp: 100,
        commission: 10.5678,
      };

      const roundedRewards = RewardManager.roundMonetaryRewards(unroundedRewards);

      expect(roundedRewards.commission).toBe(10.57);
      expect(roundedRewards.xp).toBe(100); // XP should not be rounded
    });
  });

  describe('Reward Distribution', () => {
    it('should distribute rewards to user successfully', async () => {
      const userQuest: UserQuest = {
        id: mockUserQuestId,
        user_id: mockUserId,
        quest_id: mockQuestId,
        progress_value: 10,
        is_completed: true,
        reward_claimed: false,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const quest: Quest = {
        id: mockQuestId,
        company_id: mockCompanyId,
        title: 'Test Quest',
        description: 'Test quest description',
        quest_type: 'daily',
        difficulty: 'easy',
        target_type: 'referrals',
        target_value: 10,
        reward_xp: 100,
        reward_commission: 10.00,
        is_active: true,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock user quest retrieval
      const mockSupabase = require('@/lib/supabase-client').supabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: userQuest, error: null }),
            }),
          }),
        }),
      });

      // Mock user update
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Mock quest reward claim update
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await RewardManager.distributeQuestRewards(userQuest, quest);

      expect(result.success).toBe(true);
      expect(result.rewards).toEqual(
        expect.objectContaining({
          xp: 100,
          commission: 10.00,
        })
      );
    });

    it('should validate user ID before distributing rewards', async () => {
      (SecurityValidator.validateUserId as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid user ID'],
      });

      const userQuest: UserQuest = {
        id: mockUserQuestId,
        user_id: mockUserId,
        quest_id: mockQuestId,
        progress_value: 10,
        is_completed: true,
        reward_claimed: false,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const quest: Quest = {
        id: mockQuestId,
        company_id: mockCompanyId,
        title: 'Test Quest',
        description: 'Test quest description',
        quest_type: 'daily',
        difficulty: 'easy',
        target_type: 'referrals',
        target_value: 10,
        reward_xp: 100,
        reward_commission: 10.00,
        is_active: true,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await expect(
        RewardManager.distributeQuestRewards(userQuest, quest)
      ).rejects.toThrow('Invalid user ID');
    });

    it('should not distribute rewards for incomplete quests', async () => {
      const userQuest: UserQuest = {
        id: mockUserQuestId,
        user_id: mockUserId,
        quest_id: mockQuestId,
        progress_value: 5,
        is_completed: false,
        reward_claimed: false,
        started_at: new Date().toISOString(),
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const quest: Quest = {
        id: mockQuestId,
        company_id: mockCompanyId,
        title: 'Test Quest',
        description: 'Test quest description',
        quest_type: 'daily',
        difficulty: 'easy',
        target_type: 'referrals',
        target_value: 10,
        reward_xp: 100,
        reward_commission: 10.00,
        is_active: true,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await RewardManager.distributeQuestRewards(userQuest, quest);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Quest not completed');
    });

    it('should not distribute rewards for already claimed rewards', async () => {
      const userQuest: UserQuest = {
        id: mockUserQuestId,
        user_id: mockUserId,
        quest_id: mockQuestId,
        progress_value: 10,
        is_completed: true,
        reward_claimed: true,
        reward_claimed_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const quest: Quest = {
        id: mockQuestId,
        company_id: mockCompanyId,
        title: 'Test Quest',
        description: 'Test quest description',
        quest_type: 'daily',
        difficulty: 'easy',
        target_type: 'referrals',
        target_value: 10,
        reward_xp: 100,
        reward_commission: 10.00,
        is_active: true,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await RewardManager.distributeQuestRewards(userQuest, quest);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Rewards already claimed');
    });

    it('should handle database errors during reward distribution', async () => {
      const userQuest: UserQuest = {
        id: mockUserQuestId,
        user_id: mockUserId,
        quest_id: mockQuestId,
        progress_value: 10,
        is_completed: true,
        reward_claimed: false,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const quest: Quest = {
        id: mockQuestId,
        company_id: mockCompanyId,
        title: 'Test Quest',
        description: 'Test quest description',
        quest_type: 'daily',
        difficulty: 'easy',
        target_type: 'referrals',
        target_value: 10,
        reward_xp: 100,
        reward_commission: 10.00,
        is_active: true,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock database error
      const mockSupabase = require('@/lib/supabase-client').supabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: userQuest, error: null }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: 'Database error' }),
        }),
      });

      const result = await RewardManager.distributeQuestRewards(userQuest, quest);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Database error');
    });
  });

  describe('Reward History and Tracking', () => {
    it('should create reward transaction records', async () => {
      const rewardData: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      const transactionId = await RewardManager.createRewardTransaction(
        mockUserId,
        mockQuestId,
        rewardData
      );

      expect(transactionId).toBeDefined();
      expect(typeof transactionId).toBe('string');
    });

    it('should track user reward statistics', async () => {
      const userId = 'test-user-id';
      const stats = await RewardManager.getUserRewardStats(userId);

      expect(stats).toEqual(
        expect.objectContaining({
          total_xp_earned: expect.any(Number),
          total_commission_earned: expect.any(Number),
          quests_completed: expect.any(Number),
          average_reward_per_quest: expect.any(Number),
        })
      );
    });

    it('should calculate reward distribution analytics', async () => {
      const companyId = 'test-company-id';
      const analytics = await RewardManager.getRewardDistributionAnalytics(companyId);

      expect(analytics).toEqual(
        expect.objectContaining({
          total_rewards_distributed: expect.any(Number),
          total_xp_distributed: expect.any(Number),
          total_commission_distributed: expect.any(Number),
          average_reward_per_user: expect.any(Number),
          reward_distribution_by_type: expect.any(Object),
        })
      );
    });
  });

  describe('Special Rewards and Bonuses', () => {
    it('should calculate first-completion bonuses', () => {
      const baseRewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      const firstCompletionBonus = RewardManager.calculateFirstCompletionBonus(baseRewards, true);
      const noBonus = RewardManager.calculateFirstCompletionBonus(baseRewards, false);

      expect(firstCompletionBonus.xp).toBeGreaterThan(noBonus.xp);
      expect(firstCompletionBonus.commission).toBeGreaterThan(noBonus.commission);
    });

    it('should calculate speed completion bonuses', () => {
      const baseRewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      const startTime = Date.now() - 30 * 60 * 1000; // 30 minutes ago
      const endTime = Date.now();

      // Fast completion (< 1 hour)
      const fastBonus = RewardManager.calculateSpeedBonus(baseRewards, startTime, endTime);

      // Slow completion (> 24 hours)
      const slowBonus = RewardManager.calculateSpeedBonus(
        baseRewards,
        Date.now() - 25 * 60 * 60 * 1000,
        endTime
      );

      expect(fastBonus.xp).toBeGreaterThan(slowBonus.xp);
    });

    it('should calculate perfect completion bonuses', () => {
      const baseRewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      const perfectBonus = RewardManager.calculatePerfectCompletionBonus(baseRewards, true);
      const imperfectBonus = RewardManager.calculatePerfectCompletionBonus(baseRewards, false);

      expect(perfectBonus.xp).toBeGreaterThan(imperfectBonus.xp);
    });
  });

  describe('Reward Validation', () => {
    it('should validate reward amounts', () => {
      const validRewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      const invalidXP: QuestReward = {
        xp: -100,
        commission: 10.00,
      };

      const invalidCommission: QuestReward = {
        xp: 100,
        commission: -10.00,
      };

      expect(() => RewardManager.validateRewards(validRewards)).not.toThrow();
      expect(() => RewardManager.validateRewards(invalidXP)).toThrow();
      expect(() => RewardManager.validateRewards(invalidCommission)).toThrow();
    });

    it('should validate reward distribution limits', () => {
      const reasonableRewards: QuestReward = {
        xp: 1000,
        commission: 100.00,
      };

      const excessiveRewards: QuestReward = {
        xp: 1000000,
        commission: 1000000.00,
      };

      expect(() => RewardManager.validateRewardLimits(reasonableRewards)).not.toThrow();
      expect(() => RewardManager.validateRewardLimits(excessiveRewards)).toThrow();
    });
  });

  describe('Reward Notifications', () => {
    it('should generate reward notification messages', () => {
      const rewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      const notification = RewardManager.generateRewardNotification(
        mockUserId,
        mockQuestId,
        'Test Quest',
        rewards
      );

      expect(notification).toEqual(
        expect.objectContaining({
          user_id: mockUserId,
          quest_id: mockQuestId,
          message: expect.stringContaining('100 XP'),
          rewards,
          timestamp: expect.any(Number),
        })
      );
    });

    it('should handle different notification types', () => {
      const rewards: QuestReward = {
        xp: 100,
        commission: 10.00,
      };

      const achievementNotification = RewardManager.generateRewardNotification(
        mockUserId,
        mockQuestId,
        'Test Quest',
        rewards,
        'achievement'
      );

      const milestoneNotification = RewardManager.generateRewardNotification(
        mockUserId,
        mockQuestId,
        'Test Quest',
        rewards,
        'milestone'
      );

      expect(achievementNotification.notification_type).toBe('achievement');
      expect(milestoneNotification.notification_type).toBe('milestone');
    });
  });

  describe('Reward System Configuration', () => {
    it('should load reward system configuration', () => {
      const config = RewardManager.getRewardConfiguration();

      expect(config).toEqual(
        expect.objectContaining({
          base_multipliers: expect.any(Object),
          difficulty_multipliers: expect.any(Object),
          quest_type_multipliers: expect.any(Object),
          character_class_multipliers: expect.any(Object),
          bonus_thresholds: expect.any(Object),
        })
      );
    });

    it('should validate reward system configuration', () => {
      const validConfig = {
        base_multipliers: { xp: 1.0, commission: 1.0 },
        difficulty_multipliers: { easy: 1.0, medium: 1.5 },
        max_daily_rewards: { xp: 1000, commission: 100.00 },
      };

      const invalidConfig = {
        base_multipliers: { xp: -1.0, commission: 1.0 },
        difficulty_multipliers: { easy: 0, medium: 1.5 },
        max_daily_rewards: { xp: -1000, commission: 100.00 },
      };

      expect(() => RewardManager.validateRewardConfiguration(validConfig)).not.toThrow();
      expect(() => RewardManager.validateRewardConfiguration(invalidConfig)).toThrow();
    });
  });
});
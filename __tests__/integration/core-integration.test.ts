/**
 * Core Integration Tests for Whop Legends
 *
 * Tests the core functionality without external dependencies
 */

import { ReferralManager } from '@/lib/referral-tracking';
import { CharacterClassManager } from '@/lib/character-classes';
import { AchievementManager } from '@/lib/achievements';
import { socialManager } from '@/lib/social';

// Mock Supabase
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: [{ id: 'test' }], error: null }),
      update: jest.fn().mockResolvedValue({ data: [{ id: 'test' }], error: null }),
      single: jest.fn().mockResolvedValue({ data: { id: 'test', level: 1, xp: 0 }, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'test', level: 1, xp: 0 }, error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
  },
}));

// Mock Whop client
jest.mock('@/lib/whop-client', () => ({
  whopClient: {
    users: {
      getUser: jest.fn().mockResolvedValue({ id: 'test-user', name: 'Test User' }),
      getCurrentUser: jest.fn().mockResolvedValue({ id: 'test-user', name: 'Test User' }),
    },
  },
  whopApi: {
    getUser: jest.fn().mockResolvedValue({ id: 'test-user', name: 'Test User' }),
  },
}));

describe('Core Integration Tests', () => {
  let referralManager: ReferralManager;
  let characterManager: CharacterClassManager;
  let achievementManager: AchievementManager;
  // socialManager is already a singleton instance

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Initialize managers
    referralManager = new ReferralManager();
    characterManager = new CharacterClassManager();
    achievementManager = new AchievementManager();
    // socialManager is already a singleton instance
  });

  describe('Referral System Integration', () => {
    test('should create referral and update user stats', async () => {
      const referral = await referralManager.createReferral(
        'referrer-123',
        'referred-456',
        100,
        'webhook',
        { campaign: 'test-campaign' }
      );

      expect(referral).toBeDefined();
      expect(referral.referrerId).toBe('referrer-123');
      expect(referral.referredUserId).toBe('referred-456');
      expect(referral.value).toBe(100);
      expect(referral.commission).toBe(10); // 10% of 100
    });

    test('should calculate referral analytics correctly', async () => {
      const analytics = await referralManager.getReferralAnalytics('referrer-123', '7d');

      expect(analytics).toBeDefined();
      expect(analytics.timeframe).toBe('7d');
      expect(typeof analytics.totalClicks).toBe('number');
      expect(typeof analytics.uniqueClicks).toBe('number');
      expect(typeof analytics.totalReferrals).toBe('number');
      expect(typeof analytics.totalCommission).toBe('number');
    });

    test('should handle campaign management', async () => {
      const campaign = await referralManager.createCampaign({
        name: 'Test Campaign',
        description: 'Test campaign description',
        referrerId: 'referrer-123',
        commissionRate: 15,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });

      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.commissionRate).toBe(15);
    });
  });

  describe('Character Class System Integration', () => {
    test('should assign correct character class based on referral patterns', async () => {
      const referralStats = {
        totalReferrals: 15,
        successfulReferrals: 12,
        totalValue: 1500,
        averageReferralValue: 125,
        conversionRate: 0.8,
      };

      const recommendedClass = await characterManager.recommendCharacterClass(
        'user-123',
        referralStats
      );

      expect(recommendedClass).toBeDefined();
      expect(['scout', 'sage', 'champion']).toContain(recommendedClass);
    });

    test('should calculate level progression correctly', async () => {
      const currentXP = 250;
      const levelInfo = await characterManager.calculateLevelProgression(currentXP);

      expect(levelInfo).toBeDefined();
      expect(levelInfo.currentLevel).toBeGreaterThanOrEqual(1);
      expect(levelInfo.currentXP).toBe(currentXP);
      expect(levelInfo.nextLevelXP).toBeGreaterThan(currentXP);
      expect(levelInfo.progressToNext).toBeGreaterThan(0);
      expect(levelInfo.progressToNext).toBeLessThanOrEqual(1);
    });

    test('should handle level up correctly', async () => {
      const userId = 'user-123';
      const currentXP = 250;

      const result = await characterManager.handleLevelUp(userId, currentXP);

      expect(result).toBeDefined();
      expect(result.leveledUp).toBeDefined();
      expect(result.newLevel).toBeDefined();
      expect(result.achievementsUnlocked).toBeDefined();
      expect(Array.isArray(result.achievementsUnlocked)).toBe(true);
    });
  });

  describe('Achievement System Integration', () => {
    test('should unlock achievements based on user actions', async () => {
      const userId = 'user-123';
      const action = {
        type: 'referral_completed',
        data: { value: 100, referralCount: 5 },
      };

      const unlockedAchievements = await achievementManager.checkAndUnlockAchievements(
        userId,
        action
      );

      expect(Array.isArray(unlockedAchievements)).toBe(true);
      unlockedAchievements.forEach(achievement => {
        expect(achievement).toBeDefined();
        expect(achievement.name).toBeDefined();
        expect(achievement.description).toBeDefined();
        expect(achievement.rarity).toBeDefined();
      });
    });

    test('should get user achievement progress correctly', async () => {
      const userId = 'user-123';
      const progress = await achievementManager.getUserAchievementProgress(userId);

      expect(progress).toBeDefined();
      expect(progress.totalAchievements).toBeGreaterThan(0);
      expect(progress.unlockedAchievements).toBeGreaterThanOrEqual(0);
      expect(progress.completionRate).toBeGreaterThanOrEqual(0);
      expect(progress.completionRate).toBeLessThanOrEqual(1);
    });

    test('should handle achievement categories correctly', async () => {
      const categories = await achievementManager.getAchievementCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      categories.forEach(category => {
        expect(category.id).toBeDefined();
        expect(category.name).toBeDefined();
        expect(category.achievements).toBeDefined();
      });
    });
  });

  describe('Social Features Integration', () => {
    test('should manage friend relationships correctly', async () => {
      const userId = 'user-123';
      const friendId = 'user-456';

      // Send friend request
      const friendRequest = await socialManager.sendFriendRequest(userId, friendId);
      expect(friendRequest).toBeDefined();
      expect(friendRequest.fromUserId).toBe(userId);
      expect(friendRequest.toUserId).toBe(friendId);
      expect(friendRequest.status).toBe('pending');

      // Accept friend request
      const acceptedRequest = await socialManager.respondToFriendRequest(
        friendRequest.id,
        'accepted'
      );
      expect(acceptedRequest.status).toBe('accepted');

      // Check friend list
      const friends = await socialManager.getFriendList(userId);
      expect(Array.isArray(friends)).toBe(true);
      const friend = friends.find(f => f.userId === friendId);
      expect(friend).toBeDefined();
    });

    test('should manage team functionality correctly', async () => {
      const creatorId = 'user-123';
      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        maxMembers: 5,
      };

      // Create team
      const team = await socialManager.createTeam(creatorId, teamData);
      expect(team).toBeDefined();
      expect(team.name).toBe('Test Team');
      expect(team.creatorId).toBe(creatorId);

      // Add member to team
      const memberId = 'user-456';
      const updatedTeam = await socialManager.addTeamMember(team.id, memberId);
      expect(updatedTeam.members).toBeDefined();
      const member = updatedTeam.members.find((m: any) => m.userId === memberId);
      expect(member).toBeDefined();

      // Check team stats
      const stats = await socialManager.getTeamStats(team.id);
      expect(stats).toBeDefined();
      expect(stats.memberCount).toBe(2);
      expect(stats.totalReferrals).toBeDefined();
      expect(stats.totalXP).toBeDefined();
    });

    test('should handle social activity tracking', async () => {
      const userId = 'user-123';
      const activity = {
        type: 'referral_completed',
        data: { referralId: 'ref-123', value: 100 },
      };

      // Log activity
      const loggedActivity = await socialManager.logActivity(userId, activity);
      expect(loggedActivity).toBeDefined();
      expect(loggedActivity.userId).toBe(userId);
      expect(loggedActivity.type).toBe('referral_completed');

      // Get user activity feed
      const activities = await socialManager.getUserActivity(userId, 10);
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);

      // Check if our activity is in the feed
      const recentActivity = activities.find(a => a.type === 'referral_completed');
      expect(recentActivity).toBeDefined();
    });
  });

  describe('Cross-System Integration', () => {
    test('should handle complete referral flow across all systems', async () => {
      const referrerId = 'referrer-123';
      const referredId = 'referred-456';

      // 1. Create referral
      const referral = await referralManager.createReferral(
        referrerId,
        referredId,
        100,
        'test_source'
      );

      // 2. Process referral completion
      const result = await referralManager.processReferralCompletion(referral.id);

      // 3. Check character class progression
      const characterClass = await characterManager.recommendCharacterClass(referrerId, {
        totalReferrals: 1,
        successfulReferrals: 1,
        totalValue: 100,
        averageReferralValue: 100,
        conversionRate: 1,
      });

      // 4. Check for achievements
      const achievements = await achievementManager.checkAndUnlockAchievements(
        referrerId,
        { type: 'referral_completed', data: { value: 100, referralCount: 1 } }
      );

      // 5. Log social activity
      const activity = await socialManager.logActivity(referrerId, {
        type: 'referral_completed',
        data: { referralId: referral.id, value: 100 },
      });

      // Verify all systems worked together
      expect(referral).toBeDefined();
      expect(result.success).toBe(true);
      expect(characterClass).toBeDefined();
      expect(Array.isArray(achievements)).toBe(true);
      expect(activity).toBeDefined();
    });

    test('should handle error scenarios gracefully', async () => {
      // Test with invalid user ID
      const result = await referralManager.createReferral(
        'invalid-user',
        'referred-456',
        100,
        'test_source'
      );

      // Should handle error gracefully
      expect(result).toBeDefined();

      // Test character class with invalid stats
      const characterClass = await characterManager.recommendCharacterClass(
        'invalid-user',
        { totalReferrals: -1, successfulReferrals: -1, totalValue: -1, averageReferralValue: -1, conversionRate: -1 }
      );

      expect(characterClass).toBeDefined();
    });

    test('should handle concurrent operations correctly', async () => {
      const userId = 'user-123';
      const operations = [];

      // Simulate concurrent referrals
      for (let i = 0; i < 5; i++) {
        operations.push(
          referralManager.createReferral(
            userId,
            `referred-${i}`,
            100,
            'test_source'
          )
        );
      }

      const results = await Promise.all(operations);

      // All operations should complete successfully
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.referrerId).toBe(userId);
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high volume of referral operations', async () => {
      const startTime = Date.now();
      const operations = [];

      // Create 100 referrals
      for (let i = 0; i < 100; i++) {
        operations.push(
          referralManager.createReferral(
            `referrer-${i}`,
            `referred-${i}`,
            100,
            'test_source'
          )
        );
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results.length).toBe(100);
      expect(totalTime).toBeLessThan(5000); // Should complete in under 5 seconds

      console.log(`Processed 100 referrals in ${totalTime}ms (${(results.length / (totalTime / 1000)).toFixed(2)} referrals/sec)`);
    });

    test('should handle large amount of achievement checks', async () => {
      const startTime = Date.now();
      const operations = [];

      // Check achievements for 100 users
      for (let i = 0; i < 100; i++) {
        operations.push(
          achievementManager.checkAndUnlockAchievements(
            `user-${i}`,
            { type: 'referral_completed', data: { value: 100, referralCount: 5 } }
          )
        );
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results.length).toBe(100);
      expect(totalTime).toBeLessThan(3000); // Should complete in under 3 seconds

      console.log(`Processed 100 achievement checks in ${totalTime}ms (${(results.length / (totalTime / 1000)).toFixed(2)} checks/sec)`);
    });
  });
});
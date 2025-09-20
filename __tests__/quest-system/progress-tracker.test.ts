import { ProgressTracker } from '@/lib/quest-system/progress-tracker';
import { QuestProgress, QuestStatus } from '@/lib/types/quest-types';
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

describe('ProgressTracker - Quest Progress Management', () => {
  const mockUserId = 'test-user-id';
  const mockQuestId = 'test-quest-id';
  const mockUserQuestId = 'test-user-quest-id';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default validation responses
    (SecurityValidator.validateUserId as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress percentage correctly', () => {
      const progress = ProgressTracker.calculateProgressPercentage(5, 10);
      expect(progress).toBe(50);

      const progressComplete = ProgressTracker.calculateProgressPercentage(10, 10);
      expect(progressComplete).toBe(100);

      const progressZero = ProgressTracker.calculateProgressPercentage(0, 10);
      expect(progressZero).toBe(0);
    });

    it('should handle edge cases in progress calculation', () => {
      // Handle zero target value
      const progressZeroTarget = ProgressTracker.calculateProgressPercentage(5, 0);
      expect(progressZeroTarget).toBe(0);

      // Handle negative current value
      const progressNegative = ProgressTracker.calculateProgressPercentage(-1, 10);
      expect(progressNegative).toBe(0);

      // Handle current value exceeding target
      const progressExceeded = ProgressTracker.calculateProgressPercentage(15, 10);
      expect(progressExceeded).toBe(100);
    });

    it('should estimate time remaining correctly', () => {
      const now = Date.now();
      const future = now + 2 * 60 * 60 * 1000; // 2 hours from now
      const timeRemaining = ProgressTracker.calculateTimeRemaining(future);

      expect(timeRemaining).toBe('2h 0m');
    });

    it('should handle expired quests', () => {
      const now = Date.now();
      const past = now - 2 * 60 * 60 * 1000; // 2 hours ago
      const timeRemaining = ProgressTracker.calculateTimeRemaining(past);

      expect(timeRemaining).toBe('Expired');
    });

    it('should format time remaining for different durations', () => {
      const now = Date.now();

      // Test days
      const daysRemaining = ProgressTracker.calculateTimeRemaining(now + 3 * 24 * 60 * 60 * 1000);
      expect(daysRemaining).toBe('3d 0h');

      // Test hours only
      const hoursRemaining = ProgressTracker.calculateTimeRemaining(now + 5 * 60 * 60 * 1000);
      expect(hoursRemaining).toBe('5h 0m');

      // Test minutes only
      const minutesRemaining = ProgressTracker.calculateTimeRemaining(now + 30 * 60 * 1000);
      expect(minutesRemaining).toBe('0h 30m');
    });
  });

  describe('Progress Updates', () => {
    it('should validate user ID before updating progress', async () => {
      (SecurityValidator.validateUserId as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid user ID'],
      });

      await expect(
        ProgressTracker.updateQuestProgress(mockUserId, mockQuestId, 'referrals', 1)
      ).rejects.toThrow('Invalid user ID');
    });

    it('should validate progress update parameters', async () => {
      // Test invalid action type
      await expect(
        ProgressTracker.updateQuestProgress(mockUserId, mockQuestId, 'invalid_action' as any, 1)
      ).rejects.toThrow('Invalid action type');

      // Test invalid progress value
      await expect(
        ProgressTracker.updateQuestProgress(mockUserId, mockQuestId, 'referrals', -1)
      ).rejects.toThrow('Progress value must be non-negative');

      await expect(
        ProgressTracker.updateQuestProgress(mockUserId, mockQuestId, 'referrals', 1001)
      ).rejects.toThrow('Progress value cannot exceed 1000');
    });

    it('should update progress for matching quest types', async () => {
      const mockQuest = {
        id: mockQuestId,
        target_type: 'referrals',
        target_value: 10,
        current_progress: 5,
      };

      const updatedQuest = await ProgressTracker.updateQuestProgress(
        mockUserId,
        mockQuestId,
        'referrals',
        3
      );

      expect(updatedQuest.current_progress).toBe(8);
    });

    it('should not update progress for non-matching quest types', async () => {
      const mockQuest = {
        id: mockQuestId,
        target_type: 'referrals',
        target_value: 10,
        current_progress: 5,
      };

      const updatedQuest = await ProgressTracker.updateQuestProgress(
        mockUserId,
        mockQuestId,
        'commission',
        10
      );

      expect(updatedQuest.current_progress).toBe(5); // Should remain unchanged
    });

    it('should detect quest completion', async () => {
      const mockQuest = {
        id: mockQuestId,
        target_type: 'referrals',
        target_value: 10,
        current_progress: 8,
      };

      const updatedQuest = await ProgressTracker.updateQuestProgress(
        mockUserId,
        mockQuestId,
        'referrals',
        3
      );

      expect(updatedQuest.current_progress).toBe(11);
      expect(updatedQuest.status).toBe('completed');
      expect(updatedQuest.completed_at).toBeDefined();
    });

    it('should handle progress updates for already completed quests', async () => {
      const mockQuest = {
        id: mockQuestId,
        target_type: 'referrals',
        target_value: 10,
        current_progress: 10,
        status: 'completed' as QuestStatus,
        completed_at: new Date().toISOString(),
      };

      const updatedQuest = await ProgressTracker.updateQuestProgress(
        mockUserId,
        mockQuestId,
        'referrals',
        5
      );

      expect(updatedQuest.current_progress).toBe(10); // Should not exceed target
      expect(updatedQuest.status).toBe('completed');
    });
  });

  describe('Quest Completion Detection', () => {
    it('should detect completed quests correctly', () => {
      const completedQuest = {
        current_progress: 10,
        target_value: 10,
      };

      const incompleteQuest = {
        current_progress: 8,
        target_value: 10,
      };

      expect(ProgressTracker.isQuestCompleted(completedQuest)).toBe(true);
      expect(ProgressTracker.isQuestCompleted(incompleteQuest)).toBe(false);
    });

    it('should detect quests that exceed target', () => {
      const exceededQuest = {
        current_progress: 15,
        target_value: 10,
      };

      expect(ProgressTracker.isQuestCompleted(exceededQuest)).toBe(true);
    });

    it('should handle zero target values', () => {
      const zeroTargetQuest = {
        current_progress: 0,
        target_value: 0,
      };

      expect(ProgressTracker.isQuestCompleted(zeroTargetQuest)).toBe(true);
    });
  });

  describe('Progress Validation', () => {
    it('should validate progress increments', () => {
      const validIncrements = [1, 5, 10, 100];
      const invalidIncrements = [-1, -5, 1001];

      validIncrements.forEach(increment => {
        expect(() => ProgressTracker.validateProgressIncrement(increment)).not.toThrow();
      });

      invalidIncrements.forEach(increment => {
        expect(() => ProgressTracker.validateProgressIncrement(increment)).toThrow();
      });
    });

    it('should validate action types', () => {
      const validActions = ['referral', 'commission', 'level', 'achievement'];
      const invalidActions = ['invalid', '', null, undefined];

      validActions.forEach(action => {
        expect(() => ProgressTracker.validateActionType(action)).not.toThrow();
      });

      invalidActions.forEach(action => {
        expect(() => ProgressTracker.validateActionType(action as any)).toThrow();
      });
    });

    it('should validate quest state transitions', () => {
      // Valid transitions
      expect(() => ProgressTracker.validateStateTransition('active', 'completed')).not.toThrow();
      expect(() => ProgressTracker.validateStateTransition('active', 'failed')).not.toThrow();
      expect(() => ProgressTracker.validateStateTransition('active', 'expired')).not.toThrow();

      // Invalid transitions
      expect(() => ProgressTracker.validateStateTransition('completed', 'active')).toThrow();
      expect(() => ProgressTracker.validateStateTransition('failed', 'active')).toThrow();
      expect(() => ProgressTracker.validateStateTransition('expired', 'active')).toThrow();
    });
  });

  describe('Progress History', () => {
    it('should track progress changes', () => {
      const initialProgress = 5;
      const newProgress = 8;
      const timestamp = Date.now();

      const progressEntry = ProgressTracker.createProgressEntry(
        mockUserQuestId,
        initialProgress,
        newProgress,
        'referral',
        timestamp
      );

      expect(progressEntry).toEqual({
        user_quest_id: mockUserQuestId,
        previous_progress: initialProgress,
        new_progress: newProgress,
        change_type: 'referral',
        timestamp,
      });
    });

    it('should calculate progress delta correctly', () => {
      const delta = ProgressTracker.calculateProgressDelta(8, 5);
      expect(delta).toBe(3);

      const negativeDelta = ProgressTracker.calculateProgressDelta(3, 8);
      expect(negativeDelta).toBe(-5);
    });

    it('should handle progress history aggregation', () => {
      const progressHistory = [
        { timestamp: Date.now() - 3600000, progress: 5 },
        { timestamp: Date.now() - 1800000, progress: 7 },
        { timestamp: Date.now(), progress: 10 },
      ];

      const stats = ProgressTracker.aggregateProgressHistory(progressHistory);

      expect(stats.total_progress).toBe(5);
      expect(stats.average_rate).toBeCloseTo(1.67, 2); // 5 progress over 3 hours
      expect(stats.last_updated).toBe(progressHistory[2].timestamp);
    });
  });

  describe('Real-time Progress Updates', () => {
    it('should broadcast progress updates', async () => {
      const mockBroadcast = jest.fn();
      const progressUpdate = {
        user_quest_id: mockUserQuestId,
        progress: 8,
        status: 'active' as QuestStatus,
      };

      await ProgressTracker.broadcastProgressUpdate(progressUpdate, mockBroadcast);

      expect(mockBroadcast).toHaveBeenCalledWith('quest_progress_update', progressUpdate);
    });

    it('should handle broadcast errors gracefully', async () => {
      const mockBroadcast = jest.fn().mockRejectedValue(new Error('Broadcast failed'));
      const progressUpdate = {
        user_quest_id: mockUserQuestId,
        progress: 8,
        status: 'active' as QuestStatus,
      };

      // Should not throw error
      await expect(
        ProgressTracker.broadcastProgressUpdate(progressUpdate, mockBroadcast)
      ).resolves.not.toThrow();
    });

    it('should format progress update messages', () => {
      const progressUpdate = ProgressTracker.formatProgressUpdateMessage(
        mockUserQuestId,
        8,
        10,
        'active'
      );

      expect(progressUpdate).toEqual({
        user_quest_id: mockUserQuestId,
        progress: 8,
        target: 10,
        percentage: 80,
        status: 'active',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Progress Analytics', () => {
    it('should calculate completion rate analytics', () => {
      const userProgressData = [
        { quest_id: 'quest-1', progress: 100, status: 'completed' },
        { quest_id: 'quest-2', progress: 50, status: 'active' },
        { quest_id: 'quest-3', progress: 100, status: 'completed' },
        { quest_id: 'quest-4', progress: 0, status: 'active' },
      ];

      const analytics = ProgressTracker.calculateCompletionAnalytics(userProgressData);

      expect(analytics.completion_rate).toBe(50); // 2 out of 4 completed
      expect(analytics.average_progress).toBe(62.5); // (100 + 50 + 100 + 0) / 4
      expect(analytics.active_quests).toBe(2);
      expect(analytics.completed_quests).toBe(2);
    });

    it('should calculate progress velocity', () => {
      const progressTimeline = [
        { timestamp: Date.now() - 86400000, progress: 0 }, // 1 day ago
        { timestamp: Date.now() - 43200000, progress: 5 },  // 12 hours ago
        { timestamp: Date.now(), progress: 10 },              // now
      ];

      const velocity = ProgressTracker.calculateProgressVelocity(progressTimeline);

      expect(velocity.daily_rate).toBeCloseTo(10, 1); // 10 progress per day
      expect(velocity.hourly_rate).toBeCloseTo(0.42, 2); // ~0.42 progress per hour
    });

    it('should predict quest completion time', () => {
      const progressTimeline = [
        { timestamp: Date.now() - 86400000, progress: 0 }, // 1 day ago
        { timestamp: Date.now() - 43200000, progress: 5 },  // 12 hours ago
        { timestamp: Date.now(), progress: 10 },              // now
      ];

      const prediction = ProgressTracker.predictCompletionTime(progressTimeline, 20);

      expect(prediction.estimated_completion_time).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing quest data gracefully', async () => {
      const mockSupabase = require('@/lib/supabase-client').supabaseService;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: 'Quest not found' }),
            }),
          }),
        }),
      });

      await expect(
        ProgressTracker.getQuestProgress(mockUserId, mockQuestId)
      ).rejects.toThrow('Quest not found');
    });

    it('should handle database connection errors', async () => {
      const mockSupabase = require('@/lib/supabase-client').supabaseService;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
            }),
          }),
        }),
      });

      await expect(
        ProgressTracker.getQuestProgress(mockUserId, mockQuestId)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle concurrent progress updates', async () => {
      const updatePromises = Array(5).fill(0).map(() =>
        ProgressTracker.updateQuestProgress(mockUserId, mockQuestId, 'referrals', 1)
      );

      // Should handle concurrent updates without errors
      await expect(Promise.all(updatePromises)).resolves.toBeDefined();
    });
  });
});
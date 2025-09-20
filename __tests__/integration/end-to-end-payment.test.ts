import { paymentReferralHandler } from '@/app/api/webhooks/route';
import { referralManager } from '@/lib/referral-tracking';
import { supabaseService } from '@/lib/supabase-client';
import { ProgressTracker } from '@/lib/quest-system/progress-tracker';
import { RewardManager } from '@/lib/quest-system/reward-manager';

// Mock the dependencies
jest.mock('@/lib/referral-tracking');
jest.mock('@/lib/supabase-client');
jest.mock('@/lib/quest-system/progress-tracker');
jest.mock('@/lib/quest-system/reward-manager');

// Mock environment variables
process.env.WHOP_WEBHOOK_SECRET = 'test-secret';

describe('End-to-End Payment Processing Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock referral manager
    (referralManager.createReferral as jest.Mock).mockResolvedValue({
      id: 'test-referral-id',
      referrerId: 'referrer-123',
      referredUserId: 'user-123',
      status: 'completed' as const,
      value: 100,
      commission: 15,
    });

    // Mock supabase service
    (supabaseService.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      insert: jest.fn().mockResolvedValue({
        data: { id: 'test-referral' },
        error: null,
      }),
      update: jest.fn().mockResolvedValue({
        data: { id: 'test-referral-updated' },
        error: null,
      }),
    });

    // Mock progress tracker
    (ProgressTracker.bulkUpdateProgress as jest.Mock).mockResolvedValue(undefined);

    // Mock reward manager
    (RewardManager.distributeQuestRewards as jest.Mock).mockResolvedValue({
      success: true,
      xpEarned: 100,
      commissionEarned: 15,
    });
  });

  describe('Complete Payment-to-Referral Flow', () => {
    it('should process complete flow from payment to quest updates', async () => {
      const mockMember = {
        user: {
          id: 'user_123',
          username: 'testuser',
          email: 'test@example.com'
        },
        plan: {
          id: 'plan_123',
          title: 'Test Plan',
          initialPrice: 100
        }
      };

      // Mock referrer found
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No completed referral
        }).mockResolvedValueOnce({
          data: {
            referrer_id: 'referrer-123'
          },
          error: null,
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'completed-referral' },
          error: null,
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'test-referral' },
          error: null,
        }),
      });

      await paymentReferralHandler(
        'pay_123456789',
        'user_123',
        100,
        'USD',
        92,
        mockMember
      );

      // Verify the complete flow was executed
      expect(referralManager.createReferral).toHaveBeenCalledWith(
        'referrer-123',
        'user_123',
        100,
        'whop_payment',
        expect.objectContaining({
          payment_id: 'pay_123456789',
          source: 'whop_platform',
          currency: 'USD',
          commission_rate: 0.15
        })
      );

      // Verify quest progress was updated
      expect(ProgressTracker.bulkUpdateProgress).toHaveBeenCalledWith(
        'referrer-123',
        expect.any(Array)
      );

      // Verify rewards were distributed
      expect(RewardManager.distributeQuestRewards).toHaveBeenCalled();
    });

    it('should handle direct payment without referrer', async () => {
      const mockMember = {
        user: {
          id: 'user_direct',
          username: 'directuser',
          email: 'direct@example.com'
        },
        plan: {
          id: 'plan_direct',
          title: 'Direct Plan',
          initialPrice: 50
        }
      };

      // Mock no referrer found
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found error
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'direct-user-updated' },
          error: null,
        }),
      });

      await paymentReferralHandler(
        'pay_direct_123',
        'user_direct',
        50,
        'USD',
        46,
        mockMember
      );

      // Should not create referral for direct payment
      expect(referralManager.createReferral).not.toHaveBeenCalled();

      // Should update user's payment stats
      expect(supabaseService.from).toHaveBeenCalledWith('users');

      // Should still update payer's quest progress
      expect(ProgressTracker.bulkUpdateProgress).toHaveBeenCalledWith(
        'user_direct',
        expect.any(Array)
      );
    });

    it('should handle null user_id gracefully', async () => {
      const mockMember = {
        user: {
          id: null,
          username: 'unknown',
          email: 'unknown@example.com'
        },
        plan: {
          id: 'plan_no_user',
          title: 'No User Plan',
          initialPrice: 100
        }
      };

      await paymentReferralHandler(
        'pay_no_user',
        null,
        100,
        'USD',
        92,
        mockMember
      );

      // Should not process payment without user_id
      expect(referralManager.createReferral).not.toHaveBeenCalled();
      expect(supabaseService.from).not.toHaveBeenCalled();
    });
  });

  describe('Quest System Integration', () => {
    it('should update multiple quest types for referrer', async () => {
      const mockMember = {
        user: {
          id: 'user_quest_multi',
          username: 'questmultiuser',
          email: 'questmulti@example.com'
        },
        plan: {
          id: 'plan_quest_multi',
          title: 'Multi Quest Plan',
          initialPrice: 200
        }
      };

      // Mock referrer found
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No completed referral
        }).mockResolvedValueOnce({
          data: {
            referrer_id: 'referrer_quest_multi'
          },
          error: null,
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'multi-quest-referral' },
          error: null,
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'test-referral' },
          error: null,
        }),
      });

      await paymentReferralHandler(
        'pay_quest_multi_123',
        'user_quest_multi',
        200,
        'USD',
        184,
        mockMember
      );

      // Verify quest progress was updated for referrer
      expect(ProgressTracker.bulkUpdateProgress).toHaveBeenCalledWith(
        'referrer_quest_multi',
        expect.arrayContaining([
          expect.any(String),
          expect.any(String)
        ])
      );

      // Verify rewards were calculated based on payment amount
      expect(RewardManager.distributeQuestRewards).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentAmount: 200,
          commissionAmount: 30 // 15% of 200
        })
      );
    });

    it('should handle quest progress update failures gracefully', async () => {
      const mockMember = {
        user: {
          id: 'user_quest_fail',
          username: 'questfailuser',
          email: 'questfail@example.com'
        },
        plan: {
          id: 'plan_quest_fail',
          title: 'Quest Fail Plan',
          initialPrice: 75
        }
      };

      // Mock referrer found
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No completed referral
        }).mockResolvedValueOnce({
          data: {
            referrer_id: 'referrer_quest_fail'
          },
          error: null,
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'quest-fail-referral' },
          error: null,
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'test-referral' },
          error: null,
        }),
      });

      // Mock quest progress update to fail
      (ProgressTracker.bulkUpdateProgress as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await paymentReferralHandler(
        'pay_quest_fail_123',
        'user_quest_fail',
        75,
        'USD',
        69,
        mockMember
      );

      // Referral should still be created
      expect(referralManager.createReferral).toHaveBeenCalled();

      // Quest progress failure should not break the main flow
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Commission Calculation Integration', () => {
    it('should calculate correct commission based on payment amount', async () => {
      const mockMember = {
        user: {
          id: 'user_commission_calc',
          username: 'commissioncalcuser',
          email: 'commissioncalc@example.com'
        },
        plan: {
          id: 'plan_commission_calc',
          title: 'Commission Calc Plan',
          initialPrice: 1000
        }
      };

      // Mock referrer found
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No completed referral
        }).mockResolvedValueOnce({
          data: {
            referrer_id: 'referrer_commission_calc'
          },
          error: null,
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'commission-calc-referral' },
          error: null,
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'test-referral' },
          error: null,
        }),
      });

      await paymentReferralHandler(
        'pay_commission_calc_123',
        'user_commission_calc',
        1000, // $1000 payment
        'USD',
        920,
        mockMember
      );

      // Should calculate 15% commission ($150)
      expect(referralManager.createReferral).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        1000, // Original payment amount
        expect.any(String),
        expect.objectContaining({
          payment_id: 'pay_commission_calc_123',
          commission_rate: 0.15
        })
      );

      // Verify commission was added to referrer's stats
      expect(supabaseService.from).toHaveBeenCalledWith('users');
    });

    it('should handle different currencies correctly', async () => {
      const mockMember = {
        user: {
          id: 'user_currency',
          username: 'currencyuser',
          email: 'currency@example.com'
        },
        plan: {
          id: 'plan_currency',
          title: 'Currency Plan',
          initialPrice: 100
        }
      };

      // Mock referrer found
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No completed referral
        }).mockResolvedValueOnce({
          data: {
            referrer_id: 'referrer_currency'
          },
          error: null,
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'currency-referral' },
          error: null,
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'test-referral' },
          error: null,
        }),
      });

      await paymentReferralHandler(
        'pay_currency_123',
        'user_currency',
        100,
        'EUR', // Different currency
        92,
        mockMember
      );

      // Should handle EUR currency correctly
      expect(referralManager.createReferral).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        100,
        expect.any(String),
        expect.objectContaining({
          payment_id: 'pay_currency_123',
          currency: 'EUR'
        })
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      const mockMember = {
        user: {
          id: 'user_db_fail',
          username: 'dbfailuser',
          email: 'dbfail@example.com'
        },
        plan: {
          id: 'plan_db_fail',
          title: 'DB Fail Plan',
          initialPrice: 100
        }
      };

      // Mock database connection failure
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      });

      await paymentReferralHandler(
        'pay_db_fail_123',
        'user_db_fail',
        100,
        'USD',
        92,
        mockMember
      );

      // Error should be logged but not cause function to throw
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle partial failures in the payment flow', async () => {
      const mockMember = {
        user: {
          id: 'user_partial_fail',
          username: 'partialfailuser',
          email: 'partialfail@example.com'
        },
        plan: {
          id: 'plan_partial_fail',
          title: 'Partial Fail Plan',
          initialPrice: 100
        }
      };

      // Mock referrer found but quest progress fails
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No completed referral
        }).mockResolvedValueOnce({
          data: {
            referrer_id: 'referrer_partial_fail'
          },
          error: null,
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'partial-fail-referral' },
          error: null,
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'test-referral' },
          error: null,
        }),
      });

      // Mock quest progress update to fail
      (ProgressTracker.bulkUpdateProgress as jest.Mock).mockRejectedValue(new Error('Quest update failed'));

      await paymentReferralHandler(
        'pay_partial_fail_123',
        'user_partial_fail',
        100,
        'USD',
        92,
        mockMember
      );

      // Referral should still be created successfully
      expect(referralManager.createReferral).toHaveBeenCalled();

      // Quest progress failure should not break the main flow
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent payment processing efficiently', async () => {
      const concurrentRequests = 10;
      const paymentPromises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const mockMember = {
          user: {
            id: `user_concurrent_${i}`,
            username: `concurrentuser${i}`,
            email: `concurrent${i}@example.com`
          },
          plan: {
            id: `plan_concurrent_${i}`,
            title: `Concurrent Plan ${i}`,
            initialPrice: 100 + i
          }
        };

        // Mock referrer found for all requests
        (supabaseService.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116' }, // No completed referral
          }).mockResolvedValueOnce({
            data: {
              referrer_id: `referrer_concurrent_${i}`
            },
            error: null,
          }),
          update: jest.fn().mockResolvedValue({
            data: { id: `concurrent-referral-${i}` },
            error: null,
          }),
          insert: jest.fn().mockResolvedValue({
            data: { id: `test-referral-${i}` },
            error: null,
          }),
        });

        paymentPromises.push(
          paymentReferralHandler(
            `pay_concurrent_${i}`,
            `user_concurrent_${i}`,
            100 + i,
            'USD',
            92 + i,
            mockMember
          )
        );
      }

      const startTime = Date.now();
      await Promise.all(paymentPromises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds

      // All requests should have been processed
      expect(referralManager.createReferral).toHaveBeenCalledTimes(concurrentRequests);
      expect(ProgressTracker.bulkUpdateProgress).toHaveBeenCalledTimes(concurrentRequests);
    });
  });
});
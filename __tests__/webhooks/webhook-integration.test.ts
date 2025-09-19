import { POST } from '@/app/api/webhooks/route';
import { makeWebhookValidator } from '@whop/api';
import { referralManager } from '@/lib/referral-tracking';
import { supabaseService } from '@/lib/supabase-client';
import { ProgressTracker } from '@/lib/quest-system/progress-tracker';

// Mock the dependencies
jest.mock('@/lib/referral-tracking');
jest.mock('@/lib/supabase-client');
jest.mock('@/lib/quest-system/progress-tracker');

// Mock environment variables
process.env.WHOP_WEBHOOK_SECRET = 'test-secret';

describe('Real Whop Webhook Integration Tests', () => {
  let mockValidateWebhook: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the webhook validator
    mockValidateWebhook = jest.fn();

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
  });

  describe('Real Whop payment.succeeded Event Processing', () => {
    it('should process payment.succeeded webhook with real Whop payload structure', async () => {
      const mockWebhookData = {
        action: 'payment.succeeded',
        data: {
          id: 'pay_123456789',
          final_amount: 100,
          amount_after_fees: 92,
          currency: 'USD',
          user_id: 'user_123',
          member: {
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
          }
        }
      };

      const mockRequest = new Request('https://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData),
      });

      // Mock the webhook validator to return our test data
      const { makeWebhookValidator } = await import('@whop/api');
      (makeWebhookValidator as jest.Mock).mockReturnValue(() => Promise.resolve(mockWebhookData));

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);

      // Verify the webhook was processed correctly
      expect(referralManager.createReferral).toHaveBeenCalled();
      expect(supabaseService.from).toHaveBeenCalledWith('referrals');
    });

    it('should handle payment.succeeded without referrer', async () => {
      const mockWebhookData = {
        action: 'payment.succeeded',
        data: {
          id: 'pay_123456789',
          final_amount: 100,
          amount_after_fees: 92,
          currency: 'USD',
          user_id: 'user_456', // User with no referrer
          member: {
            user: {
              id: 'user_456',
              username: 'directuser',
              email: 'direct@example.com'
            },
            plan: {
              id: 'plan_123',
              title: 'Test Plan',
              initialPrice: 100
            }
          }
        }
      };

      const mockRequest = new Request('https://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData),
      });

      // Mock the webhook validator to return our test data
      const { makeWebhookValidator } = await import('@whop/api');
      (makeWebhookValidator as jest.Mock).mockReturnValue(() => Promise.resolve(mockWebhookData));

      // Mock no referrer found
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found error
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'test-referral-updated' },
          error: null,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);

      // Should still process direct payment
      expect(supabaseService.from).toHaveBeenCalledWith('users');
    });

    it('should handle payment.succeeded with existing pending referral', async () => {
      const mockWebhookData = {
        action: 'payment.succeeded',
        data: {
          id: 'pay_123456789',
          final_amount: 50,
          amount_after_fees: 46,
          currency: 'USD',
          user_id: 'user_789',
          member: {
            user: {
              id: 'user_789',
              username: 'referreduser',
              email: 'referred@example.com'
            },
            plan: {
              id: 'plan_456',
              title: 'Test Plan 2',
              initialPrice: 50
            }
          }
        }
      };

      const mockRequest = new Request('https://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData),
      });

      // Mock the webhook validator to return our test data
      const { makeWebhookValidator } = await import('@whop/api');
      (makeWebhookValidator as jest.Mock).mockReturnValue(() => Promise.resolve(mockWebhookData));

      // Mock existing pending referral
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No completed referral
        }).mockResolvedValueOnce({
          data: {
            id: 'pending-ref-123',
            referrer_id: 'referrer-456',
            referred_user_id: 'user_789',
            status: 'pending'
          },
          error: null,
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'completed-ref-123' },
          error: null,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);

      // Should complete the pending referral
      expect(supabaseService.from).toHaveBeenCalledWith('referrals');
      expect(supabaseService.from).toHaveBeenCalledWith('users');
    });

    it('should handle invalid payment amounts gracefully', async () => {
      const mockWebhookData = {
        action: 'payment.succeeded',
        data: {
          id: 'pay_invalid',
          final_amount: -100, // Invalid negative amount
          amount_after_fees: -92,
          currency: 'USD',
          user_id: 'user_invalid',
          member: {
            user: {
              id: 'user_invalid',
              username: 'invaliduser',
              email: 'invalid@example.com'
            },
            plan: {
              id: 'plan_invalid',
              title: 'Invalid Plan',
              initialPrice: -100
            }
          }
        }
      };

      const mockRequest = new Request('https://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData),
      });

      // Mock the webhook validator to return our test data
      const { makeWebhookValidator } = await import('@whop/api');
      (makeWebhookValidator as jest.Mock).mockReturnValue(() => Promise.resolve(mockWebhookData));

      const response = await POST(mockRequest);

      expect(response.status).toBe(200); // Still returns 200 to avoid retries

      // Should not process invalid payment
      expect(referralManager.createReferral).not.toHaveBeenCalled();
    });

    it('should handle missing user_id in payment webhook', async () => {
      const mockWebhookData = {
        action: 'payment.succeeded',
        data: {
          id: 'pay_no_user',
          final_amount: 100,
          amount_after_fees: 92,
          currency: 'USD',
          user_id: null, // Missing user_id
          member: {
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
          }
        }
      };

      const mockRequest = new Request('https://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData),
      });

      // Mock the webhook validator to return our test data
      const { makeWebhookValidator } = await import('@whop/api');
      (makeWebhookValidator as jest.Mock).mockReturnValue(() => Promise.resolve(mockWebhookData));

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);

      // Should not process payment without user_id
      expect(referralManager.createReferral).not.toHaveBeenCalled();
      expect(supabaseService.from).not.toHaveBeenCalled();
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockWebhookData = {
        action: 'payment.succeeded',
        data: {
          id: 'pay_db_error',
          final_amount: 100,
          amount_after_fees: 92,
          currency: 'USD',
          user_id: 'user_db_error',
          member: {
            user: {
              id: 'user_db_error',
              username: 'dberroruser',
              email: 'dberror@example.com'
            },
            plan: {
              id: 'plan_db_error',
              title: 'DB Error Plan',
              initialPrice: 100
            }
          }
        }
      };

      const mockRequest = new Request('https://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData),
      });

      // Mock the webhook validator to return our test data
      const { makeWebhookValidator } = await import('@whop/api');
      (makeWebhookValidator as jest.Mock).mockReturnValue(() => Promise.resolve(mockWebhookData));

      // Mock database error
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200); // Still returns 200 to avoid webhook retries

      // Error should be logged but not cause webhook failure
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Quest Progress Integration', () => {
    it('should update quest progress for referrer after successful payment', async () => {
      const mockWebhookData = {
        action: 'payment.succeeded',
        data: {
          id: 'pay_quest_update',
          final_amount: 200,
          amount_after_fees: 184,
          currency: 'USD',
          user_id: 'user_quest',
          member: {
            user: {
              id: 'user_quest',
              username: 'questuser',
              email: 'quest@example.com'
            },
            plan: {
              id: 'plan_quest',
              title: 'Quest Plan',
              initialPrice: 200
            }
          }
        }
      };

      const mockRequest = new Request('https://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData),
      });

      // Mock the webhook validator to return our test data
      const { makeWebhookValidator } = await import('@whop/api');
      (makeWebhookValidator as jest.Mock).mockReturnValue(() => Promise.resolve(mockWebhookData));

      // Mock referrer found
      (supabaseService.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            referrer_id: 'referrer_quest'
          },
          error: null,
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'quest-referral' },
          error: null,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);

      // Should update quest progress
      expect(ProgressTracker.bulkUpdateProgress).toHaveBeenCalledWith(
        'referrer_quest',
        expect.any(Array)
      );
    });
  });

  describe('Commission Calculation', () => {
    it('should calculate commission correctly based on payment amount', async () => {
      const mockWebhookData = {
        action: 'payment.succeeded',
        data: {
          id: 'pay_commission_test',
          final_amount: 1000, // $1000 payment
          amount_after_fees: 920,
          currency: 'USD',
          user_id: 'user_commission',
          member: {
            user: {
              id: 'user_commission',
              username: 'commissionuser',
              email: 'commission@example.com'
            },
            plan: {
              id: 'plan_commission',
              title: 'Commission Plan',
              initialPrice: 1000
            }
          }
        }
      };

      const mockRequest = new Request('https://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData),
      });

      // Mock the webhook validator to return our test data
      const { makeWebhookValidator } = await import('@whop/api');
      (makeWebhookValidator as jest.Mock).mockReturnValue(() => Promise.resolve(mockWebhookData));

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);

      // Should calculate 15% commission ($150)
      expect(referralManager.createReferral).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        1000, // Original payment amount
        expect.any(String),
        expect.objectContaining({
          payment_id: 'pay_commission_test',
          commission_rate: 0.15
        })
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent payment webhooks efficiently', async () => {
      const concurrentRequests = 20;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const mockWebhookData = {
          action: 'payment.succeeded',
          data: {
            id: `pay_concurrent_${i}`,
            final_amount: 100 + i,
            amount_after_fees: 92 + i,
            currency: 'USD',
            user_id: `user_concurrent_${i}`,
            member: {
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
            }
          }
        };

        const mockRequest = new Request('https://localhost:3000/api/webhooks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockWebhookData),
        });

        requests.push(mockRequest);
      }

      // Mock the webhook validator to return test data
      const { makeWebhookValidator } = await import('@whop/api');
      (makeWebhookValidator as jest.Mock).mockReturnValue((req: Request) => {
        return Promise.resolve(JSON.parse(req.body as string));
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(request => POST(request)));
      const endTime = Date.now();

      expect(responses.every(response => response.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds

      // All requests should have been processed
      expect(referralManager.createReferral).toHaveBeenCalledTimes(concurrentRequests);
    });
  });
});
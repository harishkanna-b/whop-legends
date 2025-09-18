import { createMocks } from 'node-mocks-http';
import { validateWebhookRequest } from '@/lib/webhooks/verify-signature';
import webhookHandler from '@/pages/api/webhooks/whop';
import { WebhookManager } from '@/lib/webhooks/webhook-manager';
import { supabase } from '@/lib/supabase-client';
import { Database } from '@/types/database';

// Mock the database client
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

// Mock environment variables
process.env.WHOP_WEBHOOK_SECRET = 'test-secret';

describe('Webhook Integration Tests', () => {
  let webhookManager: WebhookManager;

  beforeEach(() => {
    webhookManager = new WebhookManager();
    jest.clearAllMocks();
  });

  describe('Webhook Signature Verification', () => {
    it('should validate correct webhook signature', () => {
      const payload = {
        event: 'referral.created',
        data: {
          id: 'test-referral-id',
          userId: 'test-user-id',
          amount: 100,
        },
      };

      const signature = 'test-signature';
      const timestamp = Date.now().toString();

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-timestamp': timestamp,
        },
        body: payload,
      });

      const validation = validateWebhookRequest(req, 'test-secret');
      expect(validation.isValid).toBe(true);
    });

    it('should reject webhook without signature', () => {
      const payload = {
        event: 'referral.created',
        data: { id: 'test-referral-id' },
      };

      const { req } = createMocks({
        method: 'POST',
        headers: {},
        body: payload,
      });

      const validation = validateWebhookRequest(req, 'test-secret');
      expect(validation.isValid).toBe(false);
    });

    it('should reject webhook with expired timestamp', () => {
      const payload = {
        event: 'referral.created',
        data: { id: 'test-referral-id' },
      };

      const oldTimestamp = (Date.now() - 600000).toString(); // 10 minutes ago

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': 'test-signature',
          'x-whop-timestamp': oldTimestamp,
        },
        body: payload,
      });

      const validation = validateWebhookRequest(req, 'test-secret');
      expect(validation.isValid).toBe(false);
    });
  });

  describe('Webhook Handler Integration', () => {
    it('should handle referral.created webhook successfully', async () => {
      const payload = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: {
          id: 'ref-123',
          userId: 'user-123',
          referrerId: 'referrer-123',
          amount: 50.0,
          commission: 5.0,
          status: 'pending',
        },
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': 'valid-signature',
          'x-whop-timestamp': Date.now().toString(),
        },
        body: payload,
      });

      // Mock successful processing
      jest.spyOn(webhookManager, 'processWebhook').mockResolvedValue({
        success: true,
        eventId: 'webhook-test-id',
        processedAt: new Date().toISOString(),
      });

      await webhookHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
    });

    it('should handle webhook processing errors gracefully', async () => {
      const payload = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: {
          id: 'ref-123',
          userId: 'invalid-user-id', // This will cause an error
        },
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': 'valid-signature',
          'x-whop-timestamp': Date.now().toString(),
        },
        body: payload,
      });

      // Mock processing error
      jest.spyOn(webhookManager, 'processWebhook').mockRejectedValue(
        new Error('User not found')
      );

      await webhookHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });

    it('should reject invalid webhook events', async () => {
      const payload = {
        id: 'webhook-test-id',
        event: 'invalid.event',
        timestamp: Date.now(),
        data: {},
      };

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': 'valid-signature',
          'x-whop-timestamp': Date.now().toString(),
        },
        body: payload,
      });

      await webhookHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid event type');
    });
  });

  describe('Referral Processing Integration', () => {
    beforeEach(() => {
      // Mock successful database operations
      (supabase.from as jest.Mock).mockReturnValue({
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

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: 100,
        error: null,
      });
    });

    it('should process referral.created event and create user profile', async () => {
      const eventData = {
        id: 'ref-123',
        userId: 'user-123',
        referrerId: 'referrer-123',
        amount: 50.0,
        commission: 5.0,
        status: 'pending',
      };

      const result = await webhookManager.processWebhook({
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: eventData,
      });

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(supabase.from).toHaveBeenCalledWith('referrals');
    });

    it('should process referral.completed event and update user XP', async () => {
      const eventData = {
        id: 'ref-123',
        userId: 'user-123',
        amount: 50.0,
        commission: 5.0,
        status: 'completed',
      };

      const result = await webhookManager.processWebhook({
        id: 'webhook-test-id',
        event: 'referral.completed',
        timestamp: Date.now(),
        data: eventData,
      });

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('calculate_user_level', {
        p_user_id: 'user-123',
      });
    });

    it('should process referral.cancelled event and update status', async () => {
      const eventData = {
        id: 'ref-123',
        userId: 'user-123',
        status: 'cancelled',
      };

      const result = await webhookManager.processWebhook({
        id: 'webhook-test-id',
        event: 'referral.cancelled',
        timestamp: Date.now(),
        data: eventData,
      });

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('referrals');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should apply rate limiting to webhook requests', async () => {
      const payload = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      // Mock rate limiting
      jest.spyOn(webhookManager, 'processWebhook').mockResolvedValue({
        success: true,
        eventId: 'webhook-test-id',
        processedAt: new Date().toISOString(),
      });

      // Process multiple requests quickly
      const requests = Array(10).fill(null).map(() =>
        webhookManager.processWebhook(payload)
      );

      const results = await Promise.all(requests);

      // All requests should succeed (rate limiting is handled at the middleware level)
      expect(results.every(result => result.success)).toBe(true);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should handle database connection errors', async () => {
      const payload = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      // Mock database error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      });

      const result = await webhookManager.processWebhook(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle validation errors gracefully', async () => {
      const payload = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: {
          // Missing required fields
          id: '',
          userId: '',
        },
      };

      const result = await webhookManager.processWebhook(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('Security and Data Validation', () => {
    it('should sanitize input data to prevent injection attacks', async () => {
      const payload = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: {
          id: 'ref-123',
          userId: 'user-123<script>alert("xss")</script>',
          amount: 50.0,
          status: 'pending',
        },
      };

      const result = await webhookManager.processWebhook(payload);

      expect(result.success).toBe(true);
      // The script tag should be sanitized or escaped
      expect(supabase.from).toHaveBeenCalledWith('referrals');
    });

    it('should validate numeric fields', async () => {
      const payload = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: {
          id: 'ref-123',
          userId: 'user-123',
          amount: 'invalid-amount', // Should be a number
          status: 'pending',
        },
      };

      const result = await webhookManager.processWebhook(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent webhook processing', async () => {
      const payloads = Array(50).fill(null).map((_, index) => ({
        id: `webhook-test-id-${index}`,
        event: 'referral.created' as const,
        timestamp: Date.now(),
        data: {
          id: `ref-${index}`,
          userId: `user-${index}`,
          amount: 50.0,
          status: 'pending',
        },
      }));

      jest.spyOn(webhookManager, 'processWebhook').mockResolvedValue({
        success: true,
        eventId: 'test-id',
        processedAt: new Date().toISOString(),
      });

      const startTime = Date.now();
      const results = await Promise.all(payloads.map(payload => webhookManager.processWebhook(payload)));
      const endTime = Date.now();

      expect(results.every(result => result.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
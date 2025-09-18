import { WebhookRetryQueue } from '@/lib/webhooks/retry-queue';
import { WebhookEvent } from '@/types/whop';

// Mock the retry handler utilities
jest.mock('@/lib/retry-handler', () => ({
  retryWithBackoff: jest.fn(),
  retryWebhookProcessing: jest.fn(),
  retryWithRateLimit: jest.fn(),
  CircuitBreaker: jest.fn(),
}));

describe('Webhook Retry Queue', () => {
  let retryQueue: WebhookRetryQueue;

  beforeEach(() => {
    retryQueue = new WebhookRetryQueue();
    jest.clearAllMocks();
  });

  describe('Queue Operations', () => {
    it('should add webhook to retry queue', async () => {
      const webhook: WebhookEvent = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      const result = await retryQueue.addToQueue(webhook, new Error('Test error'));

      expect(result).toBe(true);
      expect(retryQueue.getQueueLength()).toBe(1);
    });

    it('should process retry queue successfully', async () => {
      const webhook: WebhookEvent = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      await retryQueue.addToQueue(webhook, new Error('Test error'));

      const processed = await retryQueue.processQueue();

      expect(processed).toBe(1);
      expect(retryQueue.getQueueLength()).toBe(0);
    });

    it('should handle empty queue', async () => {
      const processed = await retryQueue.processQueue();
      expect(processed).toBe(0);
    });

    it('should respect retry limits', async () => {
      const webhook: WebhookEvent = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      // Add webhook with max retry attempts
      for (let i = 0; i < 6; i++) {
        await retryQueue.addToQueue(webhook, new Error('Test error'));
      }

      const processed = await retryQueue.processQueue();

      // Should stop retrying after max attempts
      expect(processed).toBe(0);
      expect(retryQueue.getQueueLength()).toBe(0); // Webhook moved to dead letter queue
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff', async () => {
      const webhook: WebhookEvent = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      const startTime = Date.now();

      await retryQueue.addToQueue(webhook, new Error('Test error'));
      await retryQueue.processQueue();

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should wait due to exponential backoff
      expect(processingTime).toBeGreaterThanOrEqual(1000);
    });

    it('should retry failed webhooks', async () => {
      const webhook: WebhookEvent = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      // Mock processing that fails
      jest.spyOn(retryQueue, 'processWebhook').mockRejectedValueOnce(new Error('Processing failed'));

      await retryQueue.addToQueue(webhook, new Error('Initial error'));
      await retryQueue.processQueue();

      // Should still be in queue after failed retry
      expect(retryQueue.getQueueLength()).toBe(1);
    });
  });

  describe('Dead Letter Queue', () => {
    it('should move failed webhooks to dead letter queue', async () => {
      const webhook: WebhookEvent = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      // Add webhook with max retry attempts
      for (let i = 0; i < 6; i++) {
        await retryQueue.addToQueue(webhook, new Error('Test error'));
      }

      await retryQueue.processQueue();

      const deadLetterItems = retryQueue.getDeadLetterItems();
      expect(deadLetterItems.length).toBe(1);
      expect(deadLetterItems[0].webhookId).toBe('webhook-test-id');
    });

    it('should track retry statistics', async () => {
      const webhook: WebhookEvent = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      await retryQueue.addToQueue(webhook, new Error('Test error'));
      await retryQueue.processQueue();

      const stats = retryQueue.getStatistics();
      expect(stats.totalQueued).toBe(1);
      expect(stats.totalProcessed).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle queue processing errors gracefully', async () => {
      const webhook: WebhookEvent = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      // Mock queue processing error
      jest.spyOn(retryQueue, 'processWebhook').mockRejectedValue(new Error('Queue processing failed'));

      await retryQueue.addToQueue(webhook, new Error('Test error'));
      const processed = await retryQueue.processQueue();

      expect(processed).toBe(0);
      expect(retryQueue.getQueueLength()).toBe(1);
    });

    it('should validate webhook data before adding to queue', async () => {
      const invalidWebhook = {
        id: '', // Invalid empty ID
        event: 'invalid.event',
        timestamp: Date.now(),
        data: {},
      };

      const result = await retryQueue.addToQueue(invalidWebhook, new Error('Validation error'));

      expect(result).toBe(false);
      expect(retryQueue.getQueueLength()).toBe(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large queue efficiently', async () => {
      const webhooks = Array(100).fill(null).map((_, i) => ({
        id: `webhook-${i}`,
        event: 'referral.created' as const,
        timestamp: Date.now(),
        data: { id: `ref-${i}` },
      }));

      // Add all webhooks to queue
      for (const webhook of webhooks) {
        await retryQueue.addToQueue(webhook, new Error('Test error'));
      }

      expect(retryQueue.getQueueLength()).toBe(100);

      // Process queue
      const processed = await retryQueue.processQueue();
      expect(processed).toBe(100);
      expect(retryQueue.getQueueLength()).toBe(0);
    });

    it('should prevent memory leaks', async () => {
      const webhook: WebhookEvent = {
        id: 'webhook-test-id',
        event: 'referral.created',
        timestamp: Date.now(),
        data: { id: 'ref-123' },
      };

      // Add many webhooks to test memory management
      for (let i = 0; i < 1000; i++) {
        await retryQueue.addToQueue(webhook, new Error('Test error'));
      }

      await retryQueue.processQueue();

      // Queue should be empty after processing
      expect(retryQueue.getQueueLength()).toBe(0);
    });
  });
});
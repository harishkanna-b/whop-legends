import { validateWebhookRequest, verifyWebhookSignature } from '@/lib/webhooks/verify-signature';
import { createMocks } from 'node-mocks-http';
import { createHmac } from 'crypto';

describe('Webhook Signature Verification', () => {
  const secret = 'test-webhook-secret';

  const createSignature = (payload: string, timestamp: string): string => {
    const message = `${timestamp}.${payload}`;
    return createHmac('sha256', secret).update(message).digest('hex');
  };

  describe('Signature Validation', () => {
    it('should validate correct signature', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(payload, timestamp);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-timestamp': timestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: JSON.parse(payload),
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject missing signature header', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-timestamp': timestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: JSON.parse(payload),
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing X-Whop-Signature header');
    });

    it('should reject missing timestamp header', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const signature = createSignature(payload, Math.floor(Date.now() / 1000).toString());

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: JSON.parse(payload),
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing X-Whop-Timestamp header');
    });

    it('should reject expired timestamp', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 minutes ago
      const signature = createSignature(payload, oldTimestamp);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-timestamp': oldTimestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: JSON.parse(payload),
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Webhook timestamp is too old');
    });

    it('should reject incorrect signature', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const incorrectSignature = 'incorrect-signature';

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': incorrectSignature,
          'x-whop-timestamp': timestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: JSON.parse(payload),
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should reject malformed signature', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const malformedSignature = 'invalid-hex-signature!@#';

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': malformedSignature,
          'x-whop-timestamp': timestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: JSON.parse(payload),
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should handle empty payload', () => {
      const payload = '{}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(payload, timestamp);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-timestamp': timestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: {},
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(true);
    });

    it('should handle large payload', () => {
      const largePayload = {
        event: 'test',
        data: {
          id: '123',
          items: Array(1000).fill(null).map((_, i) => ({ id: i, value: `item-${i}` })),
        },
      };
      const payloadString = JSON.stringify(largePayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(payloadString, timestamp);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-timestamp': timestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: largePayload,
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in payload', () => {
      const payload = JSON.stringify({
        event: 'test',
        data: {
          id: '123',
          message: 'Special chars: àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýÿÞ',
          unicode: 'Emoji: 🎉🚀💯',
        },
      });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(payload, timestamp);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-timestamp': timestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: JSON.parse(payload),
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle future timestamp within tolerance', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const futureTimestamp = (Math.floor(Date.now() / 1000) + 10).toString(); // 10 seconds in future
      const signature = createSignature(payload, futureTimestamp);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-timestamp': futureTimestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: JSON.parse(payload),
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(true);
    });

    it('should handle non-JSON payload', () => {
      const payload = 'plain-text-payload';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(payload, timestamp);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-timestamp': timestamp,
          'x-whop-event': 'referral.created',
        },
        body: payload,
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(true);
    });

    it('should handle numeric timestamp', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createSignature(payload, timestamp.toString());

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-whop-signature': signature,
          'x-whop-timestamp': timestamp,
          'x-whop-event': 'referral.created',
          'content-type': 'application/json',
        },
        body: JSON.parse(payload),
      });

      const result = validateWebhookRequest(req, secret);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Direct Signature Verification', () => {
    it('should verify signature directly', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(payload, timestamp);

      const isValid = verifyWebhookSignature(payload, signature, timestamp, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature directly', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const invalidSignature = 'invalid-signature';

      const result = verifyWebhookSignature(payload, invalidSignature, timestamp, secret);
      expect(result).toBe(false);
    });
  });
});
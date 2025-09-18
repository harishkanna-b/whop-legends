import {
  rateLimitMiddleware,
  webhookRateLimit,
  apiRateLimit,
  authRateLimit,
  userRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  closeRateLimiter
} from '@/lib/rate-limit'
import { createServer } from 'http'
import { NextApiRequest } from 'next'

// Mock Redis for testing
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    pipeline: jest.fn(() => ({
      zremrangebyscore: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zrange: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 1], // zremrangebyscore result
        [null, 'ok'], // zadd result
        [null, 'ok'], // expire result
        [null, 5], // zcard result
        [null, ['1234567890-0.123', '1234567890']] // zrange result
      ])
    })),
    del: jest.fn().mockResolvedValue(1),
    zcard: jest.fn().mockResolvedValue(5),
    zrange: jest.fn().mockResolvedValue(['1234567890-0.123', '1234567890']),
    quit: jest.fn(),
    on: jest.fn()
  }))
}))

describe('Rate Limiting System', () => {
  let mockRequest: Partial<NextApiRequest>

  beforeEach(() => {
    mockRequest = {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.1'
      },
      connection: {
        remoteAddress: '192.168.1.1'
      },
      body: {}
    }

    // Clear memory store
    jest.resetModules()
  })

  afterEach(async () => {
    await closeRateLimiter()
  })

  describe('Basic Rate Limiting', () => {
    test('should allow requests within limit', async () => {
      const result = await rateLimitMiddleware(mockRequest as NextApiRequest, {
        windowMs: 60000, // 1 minute
        maxRequests: 5
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    test('should block requests exceeding limit', async () => {
      const options = {
        windowMs: 60000,
        maxRequests: 2
      }

      // First request
      let result = await rateLimitMiddleware(mockRequest as NextApiRequest, options)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)

      // Second request
      result = await rateLimitMiddleware(mockRequest as NextApiRequest, options)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)

      // Third request - should be blocked
      result = await rateLimitMiddleware(mockRequest as NextApiRequest, options)
      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeDefined()
      expect(result.remaining).toBe(0)
    })

    test('should use custom key generator', async () => {
      const customKeyGenerator = jest.fn(() => 'custom-key')

      const result = await rateLimitMiddleware(mockRequest as NextApiRequest, {
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: customKeyGenerator
      })

      expect(customKeyGenerator).toHaveBeenCalledWith(mockRequest)
      expect(result.allowed).toBe(true)
    })

    test('should reset after window expires', async () => {
      const options = {
        windowMs: 100, // 100ms for testing
        maxRequests: 1
      }

      // First request
      let result = await rateLimitMiddleware(mockRequest as NextApiRequest, options)
      expect(result.allowed).toBe(true)

      // Second request - should be blocked
      result = await rateLimitMiddleware(mockRequest as NextApiRequest, options)
      expect(result.allowed).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Third request - should be allowed again
      result = await rateLimitMiddleware(mockRequest as NextApiRequest, options)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Specialized Rate Limiters', () => {
    test('webhookRateLimit should use webhook ID when available', async () => {
      const webhookRequest = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          'x-whop-webhook-id': 'webhook-123'
        }
      }

      const result = await webhookRateLimit(webhookRequest as NextApiRequest)
      expect(result.allowed).toBe(true)
    })

    test('apiRateLimit should have stricter limits', async () => {
      const result = await apiRateLimit(mockRequest as NextApiRequest)
      expect(result.allowed).toBe(true)
    })

    test('authRateLimit should use IP + email combination', async () => {
      const authRequest = {
        ...mockRequest,
        body: {
          email: 'test@example.com'
        }
      }

      const result = await authRateLimit(authRequest as NextApiRequest)
      expect(result.allowed).toBe(true)
    })

    test('userRateLimit should use user ID when provided', async () => {
      const result = await userRateLimit(mockRequest as NextApiRequest, {
        userId: 'user-123',
        windowMs: 60000,
        maxRequests: 10
      })

      expect(result.allowed).toBe(true)
    })
  })

  describe('Rate Limit Status', () => {
    test('getRateLimitStatus should return current status', async () => {
      const status = await getRateLimitStatus('test-key')

      expect(status).toHaveProperty('current')
      expect(status).toHaveProperty('max')
      expect(status).toHaveProperty('remaining')
      expect(status).toHaveProperty('resetTime')
      expect(typeof status.current).toBe('number')
      expect(typeof status.max).toBe('number')
      expect(typeof status.remaining).toBe('number')
    })
  })

  describe('Rate Limit Reset', () => {
    test('resetRateLimit should clear the limit', async () => {
      const key = 'test-reset-key'

      // First, hit the limit
      const options = { windowMs: 60000, maxRequests: 1 }
      let result = await rateLimitMiddleware(mockRequest as NextApiRequest, {
        ...options,
        keyGenerator: () => key
      })
      expect(result.allowed).toBe(true)

      // Second request should be blocked
      result = await rateLimitMiddleware(mockRequest as NextApiRequest, {
        ...options,
        keyGenerator: () => key
      })
      expect(result.allowed).toBe(false)

      // Reset the limit
      await resetRateLimit(key)

      // Third request should be allowed again
      result = await rateLimitMiddleware(mockRequest as NextApiRequest, {
        ...options,
        keyGenerator: () => key
      })
      expect(result.allowed).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    test('should handle missing IP address', async () => {
      const requestWithoutIP = {
        headers: {},
        connection: {}
      }

      const result = await rateLimitMiddleware(requestWithoutIP as NextApiRequest, {
        windowMs: 60000,
        maxRequests: 5
      })

      expect(result.allowed).toBe(true)
    })

    test('should handle x-forwarded-for with multiple IPs', async () => {
      const requestWithMultipleIPs = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1'
        },
        connection: {}
      }

      const result = await rateLimitMiddleware(requestWithMultipleIPs as NextApiRequest, {
        windowMs: 60000,
        maxRequests: 5
      })

      expect(result.allowed).toBe(true)
    })

    test('should handle different keys for different users', async () => {
      const user1Request = {
        ...mockRequest,
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      }

      const user2Request = {
        ...mockRequest,
        headers: {
          'x-forwarded-for': '192.168.1.2'
        }
      }

      const options = { windowMs: 60000, maxRequests: 1 }

      // Both users should be able to make requests independently
      const result1 = await rateLimitMiddleware(user1Request as NextApiRequest, options)
      const result2 = await rateLimitMiddleware(user2Request as NextApiRequest, options)

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
    })
  })

  describe('Performance', () => {
    test('should handle high request volume', async () => {
      const options = { windowMs: 60000, maxRequests: 1000 }
      const requests = []

      // Make 500 requests concurrently
      for (let i = 0; i < 500; i++) {
        requests.push(rateLimitMiddleware(mockRequest as NextApiRequest, options))
      }

      const results = await Promise.all(requests)

      // All should be allowed since we're under the limit
      expect(results.every(r => r.allowed)).toBe(true)

      // Remaining should be consistent
      const remainingCount = results[results.length - 1].remaining
      expect(remainingCount).toBe(500)
    })

    test('should handle concurrent requests correctly', async () => {
      const options = { windowMs: 60000, maxRequests: 5 }
      const requests = []

      // Make 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        requests.push(rateLimitMiddleware(mockRequest as NextApiRequest, options))
      }

      const results = await Promise.all(requests)

      // First 5 should be allowed, rest should be blocked
      const allowedCount = results.filter(r => r.allowed).length
      expect(allowedCount).toBe(5)
    })
  })
})

describe('Rate Limiting Integration', () => {
  describe('Real-world Scenarios', () => {
    test('should simulate API endpoint protection', async () => {
      const simulateAPICall = async (ip: string) => {
        const request = {
          headers: { 'x-forwarded-for': ip },
          connection: { remoteAddress: ip }
        }
        return apiRateLimit(request as NextApiRequest)
      }

      // Simulate multiple users
      const users = ['user1', 'user2', 'user3']
      const results = []

      for (const user of users) {
        for (let i = 0; i < 70; i++) { // API limit is 60 per minute
          results.push(await simulateAPICall(user))
        }
      }

      // Each user should have been rate limited after 60 requests
      const user1Results = results.slice(0, 70)
      const user1Allowed = user1Results.filter(r => r.allowed).length
      expect(user1Allowed).toBe(60)
    })

    test('should simulate webhook burst handling', async () => {
      const simulateWebhook = async (webhookId: string) => {
        const request = {
          headers: { 'x-whop-webhook-id': webhookId },
          connection: { remoteAddress: 'webhook-server' }
        }
        return webhookRateLimit(request as NextApiRequest)
      }

      // Simulate webhook burst (200 allowed per minute)
      const results = []
      for (let i = 0; i < 250; i++) {
        results.push(await simulateWebhook('webhook-burst-test'))
      }

      const allowedCount = results.filter(r => r.allowed).length
      expect(allowedCount).toBe(200)
    })
  })
})
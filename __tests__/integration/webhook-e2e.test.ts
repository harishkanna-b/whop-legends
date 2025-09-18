import { createServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { verifyWebhookSignature } from '@/lib/webhooks'
import { handleWebhookEvent } from '@/pages/api/webhooks/whop'
import { closeRateLimiter } from '@/lib/rate-limit'

// Mock database and external services
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'user-123', level: 1, totalXP: 0 }, error: null }),
      update: jest.fn().mockResolvedValue({ data: { level: 2, totalXP: 100 }, error: null })
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null })
    }
  }
}))

// Mock Whop client
jest.mock('@/lib/whop-client', () => ({
  WhopClient: jest.fn().mockImplementation(() => ({
    getCompany: jest.fn().mockResolvedValue({ id: 'company-123' }),
    getApp: jest.fn().mockResolvedValue({ id: 'app-123' }),
    getUser: jest.fn().mockResolvedValue({ id: 'user-123' })
  }))
}))

describe('Webhook End-to-End Integration', () => {
  let server: any
  let receivedWebhooks: any[] = []

  beforeAll(async () => {
    // Create a test server that simulates the webhook endpoint
    server = createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/api/webhooks/whop') {
        try {
          const body = await new Promise((resolve, reject) => {
            let data = ''
            req.on('data', chunk => data += chunk)
            req.on('end', () => resolve(data))
            req.on('error', reject)
          })

          const signature = req.headers['x-whop-signature'] as string
          const timestamp = req.headers['x-whop-timestamp'] as string
          const requestId = req.headers['x-whop-request-id'] as string

          // Verify signature
          const isValid = await verifyWebhookSignature(
            body as string,
            signature,
            timestamp,
            requestId,
            process.env.WHOP_WEBHOOK_SECRET || 'test-secret'
          )

          if (!isValid) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid signature' }))
            return
          }

          // Parse and handle webhook
          const webhookData = JSON.parse(body as string)
          const result = await handleWebhookEvent(webhookData)

          // Store for verification
          receivedWebhooks.push({
            id: requestId,
            data: webhookData,
            timestamp: new Date().toISOString()
          })

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (error) {
          console.error('Webhook error:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Internal server error' }))
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Not found' }))
      }
    })

    await new Promise<void>((resolve) => {
      server.listen(3001, resolve)
    })
  })

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(resolve))
    }
    await closeRateLimiter()
  })

  beforeEach(() => {
    receivedWebhooks = []
  })

  describe('Webhook Processing Flow', () => {
    test('should process valid referral created webhook', async () => {
      const webhookData = {
        id: 'webhook-test-1',
        type: 'referral.created',
        timestamp: new Date().toISOString(),
        data: {
          referralId: 'ref-123',
          referrerId: 'user-123',
          referredId: 'user-456',
          status: 'pending',
          value: 100,
          metadata: {
            source: 'website',
            campaign: 'summer-2024'
          }
        }
      }

      const signature = 'valid-signature' // Mock signature
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const requestId = 'req-' + Math.random().toString(36).substr(2, 9)

      const response = await fetch('http://localhost:3001/api/webhooks/whop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Whop-Signature': signature,
          'X-Whop-Timestamp': timestamp,
          'X-Whop-Request-Id': requestId
        },
        body: JSON.stringify(webhookData)
      })

      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('success', true)

      // Verify webhook was received and stored
      expect(receivedWebhooks).toHaveLength(1)
      expect(receivedWebhooks[0].id).toBe(requestId)
      expect(receivedWebhooks[0].data.type).toBe('referral.created')
    })

    test('should reject webhook with invalid signature', async () => {
      const webhookData = {
        id: 'webhook-test-2',
        type: 'referral.created',
        timestamp: new Date().toISOString(),
        data: {
          referralId: 'ref-123',
          referrerId: 'user-123',
          referredId: 'user-456',
          status: 'pending'
        }
      }

      const invalidSignature = 'invalid-signature'
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const requestId = 'req-' + Math.random().toString(36).substr(2, 9)

      const response = await fetch('http://localhost:3001/api/webhooks/whop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Whop-Signature': invalidSignature,
          'X-Whop-Timestamp': timestamp,
          'X-Whop-Request-Id': requestId
        },
        body: JSON.stringify(webhookData)
      })

      expect(response.status).toBe(401)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error', 'Invalid signature')

      // Verify webhook was not processed
      expect(receivedWebhooks).toHaveLength(0)
    })

    test('should handle duplicate webhook prevention', async () => {
      const webhookData = {
        id: 'webhook-test-3',
        type: 'referral.created',
        timestamp: new Date().toISOString(),
        data: {
          referralId: 'ref-123',
          referrerId: 'user-123',
          referredId: 'user-456',
          status: 'pending'
        }
      }

      const signature = 'valid-signature'
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const requestId = 'req-duplicate-test'

      // Send first webhook
      const response1 = await fetch('http://localhost:3001/api/webhooks/whop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Whop-Signature': signature,
          'X-Whop-Timestamp': timestamp,
          'X-Whop-Request-Id': requestId
        },
        body: JSON.stringify(webhookData)
      })

      expect(response1.status).toBe(200)

      // Send duplicate webhook with same request ID
      const response2 = await fetch('http://localhost:3001/api/webhooks/whop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Whop-Signature': signature,
          'X-Whop-Timestamp': timestamp,
          'X-Whop-Request-Id': requestId
        },
        body: JSON.stringify(webhookData)
      })

      // Should be rejected as duplicate
      expect(response2.status).toBe(409)

      // Only first webhook should be processed
      expect(receivedWebhooks).toHaveLength(1)
    })

    test('should process different webhook types correctly', async () => {
      const webhookTypes = [
        'referral.created',
        'referral.completed',
        'referral.cancelled',
        'user.created',
        'subscription.created'
      ]

      for (const type of webhookTypes) {
        const webhookData = {
          id: `webhook-${type}-${Math.random()}`,
          type,
          timestamp: new Date().toISOString(),
          data: {
            referralId: 'ref-' + Math.random().toString(36).substr(2, 9),
            referrerId: 'user-123',
            referredId: 'user-456',
            status: type === 'referral.cancelled' ? 'cancelled' : 'pending',
            value: type === 'referral.completed' ? 200 : 100
          }
        }

        const signature = 'valid-signature'
        const timestamp = Math.floor(Date.now() / 1000).toString()
        const requestId = 'req-' + Math.random().toString(36).substr(2, 9)

        const response = await fetch('http://localhost:3001/api/webhooks/whop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Whop-Signature': signature,
            'X-Whop-Timestamp': timestamp,
            'X-Whop-Request-Id': requestId
          },
          body: JSON.stringify(webhookData)
        })

        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData).toHaveProperty('success', true)
      }

      expect(receivedWebhooks).toHaveLength(webhookTypes.length)
    })
  })

  describe('Rate Limiting Integration', () => {
    test('should apply rate limiting to webhook endpoints', async () => {
      const webhookData = {
        id: 'webhook-rate-test',
        type: 'referral.created',
        timestamp: new Date().toISOString(),
        data: {
          referralId: 'ref-123',
          referrerId: 'user-123',
          referredId: 'user-456',
          status: 'pending'
        }
      }

      const signature = 'valid-signature'
      const timestamp = Math.floor(Date.now() / 1000).toString()

      const requests = []
      const requestCount = 250 // Exceeds rate limit of 200

      for (let i = 0; i < requestCount; i++) {
        const requestId = `req-rate-${i}`
        requests.push(
          fetch('http://localhost:3001/api/webhooks/whop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Whop-Signature': signature,
              'X-Whop-Timestamp': timestamp,
              'X-Whop-Request-Id': requestId
            },
            body: JSON.stringify(webhookData)
          })
        )
      }

      const responses = await Promise.all(requests)
      const successCount = responses.filter(r => r.status === 200).length
      const rateLimitedCount = responses.filter(r => r.status === 429).length

      // First 200 should succeed, rest should be rate limited
      expect(successCount).toBe(200)
      expect(rateLimitedCount).toBe(50)
    })
  })

  describe('Error Handling and Resilience', () => {
    test('should handle malformed JSON gracefully', async () => {
      const malformedJson = '{ invalid json'

      const signature = 'valid-signature'
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const requestId = 'req-malformed'

      const response = await fetch('http://localhost:3001/api/webhooks/whop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Whop-Signature': signature,
          'X-Whop-Timestamp': timestamp,
          'X-Whop-Request-Id': requestId
        },
        body: malformedJson
      })

      expect(response.status).toBe(400)
      expect(receivedWebhooks).toHaveLength(0)
    })

    test('should handle missing required headers', async () => {
      const webhookData = {
        id: 'webhook-test',
        type: 'referral.created',
        timestamp: new Date().toISOString(),
        data: {
          referralId: 'ref-123',
          referrerId: 'user-123',
          referredId: 'user-456',
          status: 'pending'
        }
      }

      // Missing signature header
      const response = await fetch('http://localhost:3001/api/webhooks/whop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Whop-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'X-Whop-Request-Id': 'req-missing-headers'
        },
        body: JSON.stringify(webhookData)
      })

      expect(response.status).toBe(400)
    })

    test('should handle database connection failures gracefully', async () => {
      // Mock database failure
      const { supabase } = require('@/lib/supabase')
      supabase.from = jest.fn(() => ({
        insert: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }))

      const webhookData = {
        id: 'webhook-db-error',
        type: 'referral.created',
        timestamp: new Date().toISOString(),
        data: {
          referralId: 'ref-123',
          referrerId: 'user-123',
          referredId: 'user-456',
          status: 'pending'
        }
      }

      const signature = 'valid-signature'
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const requestId = 'req-db-error'

      const response = await fetch('http://localhost:3001/api/webhooks/whop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Whop-Signature': signature,
          'X-Whop-Timestamp': timestamp,
          'X-Whop-Request-Id': requestId
        },
        body: JSON.stringify(webhookData)
      })

      expect(response.status).toBe(500)
    })
  })

  describe('Performance and Scalability', () => {
    test('should handle concurrent webhook processing', async () => {
      const concurrentRequests = 50
      const webhookData = {
        id: 'webhook-concurrent',
        type: 'referral.created',
        timestamp: new Date().toISOString(),
        data: {
          referralId: 'ref-123',
          referrerId: 'user-123',
          referredId: 'user-456',
          status: 'pending'
        }
      }

      const signature = 'valid-signature'
      const timestamp = Math.floor(Date.now() / 1000).toString()

      const startTime = Date.now()
      const requests = []

      for (let i = 0; i < concurrentRequests; i++) {
        const requestId = `req-concurrent-${i}`
        requests.push(
          fetch('http://localhost:3001/api/webhooks/whop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Whop-Signature': signature,
              'X-Whop-Timestamp': timestamp,
              'X-Whop-Request-Id': requestId
            },
            body: JSON.stringify(webhookData)
          })
        )
      }

      const responses = await Promise.all(requests)
      const endTime = Date.now()

      const successCount = responses.filter(r => r.status === 200).length
      const processingTime = endTime - startTime

      expect(successCount).toBe(concurrentRequests)
      expect(processingTime).toBeLessThan(5000) // Should process within 5 seconds

      console.log(`Processed ${concurrentRequests} concurrent webhooks in ${processingTime}ms`)
    })

    test('should maintain performance under sustained load', async () => {
      const sustainedRequests = 100
      const webhookData = {
        id: 'webhook-sustained',
        type: 'referral.created',
        timestamp: new Date().toISOString(),
        data: {
          referralId: 'ref-123',
          referrerId: 'user-123',
          referredId: 'user-456',
          status: 'pending'
        }
      }

      const signature = 'valid-signature'
      const timestamp = Math.floor(Date.now() / 1000).toString()

      const startTime = Date.now()
      const responseTimes = []

      for (let i = 0; i < sustainedRequests; i++) {
        const requestId = `req-sustained-${i}`
        const requestStart = Date.now()

        await fetch('http://localhost:3001/api/webhooks/whop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Whop-Signature': signature,
            'X-Whop-Timestamp': timestamp,
            'X-Whop-Request-Id': requestId
          },
          body: JSON.stringify(webhookData)
        })

        responseTimes.push(Date.now() - requestStart)
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)
      const requestsPerSecond = sustainedRequests / (totalTime / 1000)

      expect(avgResponseTime).toBeLessThan(100) // Average response time under 100ms
      expect(maxResponseTime).toBeLessThan(500) // Max response time under 500ms
      expect(requestsPerSecond).toBeGreaterThan(10) // At least 10 requests per second

      console.log(`Sustained load: ${requestsPerSecond.toFixed(2)} RPS, avg response: ${avgResponseTime.toFixed(2)}ms`)
    })
  })
})
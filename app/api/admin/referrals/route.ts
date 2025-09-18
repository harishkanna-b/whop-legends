import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function handler(request: NextRequest) {
  try {
    // In a real implementation, these would come from your database
    const referrals = [
      {
        id: '1',
        referrerId: '1',
        referredUserId: '2',
        status: 'completed',
        value: 100.00,
        commission: 10.00,
        commissionRate: 10.0,
        createdAt: '2024-01-15T10:30:00Z',
        completedAt: '2024-01-16T10:30:00Z',
        referrer: {
          id: '1',
          username: 'john_doe',
          email: 'john@example.com',
          characterClass: 'scout'
        },
        referredUser: {
          id: '2',
          username: 'jane_smith',
          email: 'jane@example.com',
          characterClass: 'champion'
        }
      },
      {
        id: '2',
        referrerId: '1',
        referredUserId: '3',
        status: 'pending',
        value: 150.00,
        commission: 15.00,
        commissionRate: 10.0,
        createdAt: '2024-01-18T14:25:00Z',
        referrer: {
          id: '1',
          username: 'john_doe',
          email: 'john@example.com',
          characterClass: 'scout'
        },
        referredUser: {
          id: '3',
          username: 'bob_wilson',
          email: 'bob@example.com',
          characterClass: 'sage'
        }
      }
    ]

    const analytics = {
      totalReferrals: 45678,
      completedReferrals: 42156,
      pendingReferrals: 3522,
      totalRevenue: 1250000,
      totalCommission: 125000,
      averageCommission: 27.40,
      topReferrers: [
        { id: '1', username: 'john_doe', referrals: 156, commission: 1560.00 },
        { id: '2', username: 'jane_smith', referrals: 142, commission: 1420.00 },
        { id: '3', username: 'bob_wilson', referrals: 98, commission: 980.00 }
      ]
    }

    return NextResponse.json({
      referrals,
      analytics
    })
  } catch (error) {
    console.error('Error getting referrals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request as any, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    keyGenerator: (req) => `admin:${req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'}`
  })

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
      { status: 429 }
    )
  }

  return await handler(request)
}
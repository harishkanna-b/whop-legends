import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function handler(request: NextRequest) {
  try {
    // In a real implementation, these would come from your database
    const users = [
      {
        id: '1',
        email: 'john@example.com',
        username: 'john_doe',
        level: 15,
        totalXP: 45000,
        characterClass: 'scout',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        lastLogin: '2024-01-20T14:25:00Z',
        stats: {
          referrals: 12,
          friends: 8,
          achievements: 25
        }
      },
      {
        id: '2',
        email: 'jane@example.com',
        username: 'jane_smith',
        level: 23,
        totalXP: 89000,
        characterClass: 'champion',
        isActive: true,
        createdAt: '2024-01-10T09:15:00Z',
        lastLogin: '2024-01-20T13:45:00Z',
        stats: {
          referrals: 8,
          friends: 15,
          achievements: 42
        }
      },
      {
        id: '3',
        email: 'bob@example.com',
        username: 'bob_wilson',
        level: 7,
        totalXP: 12000,
        characterClass: 'sage',
        isActive: false,
        createdAt: '2024-01-18T16:20:00Z',
        lastLogin: '2024-01-19T11:30:00Z',
        stats: {
          referrals: 3,
          friends: 5,
          achievements: 12
        }
      }
    ]

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error getting users:', error)
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

export const POST = async (request: NextRequest) => {
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

  try {
    const body = await request.json()
    // Handle user creation logic
    return NextResponse.json({ success: true, message: 'User created successfully' })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
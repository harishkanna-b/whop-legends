import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function handler(request: NextRequest) {
  try {
    // In a real implementation, these would come from your database
    const socialStats = {
      totalFriends: 28456,
      totalTeams: 3421,
      totalTeamMembers: 8934,
      activeConnections: 5678,
      pendingRequests: 1234,
      recentActivities: [
        {
          id: '1',
          type: 'friend_request',
          userId: '1',
          targetUserId: '2',
          username: 'john_doe',
          targetUsername: 'jane_smith',
          action: 'sent',
          timestamp: '2024-01-20T14:25:00Z'
        },
        {
          id: '2',
          type: 'team_creation',
          userId: '3',
          teamId: '1',
          username: 'bob_wilson',
          teamName: 'Legends United',
          action: 'created',
          timestamp: '2024-01-20T13:45:00Z'
        }
      ]
    }

    return NextResponse.json(socialStats)
  } catch (error) {
    console.error('Error getting social stats:', error)
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
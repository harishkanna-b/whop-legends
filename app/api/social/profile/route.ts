import { NextRequest, NextResponse } from 'next/server'
import { socialManager } from '@/lib/social'
import { withRateLimit } from '@/lib/middleware'

// Handler with rate limiting
const handler = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'get':
        const profile = await socialManager.getSocialProfile(userId)
        return NextResponse.json({ success: true, data: profile })

      case 'activity':
        const limit = parseInt(searchParams.get('limit') || '20')
        const activity = await socialManager.getSocialActivity(userId, limit)
        return NextResponse.json({ success: true, data: activity })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: get or activity' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Social profile API error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Social profile not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handler, {
  type: 'api',
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100
})
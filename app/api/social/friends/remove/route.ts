import { NextRequest, NextResponse } from 'next/server'
import { socialManager } from '@/lib/social'
import { withRateLimit } from '@/lib/middleware'

// Handler with rate limiting
const handler = async (request: NextRequest) => {
  try {
    if (request.method !== 'DELETE') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const friendId = searchParams.get('friendId')

    if (!userId || !friendId) {
      return NextResponse.json(
        { error: 'userId and friendId are required' },
        { status: 400 }
      )
    }

    if (userId === friendId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself as a friend' },
        { status: 400 }
      )
    }

    await socialManager.removeFriend(userId, friendId)

    return NextResponse.json({
      success: true,
      message: 'Friend removed successfully'
    })
  } catch (error) {
    console.error('Friend remove API error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Friendship not found' },
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

export const DELETE = withRateLimit(handler, {
  type: 'api',
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20
})
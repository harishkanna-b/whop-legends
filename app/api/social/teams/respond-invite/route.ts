import { NextRequest, NextResponse } from 'next/server'
import { socialManager } from '@/lib/social'
import { withRateLimit } from '@/lib/middleware'

// Handler with rate limiting
const handler = async (request: NextRequest) => {
  try {
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      )
    }

    const body = await request.json()
    const { inviteId, userId, action } = body

    if (!inviteId || !userId || !action) {
      return NextResponse.json(
        { error: 'inviteId, userId, and action are required' },
        { status: 400 }
      )
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "accept" or "reject"' },
        { status: 400 }
      )
    }

    let result
    if (action === 'accept') {
      result = await socialManager.acceptTeamInvite(inviteId, userId)
    } else {
      result = await socialManager.rejectTeamInvite(inviteId, userId)
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Team invitation ${action}ed successfully`
    })
  } catch (error) {
    console.error('Team invite respond API error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Team invitation not found' },
          { status: 404 }
        )
      }
      if (error.message.includes('not authorized')) {
        return NextResponse.json(
          { error: 'Not authorized to respond to this invitation' },
          { status: 403 }
        )
      }
      if (error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'Team invitation has expired' },
          { status: 410 }
        )
      }
      if (error.message.includes('team is full')) {
        return NextResponse.json(
          { error: 'Team is full' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handler, {
  type: 'api',
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20
})
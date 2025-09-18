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
    const {
      leaderId,
      name,
      description,
      avatar,
      banner,
      maxMembers,
      isPrivate
    } = body

    if (!leaderId || !name || !description) {
      return NextResponse.json(
        { error: 'leaderId, name, and description are required' },
        { status: 400 }
      )
    }

    const teamOptions = {
      avatar,
      banner,
      maxMembers: maxMembers || 10,
      isPrivate: isPrivate || false
    }

    const team = await socialManager.createTeam(
      leaderId,
      name,
      description,
      teamOptions
    )

    return NextResponse.json({
      success: true,
      data: team,
      message: 'Team created successfully'
    })
  } catch (error) {
    console.error('Team create API error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('already leads a team')) {
        return NextResponse.json(
          { error: 'User already leads a team' },
          { status: 409 }
        )
      }
      if (error.message.includes('team name already exists')) {
        return NextResponse.json(
          { error: 'Team name already exists' },
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
  maxRequests: 5 // Very restrictive for team creation
})
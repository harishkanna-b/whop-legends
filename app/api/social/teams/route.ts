import { NextRequest, NextResponse } from 'next/server'
import { socialManager } from '@/lib/social'
import { withRateLimit } from '@/lib/middleware'

// Handler with rate limiting
const handler = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const teamId = searchParams.get('teamId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'my-teams':
        const userTeams = await socialManager.getUserTeams(userId)
        return NextResponse.json({ success: true, data: userTeams })

      case 'team':
        if (!teamId) {
          return NextResponse.json(
            { error: 'Team ID is required for this action' },
            { status: 400 }
          )
        }
        const team = await socialManager.getTeam(teamId)
        return NextResponse.json({ success: true, data: team })

      case 'discover':
        const discoverableTeams = await socialManager.getDiscoverableTeams(userId)
        return NextResponse.json({ success: true, data: discoverableTeams })

      case 'join-via-code':
        const inviteCode = searchParams.get('inviteCode')
        if (!inviteCode) {
          return NextResponse.json(
            { error: 'Invite code is required' },
            { status: 400 }
          )
        }
        const joinedTeam = await socialManager.joinTeamViaCode(userId, inviteCode)
        return NextResponse.json({
          success: true,
          data: joinedTeam,
          message: 'Joined team successfully'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: my-teams, team, discover, or join-via-code' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Teams API error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        )
      }
      if (error.message.includes('already a member')) {
        return NextResponse.json(
          { error: 'Already a member of this team' },
          { status: 409 }
        )
      }
      if (error.message.includes('team is full')) {
        return NextResponse.json(
          { error: 'Team is full' },
          { status: 409 }
        )
      }
      if (error.message.includes('invalid invite code')) {
        return NextResponse.json(
          { error: 'Invalid invite code' },
          { status: 400 }
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
import { NextRequest, NextResponse } from 'next/server'
import { achievementManager } from '@/lib/achievements'
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
      case 'progress':
        const progress = await achievementManager.getAchievementProgress(userId)
        return NextResponse.json({ success: true, data: progress })

      case 'stats':
        const stats = await achievementManager.getAchievementStats(userId)
        return NextResponse.json({ success: true, data: stats })

      case 'recent':
        const limit = parseInt(searchParams.get('limit') || '10')
        const recent = await achievementManager.getRecentAchievements(userId, limit)
        return NextResponse.json({ success: true, data: recent })

      default:
        // Return all achievements
        const achievements = await achievementManager.getAllAchievements()
        const userAchievements = await achievementManager.getUserAchievements(userId)

        return NextResponse.json({
          success: true,
          data: {
            achievements,
            userAchievements
          }
        })
    }
  } catch (error) {
    console.error('Achievement API error:', error)
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
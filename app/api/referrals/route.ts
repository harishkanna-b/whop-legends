import { NextRequest, NextResponse } from 'next/server'
import { referralManager } from '@/lib/referral-tracking'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const timeframe = searchParams.get('timeframe') as '7d' | '30d' | '90d' | '1y' | 'all' || 'all'

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: 'Missing userId or action' }, { status: 400 })
    }

    switch (action) {
      case 'stats':
        const stats = await referralManager.getReferralStats(userId, timeframe)
        return NextResponse.json({ success: true, data: stats })

      case 'referrals':
        const referrals = await referralManager.getUserReferrals(userId, timeframe)
        return NextResponse.json({ success: true, data: referrals })

      case 'campaigns':
        const campaigns = await referralManager.getUserCampaigns(userId)
        return NextResponse.json({ success: true, data: campaigns })

      case 'analytics':
        const analytics = await referralManager.getReferralAnalytics(userId, timeframe === 'all' ? undefined : timeframe)
        return NextResponse.json({ success: true, data: analytics })

      case 'generate-link':
        const campaignId = searchParams.get('campaignId') || undefined
        const link = await referralManager.generateReferralLink(userId, campaignId)
        return NextResponse.json({ success: true, data: { link } })

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Referrals API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request as any, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyGenerator: (req) => `referrals:${req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'}`
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
    maxRequests: 100, // 100 requests per minute
    keyGenerator: (req) => `referrals:${req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'}`
  })

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { userId, action, ...data } = body

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: 'Missing userId or action' }, { status: 400 })
    }

    switch (action) {
      case 'create-campaign':
        const campaign = await referralManager.createCampaign(userId, data)
        return NextResponse.json({ success: true, data: campaign })

      case 'track-click':
        const { code, clickData } = data
        await referralManager.trackReferralClick(code, clickData)
        return NextResponse.json({ success: true })

      case 'create-referral':
        const referral = await referralManager.createReferral(
          data.referrerId,
          data.referredUserId,
          data.value,
          data.source,
          data.metadata
        )
        return NextResponse.json({ success: true, data: referral })

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Referrals POST API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

interface SystemSettings {
  general: {
    siteName: string
    siteUrl: string
    maintenanceMode: boolean
    registrationEnabled: boolean
  }
  features: {
    socialFeatures: boolean
    achievements: boolean
    referrals: boolean
    teams: boolean
  }
  limits: {
    maxFriends: number
    maxTeamMembers: number
    maxReferrals: number
    maxAchievements: number
  }
  security: {
    requireEmailVerification: boolean
    sessionTimeout: number
    maxLoginAttempts: number
    passwordMinLength: number
  }
}

async function handler(request: NextRequest) {
  try {
    if (request.method === 'GET') {
      // Return current settings
      const settings: SystemSettings = {
        general: {
          siteName: 'Whop Legends',
          siteUrl: 'https://whop-legends.com',
          maintenanceMode: false,
          registrationEnabled: true
        },
        features: {
          socialFeatures: true,
          achievements: true,
          referrals: true,
          teams: true
        },
        limits: {
          maxFriends: 500,
          maxTeamMembers: 50,
          maxReferrals: 1000,
          maxAchievements: 200
        },
        security: {
          requireEmailVerification: true,
          sessionTimeout: 3600,
          maxLoginAttempts: 5,
          passwordMinLength: 8
        }
      }

      return NextResponse.json(settings)
    } else if (request.method === 'POST') {
      // Update settings
      const body = await request.json()

      // In a real implementation, this would update the database
      // For now, just return success
      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully',
        settings: body
      })
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  } catch (error) {
    console.error('Error handling settings:', error)
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

  return await handler(request)
}
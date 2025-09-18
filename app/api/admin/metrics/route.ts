import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function handler(request: NextRequest) {
  try {
    // In a real implementation, these would come from your database
    const metrics = {
      cpu: {
        usage: 45.2,
        cores: 8,
        temperature: 62
      },
      memory: {
        total: 16 * 1024 * 1024 * 1024, // 16GB
        used: 8.5 * 1024 * 1024 * 1024, // 8.5GB
        free: 7.5 * 1024 * 1024 * 1024, // 7.5GB
        usage: 53.1
      },
      disk: {
        total: 500 * 1024 * 1024 * 1024, // 500GB
        used: 250 * 1024 * 1024 * 1024, // 250GB
        free: 250 * 1024 * 1024 * 1024, // 250GB
        usage: 50.0
      },
      network: {
        incoming: 1024 * 1024, // 1MB/s
        outgoing: 512 * 1024, // 512KB/s
        totalConnections: 1247
      },
      uptime: 1327680, // 15 days 8 hours 32 minutes
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error getting system metrics:', error)
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
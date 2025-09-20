import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { apiRateLimit, webhookRateLimit, authRateLimit, RateLimitResult } from './rate-limit'

export interface RateLimitConfig {
  type: 'api' | 'webhook' | 'auth' | 'custom'
  windowMs?: number
  maxRequests?: number
  keyGenerator?: (req: any) => string
  skipSuccessfulRequests?: boolean
  errorMessage?: string
}

export class RateLimitMiddleware {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async middleware(request: NextRequest): Promise<NextResponse | null> {
    try {
      // Convert NextRequest to a format compatible with our rate limiter
      const req = this.convertNextRequest(request)

      let result: RateLimitResult

      switch (this.config.type) {
        case 'api':
          result = await apiRateLimit(req)
          break
        case 'webhook':
          result = await webhookRateLimit(req)
          break
        case 'auth':
          result = await authRateLimit(req)
          break
        case 'custom':
          if (!this.config.windowMs || !this.config.maxRequests) {
            throw new Error('Custom rate limiting requires windowMs and maxRequests')
          }
          result = await this.customRateLimit(req)
          break
        default:
          throw new Error(`Unknown rate limit type: ${this.config.type}`)
      }

      // Add rate limit headers to response
      const response = this.createRateLimitResponse(result)

      if (!result.allowed) {
        return response
      }

      // If rate limiting passed, return null to continue the chain
      return null
    } catch (error) {
      console.error('Rate limiting middleware error:', error)
      // Continue without rate limiting on error
      return null
    }
  }

  private convertNextRequest(request: NextRequest): any {
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    return {
      headers,
      connection: {
        remoteAddress: this.getClientIP(request)
      },
      body: this.getBodyFromRequest(request)
    }
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    return realIP || 'unknown'
  }

  private getBodyFromRequest(request: NextRequest): any {
    // For auth rate limiting, we need the email/username from the body
    // This is a simplified version - in production, you might want to parse the body
    return {}
  }

  private async customRateLimit(req: any): Promise<RateLimitResult> {
    const { rateLimitMiddleware } = await import('./rate-limit')

    return rateLimitMiddleware(req, {
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests,
      keyGenerator: this.config.keyGenerator
    })
  }

  private createRateLimitResponse(result: RateLimitResult): NextResponse {
    const response = NextResponse.json(
      {
        error: 'Too many requests',
        message: this.config.errorMessage || 'Rate limit exceeded',
        retryAfter: result.retryAfter
      },
      { status: 429 }
    )

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '100') // Default limit
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())

    if (result.retryAfter) {
      response.headers.set('Retry-After', result.retryAfter.toString())
    }

    return response
  }
}

// Pre-configured middleware instances
export const apiRateLimitMiddleware = new RateLimitMiddleware({
  type: 'api',
  errorMessage: 'API rate limit exceeded. Please try again later.'
})

export const webhookRateLimitMiddleware = new RateLimitMiddleware({
  type: 'webhook',
  errorMessage: 'Webhook rate limit exceeded. Please slow down your requests.'
})

export const authRateLimitMiddleware = new RateLimitMiddleware({
  type: 'auth',
  errorMessage: 'Too many authentication attempts. Please wait before trying again.'
})

// Higher-order function to create custom middleware
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return new RateLimitMiddleware(config)
}

// Helper function to apply rate limiting to API routes
export function withRateLimit(handler: (request: NextRequest) => Promise<NextResponse>, config: RateLimitConfig) {
  const middleware = new RateLimitMiddleware(config)

  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await middleware.middleware(request)

    if (rateLimitResponse) {
      return rateLimitResponse
    }

    return handler(request)
  }
}

// Specialized rate limiting for different endpoint types
export const createApiRouteHandler = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return withRateLimit(handler, {
    type: 'api',
    errorMessage: 'API rate limit exceeded. Please try again later.'
  })
}

export const createWebhookHandler = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return withRateLimit(handler, {
    type: 'webhook',
    errorMessage: 'Webhook rate limit exceeded. Please slow down your requests.'
  })
}

export const createAuthHandler = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return withRateLimit(handler, {
    type: 'auth',
    errorMessage: 'Too many authentication attempts. Please wait before trying again.'
  })
}
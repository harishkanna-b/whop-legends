export interface AppConfig {
  environment: 'development' | 'staging' | 'production'
  database: {
    url: string
    maxConnections: number
    ssl: boolean
  }
  redis: {
    url: string
    maxRetries: number
    retryDelay: number
    connectionTimeout: number
  }
  rateLimiting: {
    enabled: boolean
    defaultWindowMs: number
    defaultMaxRequests: number
    useRedis: boolean
  }
  webhook: {
    secret: string
    timeoutMs: number
    maxRetries: number
  }
  api: {
    corsOrigins: string[]
    rateLimiting: {
      enabled: boolean
      windowMs: number
      maxRequests: number
    }
  }
  auth: {
    rateLimiting: {
      enabled: boolean
      windowMs: number
      maxRequests: number
    }
  }
  monitoring: {
    enabled: boolean
    metricsEndpoint: string
    healthCheckEndpoint: string
  }
}

class Config {
  private static instance: Config
  private config: AppConfig

  private constructor() {
    this.config = this.loadConfig()
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config()
    }
    return Config.instance
  }

  // Reset instance for testing
  static resetInstance(): void {
    Config.instance = undefined
  }

  private loadConfig(): AppConfig {
    const environment = (process.env.NODE_ENV || 'development') as AppConfig['environment']

    return {
      environment,
      database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/whop_legends',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        ssl: environment === 'production' || process.env.DB_SSL === 'true'
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000'),
        connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '5000')
      },
      rateLimiting: {
        enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
        defaultWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
        defaultMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        useRedis: process.env.USE_REDIS_RATE_LIMITING !== 'false'
      },
      webhook: {
        secret: process.env.WHOP_WEBHOOK_SECRET || '',
        timeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '30000'),
        maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3')
      },
      api: {
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
          'http://localhost:3000',
          'https://whop.com'
        ],
        rateLimiting: {
          enabled: process.env.API_RATE_LIMITING_ENABLED !== 'false',
          windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000'),
          maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '60')
        }
      },
      auth: {
        rateLimiting: {
          enabled: process.env.AUTH_RATE_LIMITING_ENABLED !== 'false',
          windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
          maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5')
        }
      },
      monitoring: {
        enabled: process.env.MONITORING_ENABLED !== 'false',
        metricsEndpoint: process.env.METRICS_ENDPOINT || '/api/metrics',
        healthCheckEndpoint: process.env.HEALTH_CHECK_ENDPOINT || '/api/health'
      }
    }
  }

  get(): AppConfig {
    return { ...this.config }
  }

  get env(): string {
    return this.config.environment
  }

  get isProduction(): boolean {
    return this.config.environment === 'production'
  }

  get isDevelopment(): boolean {
    return this.config.environment === 'development'
  }

  get isStaging(): boolean {
    return this.config.environment === 'staging'
  }

  // Convenience getters for common configurations
  get databaseUrl(): string {
    return this.config.database.url
  }

  get redisUrl(): string {
    return this.config.redis.url
  }

  get webhookSecret(): string {
    return this.config.webhook.secret
  }

  get rateLimitingEnabled(): boolean {
    return this.config.rateLimiting.enabled
  }

  get useRedisForRateLimiting(): boolean {
    return this.config.rateLimiting.useRedis
  }

  // Validate configuration
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.config.webhook.secret && this.isProduction) {
      errors.push('WHOP_WEBHOOK_SECRET is required in production')
    }

    if (!this.config.database.url) {
      errors.push('DATABASE_URL is required')
    }

    if (this.config.rateLimiting.enabled && this.config.rateLimiting.useRedis) {
      if (!this.config.redis.url) {
        errors.push('REDIS_URL is required when using Redis for rate limiting')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Update configuration (for testing or runtime updates)
  update(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  // Environment-specific configurations
  getRateLimitConfig(type: 'api' | 'webhook' | 'auth' | 'default'): {
    windowMs: number
    maxRequests: number
  } {
    switch (type) {
      case 'api':
        return {
          windowMs: this.config.api.rateLimiting.windowMs,
          maxRequests: this.config.api.rateLimiting.maxRequests
        }
      case 'webhook':
        return {
          windowMs: 60000, // 1 minute
          maxRequests: 200 // 200 per minute
        }
      case 'auth':
        return {
          windowMs: this.config.auth.rateLimiting.windowMs,
          maxRequests: this.config.auth.rateLimiting.maxRequests
        }
      default:
        return {
          windowMs: this.config.rateLimiting.defaultWindowMs,
          maxRequests: this.config.rateLimiting.defaultMaxRequests
        }
    }
  }
}

export const config = Config.getInstance()

// Export default for convenience
export default config
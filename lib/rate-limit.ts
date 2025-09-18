import { NextApiRequest } from 'next';

// Mock Redis client for development - in production, use actual Redis
let redisClient: any = null;

// Redis client mock
const mockRedisClient = {
  on: (event: string, callback: Function) => {},
  connect: async () => {},
  pipeline: () => ({
    zremrangebyscore: () => mockRedisClient,
    zadd: () => mockRedisClient,
    expire: () => mockRedisClient,
    zcard: () => mockRedisClient,
    zrange: () => mockRedisClient,
    exec: async () => [
      [null, 0],
      [null, 0],
      [null, 0],
      [null, []]
    ]
  }),
  quit: async () => {},
  del: async () => {}
};

// Redis mock function
function createClientMock(config: any) {
  return mockRedisClient;
}

// Try to import Redis, fallback to mock
let createClient = createClientMock;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const redis = require('redis');
  if (redis.createClient) {
    createClient = redis.createClient;
  }
} catch (error) {
  console.log('Redis not available, using mock for rate limiting');
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Redis client for production rate limiting (already declared above)

// Initialize Redis if available
async function initializeRedis() {
  if (redisClient) return redisClient;

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });

    await redisClient.connect();
    console.log('Redis rate limiter initialized');
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis for rate limiting, falling back to memory:', error);
    return null;
  }
}

// Fallback in-memory store for development
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export const rateLimitMiddleware = async (
  req: NextApiRequest,
  options: {
    windowMs?: number; // Time window in milliseconds
    maxRequests?: number; // Maximum requests per window
    keyGenerator?: (req: NextApiRequest) => string;
  } = {}
): Promise<RateLimitResult> => {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 100, // 100 requests per minute
    keyGenerator = defaultKeyGenerator,
  } = options;

  const key = keyGenerator(req);
  const now = Date.now();

  // Try Redis first if available
  const redis = await initializeRedis();
  if (redis) {
    return checkRedisRateLimit(redis, key, now, windowMs, maxRequests);
  }

  // Fallback to in-memory rate limiting
  return checkMemoryRateLimit(key, now, windowMs, maxRequests);
};

async function checkRedisRateLimit(
  redis: any,
  key: string,
  now: number,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  try {
    const redisKey = `rate_limit:${key}`;
    const windowStart = now - windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(redisKey, 0, windowStart);

    // Add current request
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);

    // Set expiration
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

    // Get count
    pipeline.zcard(redisKey);

    // Get earliest timestamp for reset time calculation
    pipeline.zrange(redisKey, 0, 0, 'WITHSCORES');

    const results = await pipeline.exec();
    const count = results[2][1];
    const earliestEntry = results[3][1];

    if (count > maxRequests) {
      const resetTime = earliestEntry && earliestEntry.length > 0
        ? parseInt(earliestEntry[1]) + windowMs
        : now + windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return {
        allowed: false,
        retryAfter,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - count,
    };
  } catch (error) {
    console.error('Redis rate limiting error, falling back to memory:', error);
    return checkMemoryRateLimit(key, now, windowMs, maxRequests);
  }
}

function checkMemoryRateLimit(
  key: string,
  now: number,
  windowMs: number,
  maxRequests: number
): RateLimitResult {
  const windowStart = now - windowMs;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetTime < windowStart) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      remaining: 0,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
  };
}

// Default key generator using IP address
const defaultKeyGenerator = (req: NextApiRequest): string => {
  // Get IP address from various headers
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const ip = req.connection.remoteAddress;

  // Use the first IP in x-forwarded-for if available
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  // Fall back to other headers
  return (realIp as string) || (ip as string) || 'unknown';
};

// Specialized rate limiter for webhooks (more restrictive)
export const webhookRateLimit = async (req: NextApiRequest): Promise<RateLimitResult> => {
  return rateLimitMiddleware(req, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 webhook events per minute
    keyGenerator: (req) => {
      // Use webhook ID if available for duplicate prevention
      const webhookId = req.headers['x-whop-webhook-id'];
      return webhookId ? `webhook:${webhookId}` : defaultKeyGenerator(req);
    },
  });
};

// Rate limiter for API endpoints
export const apiRateLimit = async (req: NextApiRequest): Promise<RateLimitResult> => {
  return rateLimitMiddleware(req, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 API requests per minute per IP
  });
};

// Rate limiter for authentication endpoints (very restrictive)
export const authRateLimit = async (req: NextApiRequest): Promise<RateLimitResult> => {
  return rateLimitMiddleware(req, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 auth attempts per 15 minutes
    keyGenerator: (req) => {
      // Use IP + email/username for more specific auth rate limiting
      const ip = defaultKeyGenerator(req);
      const email = req.body?.email || req.body?.username || 'unknown';
      return `auth:${ip}:${email}`;
    },
  });
};

// Advanced rate limiter with user-based limits
export const userRateLimit = async (
  req: NextApiRequest,
  options: {
    windowMs?: number;
    maxRequests?: number;
    userId?: string;
  } = {}
): Promise<RateLimitResult> => {
  const {
    windowMs = 60 * 1000,
    maxRequests = 100,
    userId,
  } = options;

  const key = userId ? `user:${userId}` : defaultKeyGenerator(req);
  const now = Date.now();

  // Try Redis first if available
  const redis = await initializeRedis();
  if (redis) {
    return checkRedisRateLimit(redis, key, now, windowMs, maxRequests);
  }

  // Fallback to in-memory rate limiting
  return checkMemoryRateLimit(key, now, windowMs, maxRequests);
};

// Utility function to get current rate limit status
export const getRateLimitStatus = async (
  key: string,
  windowMs: number = 60 * 1000
): Promise<{
  current: number;
  max: number;
  remaining: number;
  resetTime: Date | null;
}> => {
  const redis = await initializeRedis();

  if (redis) {
    try {
      const redisKey = `rate_limit:${key}`;
      const count = await redis.zcard(redisKey);
      const earliestEntry = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');

      let resetTime = null;
      if (earliestEntry && earliestEntry.length > 0) {
        resetTime = new Date(parseInt(earliestEntry[1]) + windowMs);
      }

      return {
        current: count,
        max: 100, // Default max
        remaining: Math.max(0, 100 - count),
        resetTime,
      };
    } catch (error) {
      console.error('Error getting Redis rate limit status:', error);
    }
  }

  // Fallback to memory store
  const entry = rateLimitStore.get(`rate_limit:${key}`);
  if (entry) {
    return {
      current: entry.count,
      max: 100,
      remaining: Math.max(0, 100 - entry.count),
      resetTime: new Date(entry.resetTime),
    };
  }

  return {
    current: 0,
    max: 100,
    remaining: 100,
    resetTime: null,
  };
};

// Reset rate limit for a specific key (for testing or admin purposes)
export const resetRateLimit = async (key: string): Promise<void> => {
  const redis = await initializeRedis();

  if (redis) {
    try {
      await redis.del(`rate_limit:${key}`);
    } catch (error) {
      console.error('Error resetting Redis rate limit:', error);
    }
  }

  rateLimitStore.delete(`rate_limit:${key}`);
};

// Clean up Redis connection on shutdown
export const closeRateLimiter = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
    } catch (error) {
      console.error('Error closing Redis client:', error);
    }
  }
};
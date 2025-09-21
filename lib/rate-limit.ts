import type { NextApiRequest } from "next";

// Mock Redis client for development - in production, use actual Redis
let redisClient: any = null;

// Redis client mock
const mockRedisClient = {
	on: (_event: string, _callback: Function) => {},
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
			[null, []],
		],
	}),
	quit: async () => {},
	del: async () => {},
};

// Redis mock function
function createClientMock(config: any) {
	return mockRedisClient;
}

// Try to import Redis, fallback to mock
let createClient = createClientMock;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const redis = require("redis");
	if (redis.createClient) {
		createClient = redis.createClient;
	}
} catch (error) {
	console.log("Redis not available, using mock for rate limiting");
}

// Import modern Redis configuration
import { initializeRedis as initializeModernRedis } from "./redis-config";
import { redisUtils } from "./redis-config";

export interface RateLimitResult {
	allowed: boolean;
	retryAfter?: number;
	remaining: number;
}

interface RateLimitEntry {
	count: number;
	resetTime: number;
	requests?: number[]; // Array to track individual request timestamps for sliding window
}

// Redis client for production rate limiting (already declared above)

// Initialize Redis if available
async function initializeRedis() {
	if (redisClient) return redisClient;

	try {
		const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
		redisClient = createClient({ url: redisUrl });

		redisClient.on("error", (err: Error) => {
			console.error("Redis Client Error:", err);
		});

		await redisClient.connect();
		console.log("Redis rate limiter initialized");
		return redisClient;
	} catch (error) {
		console.error(
			"Failed to initialize Redis for rate limiting, falling back to memory:",
			error,
		);
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
	} = {},
): Promise<RateLimitResult> => {
	const {
		windowMs = 60 * 1000, // 1 minute
		maxRequests = 100, // 100 requests per minute
		keyGenerator = defaultKeyGenerator,
	} = options;

	// Comprehensive parameter validation based on express-rate-limit best practices
	if (typeof windowMs !== "number" || windowMs <= 0) {
		return {
			allowed: false,
			retryAfter: 0,
			remaining: 0,
		};
	}

	if (typeof maxRequests !== "number" || maxRequests < 0) {
		return {
			allowed: false,
			retryAfter: 0,
			remaining: 0,
		};
	}

	// Ensure keyGenerator is always a valid function
	const actualKeyGenerator =
		typeof keyGenerator === "function" ? keyGenerator : defaultKeyGenerator;

	try {
		const key = actualKeyGenerator(req);
		if (typeof key !== "string" || key.length === 0) {
			return {
				allowed: false,
				retryAfter: 0,
				remaining: 0,
			};
		}

		const now = Date.now();

		// Try modern Redis first for production scalability
		const modernRedis = await initializeModernRedis();
		if (modernRedis) {
			return checkModernRedisRateLimit(
				modernRedis,
				key,
				now,
				windowMs,
				maxRequests,
			);
		}

		// Fallback to legacy Redis if available
		const redis = await initializeRedis();
		if (redis) {
			return checkRedisRateLimit(redis, key, now, windowMs, maxRequests);
		}

		// Fallback to in-memory rate limiting
		return checkMemoryRateLimit(key, now, windowMs, maxRequests);
	} catch (error) {
		console.error("Error in rate limiting middleware:", error);
		// Fail open - allow request but log the error
		return {
			allowed: true,
			remaining: Math.max(0, maxRequests - 1), // Conservative estimate
		};
	}
};

async function checkModernRedisRateLimit(
	redis: any,
	key: string,
	now: number,
	windowMs: number,
	maxRequests: number,
): Promise<RateLimitResult> {
	try {
		const redisKey = `rate_limit:${key}`;
		const windowStart = now - windowMs;

		// Use Redis transaction for atomic operations
		const multi = redis.multi();

		// Remove old entries
		multi.zRemRangeByScore(redisKey, 0, windowStart);

		// Get current count BEFORE adding new request
		multi.zCard(redisKey);

		// Add current request with timestamp
		multi.zAdd(redisKey, [{ score: now, value: `${now}-${Math.random()}` }]);

		// Set expiration
		multi.expire(redisKey, Math.ceil(windowMs / 1000));

		// Get earliest timestamp for reset time calculation
		multi.zRange(redisKey, 0, 0, "WITHSCORES");

		const results = await multi.exec();

		if (!results || results.length < 4) {
			throw new Error("Redis transaction failed");
		}

		// Get count BEFORE adding current request
		const countBeforeAdd =
			results[1] && typeof results[1] === "number" ? results[1] : 0;
		const earliestEntry = results[3];

		// Check if this request exceeds the limit (after adding)
		if (countBeforeAdd + 1 > maxRequests) {
			const resetTime =
				earliestEntry && earliestEntry.length > 0
					? Number.parseInt(earliestEntry[0].score) + windowMs
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
			remaining: Math.max(0, maxRequests - (countBeforeAdd + 1)),
		};
	} catch (error) {
		console.error(
			"Modern Redis rate limiting error, falling back to memory:",
			error,
		);
		return checkMemoryRateLimit(key, now, windowMs, maxRequests);
	}
}

async function checkRedisRateLimit(
	redis: any,
	key: string,
	now: number,
	windowMs: number,
	maxRequests: number,
): Promise<RateLimitResult> {
	try {
		const redisKey = `rate_limit:${key}`;
		const windowStart = now - windowMs;

		// Use Redis pipeline for atomic operations
		const pipeline = redis.pipeline();

		// Remove old entries
		pipeline.zremrangebyscore(redisKey, 0, windowStart);

		// Get count BEFORE adding current request
		pipeline.zcard(redisKey);

		// Add current request
		pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);

		// Set expiration
		pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

		// Get count after adding
		pipeline.zcard(redisKey);

		// Get earliest timestamp for reset time calculation
		pipeline.zrange(redisKey, 0, 0, "WITHSCORES");

		const results = await pipeline.exec();
		const countBeforeAdd =
			results[1] && results[1][1] !== undefined
				? Number.parseInt(results[1][1])
				: 0;
		const countAfterAdd =
			results[3] && results[3][1] !== undefined
				? Number.parseInt(results[3][1])
				: 0;
		const earliestEntry = results[4]?.[1];

		// Check if this request exceeds the limit (after adding)
		if (countBeforeAdd + 1 > maxRequests) {
			const resetTime =
				earliestEntry && earliestEntry.length > 0
					? Number.parseInt(earliestEntry[1]) + windowMs
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
			remaining: Math.max(0, maxRequests - countAfterAdd),
		};
	} catch (error) {
		console.error("Redis rate limiting error, falling back to memory:", error);
		return checkMemoryRateLimit(key, now, windowMs, maxRequests);
	}
}

function checkMemoryRateLimit(
	key: string,
	now: number,
	windowMs: number,
	maxRequests: number,
): RateLimitResult {
	const windowStart = now - windowMs;
	const memoryKey = `rate_limit:${key}`; // Use consistent key naming

	// Get or create rate limit entry with sliding window
	let entry = rateLimitStore.get(memoryKey);
	if (!entry) {
		entry = {
			count: 0,
			resetTime: now + windowMs,
			requests: [], // Array to track individual request timestamps
		};
		rateLimitStore.set(memoryKey, entry);
	}

	// Remove expired requests from sliding window
	if (entry.requests) {
		entry.requests = entry.requests.filter(
			(timestamp: number) => timestamp > windowStart,
		);
		entry.count = entry.requests.length;
	}

	// Add current request timestamp and increment count
	if (!entry.requests) {
		entry.requests = [];
	}
	entry.requests.push(now);
	entry.count = entry.requests.length;
	entry.resetTime = now + windowMs;
	rateLimitStore.set(memoryKey, entry);

	// Check if this request exceeds the limit
	if (entry.count > maxRequests) {
		// Calculate when the earliest request will expire
		const earliestExpiry =
			entry.requests && entry.requests.length > 0
				? entry.requests[0] + windowMs
				: now + windowMs;

		return {
			allowed: false,
			retryAfter: Math.ceil((earliestExpiry - now) / 1000),
			remaining: 0,
		};
	}

	return {
		allowed: true,
		remaining: Math.max(0, maxRequests - entry.count),
	};
}

// Default key generator using IP address
const defaultKeyGenerator = (req: NextApiRequest): string => {
	// Get IP address from various headers
	const forwarded = req.headers["x-forwarded-for"];
	const realIp = req.headers["x-real-ip"];
	const ip = req.socket?.remoteAddress;

	// Use the first IP in x-forwarded-for if available
	if (forwarded && typeof forwarded === "string") {
		const ip = forwarded.split(",")[0].trim();
		return ip || "unknown";
	}

	// Fall back to other headers
	return (
		(typeof realIp === "string" ? realIp : null) ||
		(typeof ip === "string" ? ip : null) ||
		"unknown"
	);
};

// Specialized rate limiter for webhooks (more restrictive)
export const webhookRateLimit = async (
	req: NextApiRequest,
): Promise<RateLimitResult> => {
	return rateLimitMiddleware(req, {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 200, // 200 webhook events per minute
		keyGenerator: (req) => {
			// Use webhook ID if available for duplicate prevention
			const webhookId = req.headers["x-whop-webhook-id"];
			return webhookId ? `webhook:${webhookId}` : defaultKeyGenerator(req);
		},
	});
};

// Rate limiter for API endpoints
export const apiRateLimit = async (
	req: NextApiRequest,
): Promise<RateLimitResult> => {
	return rateLimitMiddleware(req, {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 60, // 60 API requests per minute per IP
	});
};

// Rate limiter for authentication endpoints (very restrictive)
export const authRateLimit = async (
	req: NextApiRequest,
): Promise<RateLimitResult> => {
	return rateLimitMiddleware(req, {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 5, // 5 auth attempts per 15 minutes
		keyGenerator: (req) => {
			// Use IP + email/username for more specific auth rate limiting
			const ip = defaultKeyGenerator(req);
			const email = req.body?.email || req.body?.username || "unknown";
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
	} = {},
): Promise<RateLimitResult> => {
	const { windowMs = 60 * 1000, maxRequests = 100, userId } = options;

	const key = userId ? `user:${userId}` : defaultKeyGenerator(req);
	const now = Date.now();

	// Try modern Redis first for production scalability
	const modernRedis = await initializeModernRedis();
	if (modernRedis) {
		return checkModernRedisRateLimit(
			modernRedis,
			key,
			now,
			windowMs,
			maxRequests,
		);
	}

	// Fallback to legacy Redis if available
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
	windowMs: number = 60 * 1000,
): Promise<{
	current: number;
	max: number;
	remaining: number;
	resetTime: Date | null;
}> => {
	// Try modern Redis first
	try {
		const redisKey = `rate_limit:${key}`;
		const windowStart = Date.now() - windowMs;

		// Clean up old entries first
		await redisUtils.zremrangebyscore(redisKey, 0, windowStart);

		const count = await redisUtils.zcard(redisKey);
		const earliestEntry = await redisUtils.zrange(redisKey, 0, 0, "WITHSCORES");

		let resetTime = null;
		if (earliestEntry && earliestEntry.length > 0) {
			// Handle both Redis response formats: modern Redis returns objects with score, legacy returns string array
			const timestamp =
				typeof earliestEntry[0] === "object" && earliestEntry[0].score
					? Number.parseInt(earliestEntry[0].score)
					: Number.parseInt(earliestEntry[1]);
			resetTime = new Date(timestamp + windowMs);
		}

		return {
			current: count,
			max: 100, // Default max
			remaining: Math.max(0, 100 - count),
			resetTime,
		};
	} catch (error) {
		console.error("Error getting modern Redis rate limit status:", error);
	}

	// Fallback to legacy Redis
	const redis = await initializeRedis();
	if (redis) {
		try {
			const redisKey = `rate_limit:${key}`;
			const windowStart = Date.now() - windowMs;

			// Clean up old entries first
			await redis.zremrangebyscore(redisKey, 0, windowStart);

			const count = await redis.zcard(redisKey);
			const earliestEntry = await redis.zrange(redisKey, 0, 0, "WITHSCORES");

			let resetTime = null;
			if (earliestEntry && earliestEntry.length > 0) {
				// Legacy Redis returns string array [value, score]
				const timestamp = Number.parseInt(earliestEntry[1]);
				if (!Number.isNaN(timestamp)) {
					resetTime = new Date(timestamp + windowMs);
				}
			}

			return {
				current: count,
				max: 100, // Default max
				remaining: Math.max(0, 100 - count),
				resetTime,
			};
		} catch (error) {
			console.error("Error getting Redis rate limit status:", error);
		}
	}

	// Fallback to memory store
	const entry = rateLimitStore.get(`rate_limit:${key}`);
	if (entry) {
		const windowStart = Date.now() - windowMs;

		// Clean up expired entries
		if (entry.resetTime < windowStart) {
			rateLimitStore.delete(`rate_limit:${key}`);
			return {
				current: 0,
				max: 100,
				remaining: 100,
				resetTime: null,
			};
		}

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
	// Try modern Redis first
	try {
		await redisUtils.del(`rate_limit:${key}`);
	} catch (error) {
		console.error("Error resetting modern Redis rate limit:", error);
	}

	// Fallback to legacy Redis
	const redis = await initializeRedis();
	if (redis) {
		try {
			await redis.del(`rate_limit:${key}`);
		} catch (error) {
			console.error("Error resetting Redis rate limit:", error);
		}
	}

	rateLimitStore.delete(`rate_limit:${key}`);
};

// Clean up Redis connections on shutdown
export const closeRateLimiter = async (): Promise<void> => {
	// Import dynamically to avoid circular dependency
	try {
		const { closeRedisConnection } = await import("./redis-config");
		await closeRedisConnection();
	} catch (error) {
		console.error("Error closing Redis connection:", error);
	}

	// Close legacy Redis client
	if (redisClient) {
		try {
			await redisClient.quit();
			redisClient = null;
		} catch (error) {
			console.error("Error closing legacy Redis client:", error);
		}
	}
};

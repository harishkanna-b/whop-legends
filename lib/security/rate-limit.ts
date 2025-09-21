/**
 * Rate limiting utilities to prevent API abuse
 * Uses in-memory storage for development, should be replaced with Redis for production
 */

export interface RateLimitOptions {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum number of requests per window
	keyGenerator?: (req: any) => string; // Custom key generator function
	skipSuccessfulRequests?: boolean; // Don't count successful requests
	skipFailedRequests?: boolean; // Don't count failed requests
	onLimitReached?: (req: any, res: any) => void; // Callback when limit is reached
}

export interface RateLimitInfo {
	remaining: number;
	resetTime: Date;
	total: number;
}

export class RateLimiter {
	private stores: Map<
		string,
		{
			requests: number[];
			windowMs: number;
			maxRequests: number;
		}
	> = new Map();

	constructor(private options: RateLimitOptions) {}

	/**
	 * Check if a request should be rate limited
	 */
	async checkLimit(req: any): Promise<{
		allowed: boolean;
		limitInfo: RateLimitInfo;
	}> {
		const key = this.getKey(req);
		const now = Date.now();
		const windowStart = now - this.options.windowMs;

		// Get or create store for this key
		let store = this.stores.get(key);
		if (!store) {
			store = {
				requests: [],
				windowMs: this.options.windowMs,
				maxRequests: this.options.maxRequests,
			};
			this.stores.set(key, store);
		}

		// Clean old requests
		store.requests = store.requests.filter(
			(timestamp) => timestamp > windowStart,
		);

		// Check if limit exceeded
		const currentRequests = store.requests.length;
		const remaining = Math.max(0, this.options.maxRequests - currentRequests);
		const resetTime = new Date(now + this.options.windowMs);

		if (currentRequests >= this.options.maxRequests) {
			return {
				allowed: false,
				limitInfo: {
					remaining: 0,
					resetTime,
					total: this.options.maxRequests,
				},
			};
		}

		// Add current request
		store.requests.push(now);

		return {
			allowed: true,
			limitInfo: {
				remaining,
				resetTime,
				total: this.options.maxRequests,
			},
		};
	}

	/**
	 * Generate key for rate limiting
	 */
	private getKey(req: any): string {
		if (this.options.keyGenerator) {
			return this.options.keyGenerator(req);
		}

		// Default key generation: IP + user ID if available
		const ip = req.ip || req.connection?.remoteAddress || "unknown";
		const userId = req.user?.id || req.headers?.["user-id"];

		return userId ? `${ip}:${userId}` : ip;
	}

	/**
	 * Clean up old entries to prevent memory leaks
	 */
	cleanup(): void {
		const now = Date.now();
		for (const [key, store] of this.stores.entries()) {
			const windowStart = now - store.windowMs;
			store.requests = store.requests.filter(
				(timestamp) => timestamp > windowStart,
			);

			// Remove empty stores
			if (store.requests.length === 0) {
				this.stores.delete(key);
			}
		}
	}
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const RateLimiters = {
	// General API rate limiting: 100 requests per minute
	general: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 100,
		keyGenerator: (req) => {
			const ip = req.ip || req.connection?.remoteAddress || "unknown";
			const userId = req.user?.id || req.headers?.["user-id"];
			return userId ? `general:${ip}:${userId}` : `general:${ip}`;
		},
	}),

	// Leaderboard rate limiting: 30 requests per minute
	leaderboard: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 30,
		keyGenerator: (req) => {
			const ip = req.ip || req.connection?.remoteAddress || "unknown";
			const userId = req.user?.id || req.headers?.["user-id"];
			return `leaderboard:${ip}:${userId}`;
		},
	}),

	// Quest rate limiting: 50 requests per minute
	quest: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 50,
		keyGenerator: (req) => {
			const ip = req.ip || req.connection?.remoteAddress || "unknown";
			const userId = req.user?.id || req.headers?.["user-id"];
			return `quest:${ip}:${userId}`;
		},
	}),

	// Analytics rate limiting: 20 requests per minute
	analytics: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 20,
		keyGenerator: (req) => {
			const ip = req.ip || req.connection?.remoteAddress || "unknown";
			const userId = req.user?.id || req.headers?.["user-id"];
			return `analytics:${ip}:${userId}`;
		},
	}),

	// Webhook rate limiting: 1000 requests per minute
	webhook: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 1000,
		keyGenerator: (req) => {
			const ip = req.ip || req.connection?.remoteAddress || "unknown";
			const signature = req.headers?.["x-whop-signature"];
			return `webhook:${ip}:${signature || "unknown"}`;
		},
	}),

	// Auth rate limiting: 5 requests per minute
	auth: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 5,
		keyGenerator: (req) => {
			const ip = req.ip || req.connection?.remoteAddress || "unknown";
			return `auth:${ip}`;
		},
	}),
};

/**
 * Express middleware for rate limiting
 */
export function createRateLimitMiddleware(limiter: RateLimiter) {
	return async (req: any, res: any, next: () => void) => {
		try {
			const result = await limiter.checkLimit(req);

			// Add rate limit headers
			res.setHeader("X-RateLimit-Limit", result.limitInfo.total.toString());
			res.setHeader(
				"X-RateLimit-Remaining",
				result.limitInfo.remaining.toString(),
			);
			res.setHeader(
				"X-RateLimit-Reset",
				result.limitInfo.resetTime.getTime().toString(),
			);

			if (!result.allowed) {
				res.status(429).json({
					error: "Too Many Requests",
					message: "Rate limit exceeded. Please try again later.",
					retryAfter: Math.ceil(
						(result.limitInfo.resetTime.getTime() - Date.now()) / 1000,
					),
				});
				return;
			}

			next();
		} catch (error) {
			console.error("Rate limiting error:", error);
			// Allow request to proceed if rate limiting fails
			next();
		}
	};
}

/**
 * Periodic cleanup to prevent memory leaks
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startRateLimitCleanup() {
	if (cleanupInterval) {
		clearInterval(cleanupInterval);
	}

	// Clean up every 5 minutes
	cleanupInterval = setInterval(
		() => {
			Object.values(RateLimiters).forEach((limiter) => limiter.cleanup());
		},
		5 * 60 * 1000,
	);
}

export function stopRateLimitCleanup() {
	if (cleanupInterval) {
		clearInterval(cleanupInterval);
		cleanupInterval = null;
	}
}

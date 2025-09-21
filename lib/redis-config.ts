import { createClient } from "redis";

// Redis configuration for production rate limiting
export interface RedisConfig {
	url: string;
	socket?: {
		reconnectStrategy?: (retries: number) => number | Error;
	};
	username?: string;
	password?: string;
	database?: number;
}

// Default Redis configuration
const defaultRedisConfig: RedisConfig = {
	url: process.env.REDIS_URL || "redis://localhost:6379",
	socket: {
		reconnectStrategy: (retries: number) => {
			// Exponential backoff with max 30 seconds
			const delay = Math.min(2 ** retries * 1000, 30000);
			console.log(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
			return delay;
		},
	},
};

// Redis client singleton
let redisClient: any = null;
let isConnecting = false;
let connectionPromise: Promise<any> | null = null;

/**
 * Initialize Redis connection with proper error handling
 */
export async function initializeRedis(
	config?: Partial<RedisConfig>,
): Promise<any> {
	if (redisClient) {
		return redisClient;
	}

	if (connectionPromise) {
		// Return existing connection promise to prevent race conditions
		return connectionPromise;
	}

	// Create new connection promise
	connectionPromise = (async () => {
		try {
			isConnecting = true;
			const finalConfig = { ...defaultRedisConfig, ...config };

			// Create modern Redis client
			redisClient = createClient(finalConfig);

			// Set up event handlers
			redisClient.on("connect", () => {
				console.log("Redis client connected");
			});

			redisClient.on("ready", () => {
				console.log("Redis client ready");
			});

			redisClient.on("error", (err: Error) => {
				console.error("Redis client error:", err);
			});

			redisClient.on("reconnecting", () => {
				console.log("Redis client reconnecting");
			});

			redisClient.on("end", () => {
				console.log("Redis client disconnected");
				// Reset connection state on disconnect
				redisClient = null;
				connectionPromise = null;
			});

			// Connect to Redis
			await redisClient.connect();

			// Test connection
			await redisClient.ping();
			console.log("Redis connection established successfully");

			return redisClient;
		} catch (error) {
			console.error("Failed to connect to Redis:", error);
			redisClient = null;
			connectionPromise = null;
			throw error;
		} finally {
			isConnecting = false;
		}
	})();

	return connectionPromise;
}

/**
 * Get Redis client status
 */
export function getRedisStatus(): {
	connected: boolean;
	connecting: boolean;
	client: any | null;
} {
	return {
		connected: redisClient?.isOpen || false,
		connecting: isConnecting,
		client: redisClient,
	};
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
	if (redisClient) {
		try {
			await redisClient.quit();
			console.log("Redis connection closed gracefully");
		} catch (error) {
			console.error("Error closing Redis connection:", error);
		} finally {
			redisClient = null;
		}
	}
}

/**
 * Execute Redis command with automatic reconnection
 */
export async function executeRedisCommand<T>(
	command: (client: any) => Promise<T>,
	fallback?: () => Promise<T>,
): Promise<T> {
	try {
		const client = await initializeRedis();
		return await command(client);
	} catch (error) {
		console.error("Redis command failed:", error);

		if (fallback) {
			return await fallback();
		}

		throw error;
	}
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<{
	healthy: boolean;
	latency: number;
	error?: string;
}> {
	try {
		const startTime = Date.now();
		const client = await initializeRedis();
		await client.ping();
		const latency = Date.now() - startTime;

		return {
			healthy: true,
			latency,
		};
	} catch (error) {
		return {
			healthy: false,
			latency: 0,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Redis utility functions for common operations
 */
export const redisUtils = {
	/**
	 * Set key with expiration
	 */
	async setex(key: string, seconds: number, value: string): Promise<void> {
		await executeRedisCommand(async (client) => {
			await client.setEx(key, seconds, value);
		});
	},

	/**
	 * Get key value
	 */
	async get(key: string): Promise<string | null> {
		return await executeRedisCommand(async (client) => {
			return await client.get(key);
		});
	},

	/**
	 * Delete key
	 */
	async del(key: string): Promise<number> {
		return await executeRedisCommand(async (client) => {
			return await client.del(key);
		});
	},

	/**
	 * Check if key exists
	 */
	async exists(key: string): Promise<number> {
		return await executeRedisCommand(async (client) => {
			return await client.exists(key);
		});
	},

	/**
	 * Increment key value
	 */
	async incr(key: string): Promise<number> {
		return await executeRedisCommand(async (client) => {
			return await client.incr(key);
		});
	},

	/**
	 * Add to sorted set
	 */
	async zadd(key: string, score: number, value: string): Promise<number> {
		return await executeRedisCommand(async (client) => {
			return await client.zAdd(key, [{ score, value }]);
		});
	},

	/**
	 * Get sorted set cardinality
	 */
	async zcard(key: string): Promise<number> {
		return await executeRedisCommand(async (client) => {
			return await client.zCard(key);
		});
	},

	/**
	 * Remove from sorted set by score range
	 */
	async zremrangebyscore(
		key: string,
		min: number,
		max: number,
	): Promise<number> {
		return await executeRedisCommand(async (client) => {
			return await client.zRemRangeByScore(key, min, max);
		});
	},

	/**
	 * Get range from sorted set
	 */
	async zrange(
		key: string,
		start: number,
		stop: number,
		options?: string,
	): Promise<any[]> {
		return await executeRedisCommand(async (client) => {
			if (options?.includes("WITHSCORES")) {
				return await client.zRange(key, start, stop, { WITHSCORES: true });
			}
			return await client.zRange(key, start, stop);
		});
	},
};

export default {
	initializeRedis,
	getRedisStatus,
	closeRedisConnection,
	executeRedisCommand,
	checkRedisHealth,
	utils: redisUtils,
};

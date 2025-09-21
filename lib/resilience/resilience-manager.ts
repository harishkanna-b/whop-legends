import {
	type CircuitBreaker,
	type CircuitBreakerConfig,
	CircuitBreakerRegistry,
	defaultCircuitBreakerConfigs,
} from "../circuit-breaker/circuit-breaker";
import {
	type FailoverConfig,
	type FailoverManager,
	FailoverManagerRegistry,
	defaultFailoverConfigs,
} from "../failover/failover-manager";
import { logger } from "../logging/logger";
import { monitoring } from "../monitoring/monitor";

export interface ResilienceConfig {
	circuitBreaker?: CircuitBreakerConfig;
	failover?: FailoverConfig;
	retry?: {
		maxAttempts: number;
		baseDelay: number;
		maxDelay: number;
		backoffMultiplier: number;
		jitter: boolean;
	};
	timeout?: number;
	bulkhead?: {
		maxConcurrent: number;
		maxWaitTime: number;
	};
	cache?: {
		ttl: number;
		keyGenerator: (...args: any[]) => string;
	};
}

export interface ResilienceMetrics {
	circuitBreaker: any;
	failover: any;
	retry: {
		totalAttempts: number;
		successfulRetries: number;
		failedRetries: number;
		averageRetryDelay: number;
	};
	timeout: {
		timeouts: number;
		totalOperations: number;
	};
	bulkhead: {
		rejectedRequests: number;
		activeRequests: number;
		queueSize: number;
	};
	cache: {
		hits: number;
		misses: number;
		hitRate: number;
	};
}

export class ResilienceManager {
	private name: string;
	private config: ResilienceConfig;
	private circuitBreaker: CircuitBreaker | null = null;
	private failoverManager: FailoverManager | null = null;
	private retryMetrics = {
		totalAttempts: 0,
		successfulRetries: 0,
		failedRetries: 0,
		totalDelay: 0,
	};
	private timeoutMetrics = {
		timeouts: 0,
		totalOperations: 0,
	};
	private bulkheadQueue: Array<{
		resolve: Function;
		reject: Function;
		operation: Function;
	}> = [];
	private activeBulkheadRequests = 0;
	private cacheStore: Map<string, { value: any; expires: number }> = new Map();

	constructor(name: string, config: ResilienceConfig) {
		this.name = name;
		this.config = config;

		this.initializeComponents();
	}

	private initializeComponents(): void {
		// Initialize circuit breaker
		if (this.config.circuitBreaker) {
			const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance();
			this.circuitBreaker = circuitBreakerRegistry.register(
				`${this.name}-circuit-breaker`,
				this.config.circuitBreaker,
			);
		}

		// Initialize failover manager
		if (this.config.failover) {
			const failoverRegistry = FailoverManagerRegistry.getInstance();
			this.failoverManager = failoverRegistry.register(
				`${this.name}-failover`,
				this.config.failover,
			);
		}
	}

	async execute<T>(
		operation: () => Promise<T>,
		options?: {
			cacheKey?: string;
			forceProvider?: string;
			skipCache?: boolean;
			context?: Record<string, any>;
		},
	): Promise<T> {
		const startTime = Date.now();
		const context = options?.context || {};

		try {
			// Check cache first
			if (this.config.cache && !options?.skipCache && options?.cacheKey) {
				const cached = this.getFromCache(options.cacheKey);
				if (cached !== undefined) {
					monitoring.increment("resilience.cache.hit", 1, {
						manager: this.name,
					});
					logger.debug("Cache hit", {
						manager: this.name,
						cacheKey: options.cacheKey,
					});
					return cached;
				}
				monitoring.increment("resilience.cache.miss", 1, {
					manager: this.name,
				});
			}

			// Execute with bulkhead pattern if configured
			let result: T;
			if (this.config.bulkhead) {
				result = await this.executeWithBulkhead(operation, context);
			} else {
				result = await this.executeWithAllPatterns(operation, options, context);
			}

			// Cache result if caching is enabled
			if (this.config.cache && options?.cacheKey && result !== undefined) {
				this.setToCache(options.cacheKey, result);
			}

			return result;
		} catch (error) {
			logger.error("Resilience operation failed", error, {
				manager: this.name,
				duration: Date.now() - startTime,
				context,
			});

			monitoring.increment("resilience.operation.failed", 1, {
				manager: this.name,
				errorType: error instanceof Error ? error.constructor.name : "Unknown",
			});

			throw error;
		}
	}

	private async executeWithAllPatterns<T>(
		operation: () => Promise<T>,
		options: any,
		context: Record<string, any>,
	): Promise<T> {
		// Apply retry logic with exponential backoff
		return this.executeWithRetry(async () => {
			// Apply timeout
			const timeoutOperation = this.config.timeout
				? this.executeWithTimeout(operation(), this.config.timeout)
				: operation();

			// Apply circuit breaker
			if (this.circuitBreaker) {
				return this.circuitBreaker.execute(async () => {
					// Apply failover if configured
					if (this.failoverManager) {
						return this.failoverManager.execute(
							async (provider: string) => {
								monitoring.increment("resilience.failover.attempt", 1, {
									manager: this.name,
									provider,
								});

								const result = timeoutOperation;

								monitoring.increment("resilience.failover.success", 1, {
									manager: this.name,
									provider,
								});

								return result;
							},
							{
								forceProvider: options?.forceProvider,
							},
						);
					}
					return timeoutOperation;
				});
			}
			return timeoutOperation;
		}, context);
	}

	private async executeWithRetry<T>(
		operation: () => Promise<T>,
		context: Record<string, any>,
	): Promise<T> {
		if (!this.config.retry) {
			return operation();
		}

		const { maxAttempts, baseDelay, maxDelay, backoffMultiplier, jitter } =
			this.config.retry;
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			this.retryMetrics.totalAttempts++;

			try {
				const result = await operation();

				if (attempt > 1) {
					this.retryMetrics.successfulRetries++;
					logger.info("Retry successful", {
						manager: this.name,
						attempt,
						totalAttempts: maxAttempts,
					});

					monitoring.increment("resilience.retry.success", 1, {
						manager: this.name,
						attempt: attempt.toString(),
					});
				}

				return result;
			} catch (error) {
				lastError = error as Error;

				if (attempt === maxAttempts) {
					this.retryMetrics.failedRetries++;
					monitoring.increment("resilience.retry.failed", 1, {
						manager: this.name,
						attempt: maxAttempts.toString(),
					});
					break;
				}

				// Calculate delay with exponential backoff
				let delay = Math.min(
					baseDelay * backoffMultiplier ** (attempt - 1),
					maxDelay,
				);

				// Add jitter if enabled
				if (jitter) {
					delay = delay * (0.5 + Math.random() * 0.5);
				}

				this.retryMetrics.totalDelay += delay;

				logger.warn("Retry attempt failed", {
					manager: this.name,
					attempt,
					totalAttempts: maxAttempts,
					delay,
					error: error instanceof Error ? error.message : "Unknown error",
				});

				monitoring.increment("resilience.retry.attempt", 1, {
					manager: this.name,
					attempt: attempt.toString(),
				});

				// Wait before retry
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw lastError;
	}

	private async executeWithTimeout<T>(
		operation: Promise<T>,
		timeoutMs: number,
	): Promise<T> {
		this.timeoutMetrics.totalOperations++;

		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				this.timeoutMetrics.timeouts++;
				reject(new Error(`Operation timeout after ${timeoutMs}ms`));
			}, timeoutMs);
		});

		try {
			return await Promise.race([operation, timeoutPromise]);
		} catch (error) {
			if (error instanceof Error && error.message.includes("timeout")) {
				monitoring.increment("resilience.timeout", 1, { manager: this.name });
				logger.warn("Operation timeout", {
					manager: this.name,
					timeout: timeoutMs,
				});
			}
			throw error;
		}
	}

	private async executeWithBulkhead<T>(
		operation: () => Promise<T>,
		context: Record<string, any>,
	): Promise<T> {
		const { maxConcurrent, maxWaitTime } = this.config.bulkhead!;

		// Check if we can execute immediately
		if (this.activeBulkheadRequests < maxConcurrent) {
			this.activeBulkheadRequests++;
			try {
				return await this.executeWithAllPatterns(operation, {}, context);
			} finally {
				this.activeBulkheadRequests--;
				this.processBulkheadQueue();
			}
		}

		// Queue the request
		if (this.bulkheadQueue.length >= maxConcurrent * 2) {
			monitoring.increment("resilience.bulkhead.rejected", 1, {
				manager: this.name,
			});
			logger.warn("Bulkhead queue full, request rejected", {
				manager: this.name,
				queueSize: this.bulkheadQueue.length,
			});
			throw new Error("Bulkhead queue full");
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				const index = this.bulkheadQueue.findIndex(
					(item) => item.reject === reject,
				);
				if (index !== -1) {
					this.bulkheadQueue.splice(index, 1);
				}
				reject(new Error("Bulkhead wait timeout"));
			}, maxWaitTime);

			this.bulkheadQueue.push({
				resolve: (result: T) => {
					clearTimeout(timeout);
					resolve(result);
				},
				reject: (error: Error) => {
					clearTimeout(timeout);
					reject(error);
				},
				operation: () => this.executeWithAllPatterns(operation, {}, context),
			});
		});
	}

	private processBulkheadQueue(): void {
		while (
			this.bulkheadQueue.length > 0 &&
			this.activeBulkheadRequests < (this.config.bulkhead?.maxConcurrent || 0)
		) {
			const queued = this.bulkheadQueue.shift()!;
			this.activeBulkheadRequests++;

			queued
				.operation()
				.then(queued.resolve)
				.catch(queued.reject)
				.finally(() => {
					this.activeBulkheadRequests--;
					this.processBulkheadQueue();
				});
		}
	}

	private getFromCache(key: string): any {
		const cached = this.cacheStore.get(key);
		if (!cached) {
			return undefined;
		}

		if (Date.now() > cached.expires) {
			this.cacheStore.delete(key);
			return undefined;
		}

		return cached.value;
	}

	private setToCache(key: string, value: any): void {
		if (!this.config.cache) return;

		const expires = Date.now() + this.config.cache.ttl;
		this.cacheStore.set(key, { value, expires });

		// Clean up expired cache entries
		this.cleanupCache();
	}

	private cleanupCache(): void {
		const now = Date.now();
		for (const [key, cached] of this.cacheStore.entries()) {
			if (now > cached.expires) {
				this.cacheStore.delete(key);
			}
		}
	}

	getMetrics(): ResilienceMetrics {
		const averageRetryDelay =
			this.retryMetrics.totalAttempts > 0
				? this.retryMetrics.totalDelay / this.retryMetrics.totalAttempts
				: 0;

		const cacheHits = monitoring
			.getStatus()
			.metrics.names.includes("resilience.cache.hit")
			? this.retryMetrics.successfulRetries
			: 0;
		const cacheMisses = monitoring
			.getStatus()
			.metrics.names.includes("resilience.cache.miss")
			? this.retryMetrics.totalAttempts
			: 0;
		const cacheHitRate =
			cacheHits + cacheMisses > 0 ? cacheHits / (cacheHits + cacheMisses) : 0;

		return {
			circuitBreaker: this.circuitBreaker?.getMetrics(),
			failover: this.failoverManager?.getMetrics(),
			retry: {
				totalAttempts: this.retryMetrics.totalAttempts,
				successfulRetries: this.retryMetrics.successfulRetries,
				failedRetries: this.retryMetrics.failedRetries,
				averageRetryDelay: averageRetryDelay,
			},
			timeout: {
				timeouts: this.timeoutMetrics.timeouts,
				totalOperations: this.timeoutMetrics.totalOperations,
			},
			bulkhead: {
				rejectedRequests: this.bulkheadQueue.length,
				activeRequests: this.activeBulkheadRequests,
				queueSize: this.bulkheadQueue.length,
			},
			cache: {
				hits: cacheHits,
				misses: cacheMisses,
				hitRate: cacheHitRate,
			},
		};
	}

	reset(): void {
		this.circuitBreaker?.reset();
		this.failoverManager?.forceFailback();
		this.retryMetrics = {
			totalAttempts: 0,
			successfulRetries: 0,
			failedRetries: 0,
			totalDelay: 0,
		};
		this.timeoutMetrics = {
			timeouts: 0,
			totalOperations: 0,
		};
		this.cacheStore.clear();
		this.bulkheadQueue = [];
		this.activeBulkheadRequests = 0;
	}

	getCircuitBreaker(): CircuitBreaker | null {
		return this.circuitBreaker;
	}

	getFailoverManager(): FailoverManager | null {
		return this.failoverManager;
	}

	isAvailable(): boolean {
		if (this.circuitBreaker && !this.circuitBreaker.isAvailable()) {
			return false;
		}
		return true;
	}

	getHealth(): {
		isHealthy: boolean;
		circuitBreaker: { state: string; available: boolean };
		failover: { currentProvider: string; availableProviders: string[] };
		cache: { size: number; hitRate: number };
		bulkhead: { active: number; queued: number };
	} {
		const circuitBreakerHealth = this.circuitBreaker
			? {
					state: this.circuitBreaker.getState().state,
					available: this.circuitBreaker.isAvailable(),
				}
			: { state: "DISABLED", available: true };

		const failoverHealth = this.failoverManager
			? {
					currentProvider: this.failoverManager.getCurrentProvider(),
					availableProviders: this.failoverManager
						.getAllProviders()
						.filter((p) => p.isAvailable)
						.map((p) => p.name),
				}
			: { currentProvider: "NONE", availableProviders: [] };

		const cacheHealth = {
			size: this.cacheStore.size,
			hitRate: this.getMetrics().cache.hitRate,
		};

		const bulkheadHealth = {
			active: this.activeBulkheadRequests,
			queued: this.bulkheadQueue.length,
		};

		return {
			isHealthy: this.isAvailable(),
			circuitBreaker: circuitBreakerHealth,
			failover: failoverHealth,
			cache: cacheHealth,
			bulkhead: bulkheadHealth,
		};
	}
}

// Resilience Manager Registry
export class ResilienceManagerRegistry {
	private static instance: ResilienceManagerRegistry;
	private managers: Map<string, ResilienceManager> = new Map();

	static getInstance(): ResilienceManagerRegistry {
		if (!ResilienceManagerRegistry.instance) {
			ResilienceManagerRegistry.instance = new ResilienceManagerRegistry();
		}
		return ResilienceManagerRegistry.instance;
	}

	register(name: string, config: ResilienceConfig): ResilienceManager {
		const manager = new ResilienceManager(name, config);
		this.managers.set(name, manager);
		return manager;
	}

	get(name: string): ResilienceManager | undefined {
		return this.managers.get(name);
	}

	getAll(): Map<string, ResilienceManager> {
		return new Map(this.managers);
	}

	remove(name: string): boolean {
		return this.managers.delete(name);
	}

	getAllMetrics(): Record<string, ResilienceMetrics> {
		const metrics: Record<string, ResilienceMetrics> = {};
		this.managers.forEach((manager, name) => {
			metrics[name] = manager.getMetrics();
		});
		return metrics;
	}

	getAllHealth(): Record<string, any> {
		const health: Record<string, any> = {};
		this.managers.forEach((manager, name) => {
			health[name] = manager.getHealth();
		});
		return health;
	}

	resetAll(): void {
		this.managers.forEach((manager) => manager.reset());
	}
}

// Default resilience configurations
export const defaultResilienceConfigs = {
	database: {
		circuitBreaker: defaultCircuitBreakerConfigs.database,
		failover: defaultFailoverConfigs.database,
		retry: {
			maxAttempts: 3,
			baseDelay: 1000,
			maxDelay: 10000,
			backoffMultiplier: 2,
			jitter: true,
		},
		timeout: 30000,
		bulkhead: {
			maxConcurrent: 10,
			maxWaitTime: 5000,
		},
	},

	externalApi: {
		circuitBreaker: defaultCircuitBreakerConfigs.externalApi,
		failover: defaultFailoverConfigs.externalApi,
		retry: {
			maxAttempts: 3,
			baseDelay: 1000,
			maxDelay: 15000,
			backoffMultiplier: 2,
			jitter: true,
		},
		timeout: 15000,
		bulkhead: {
			maxConcurrent: 20,
			maxWaitTime: 3000,
		},
	},

	cache: {
		circuitBreaker: defaultCircuitBreakerConfigs.cache,
		failover: defaultFailoverConfigs.cache,
		retry: {
			maxAttempts: 2,
			baseDelay: 500,
			maxDelay: 5000,
			backoffMultiplier: 2,
			jitter: true,
		},
		timeout: 5000,
		cache: {
			ttl: 300000, // 5 minutes
			keyGenerator: (...args: any[]) => JSON.stringify(args),
		},
	},
};

// Decorator for resilience
export function resilient(name: string, config: ResilienceConfig) {
	return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;
		const registry = ResilienceManagerRegistry.getInstance();

		descriptor.value = async function (...args: any[]) {
			let manager = registry.get(name);

			if (!manager) {
				manager = registry.register(name, config);
			}

			return manager.execute(() => originalMethod.apply(this, args), {
				context: { method: propertyKey, className: target.constructor.name },
			});
		};

		return descriptor;
	};
}

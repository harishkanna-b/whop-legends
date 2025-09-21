import { CircuitBreaker } from "@/lib/circuit-breaker/circuit-breaker";
import { FailoverManager } from "@/lib/failover/failover-manager";
import {
	type ResilienceConfig,
	ResilienceManager,
	ResilienceManagerRegistry,
	defaultResilienceConfigs,
	resilient,
} from "@/lib/resilience/resilience-manager";

describe("Resilience Manager - Comprehensive Coverage", () => {
	let resilienceManager: ResilienceManager;
	let config: ResilienceConfig;
	let mockOperation: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		mockOperation = jest.fn().mockResolvedValue("success");

		config = {
			circuitBreaker: {
				failureThreshold: 3,
				resetTimeout: 5000,
				monitoringPeriod: 10000,
				timeout: 1000,
			},
			retry: {
				maxAttempts: 3,
				baseDelay: 100,
				maxDelay: 1000,
				backoffMultiplier: 2,
				jitter: true,
			},
			timeout: 2000,
			bulkhead: {
				maxConcurrent: 2,
				maxWaitTime: 1000,
			},
			cache: {
				ttl: 60000,
				keyGenerator: (...args: any[]) => JSON.stringify(args),
			},
		};

		resilienceManager = new ResilienceManager("test-manager", config);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("Basic Resilience Patterns", () => {
		it("should execute successful operations with all patterns", async () => {
			const result = await resilienceManager.execute(mockOperation);
			expect(result).toBe("success");
			expect(mockOperation).toHaveBeenCalled();
		});

		it("should apply timeout to operations", async () => {
			const slowOperation = jest
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(resolve, 3000)),
				);

			await expect(resilienceManager.execute(slowOperation)).rejects.toThrow(
				"Operation timeout",
			);
		});

		it("should handle operations without any patterns configured", async () => {
			const minimalConfig: ResilienceConfig = {};
			const minimalManager = new ResilienceManager("minimal", minimalConfig);

			const result = await minimalManager.execute(mockOperation);
			expect(result).toBe("success");
		});
	});

	describe("Circuit Breaker Integration", () => {
		it("should include circuit breaker when configured", () => {
			expect(resilienceManager.getCircuitBreaker()).toBeInstanceOf(
				CircuitBreaker,
			);
		});

		it("should not include circuit breaker when not configured", () => {
			const noCbConfig: ResilienceConfig = {
				...config,
				circuitBreaker: undefined,
			};
			const noCbManager = new ResilienceManager("no-cb", noCbConfig);

			expect(noCbManager.getCircuitBreaker()).toBeNull();
		});

		it("should route operations through circuit breaker", async () => {
			const circuitBreaker = resilienceManager.getCircuitBreaker()!;
			const originalExecute = circuitBreaker.execute;
			const spyExecute = jest.spyOn(circuitBreaker, "execute");

			await resilienceManager.execute(mockOperation);

			expect(spyExecute).toHaveBeenCalled();
		});

		it("should handle circuit breaker failures gracefully", async () => {
			const circuitBreaker = resilienceManager.getCircuitBreaker()!;
			circuitBreaker.forceOpen();

			await expect(resilienceManager.execute(mockOperation)).rejects.toThrow(
				"Circuit breaker is OPEN",
			);
		});
	});

	describe("Retry Logic", () => {
		it("should retry failed operations", async () => {
			const failingOperation = jest
				.fn()
				.mockRejectedValueOnce(new Error("First failure"))
				.mockRejectedValueOnce(new Error("Second failure"))
				.mockResolvedValue("success");

			const result = await resilienceManager.execute(failingOperation);
			expect(result).toBe("success");
			expect(failingOperation).toHaveBeenCalledTimes(3);
		});

		it("should respect max retry attempts", async () => {
			const alwaysFailingOperation = jest
				.fn()
				.mockRejectedValue(new Error("Always fails"));

			await expect(
				resilienceManager.execute(alwaysFailingOperation),
			).rejects.toThrow("Always fails");
			expect(alwaysFailingOperation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
		});

		it("should apply exponential backoff with jitter", async () => {
			const failingOperation = jest
				.fn()
				.mockRejectedValue(new Error("Always fails"));
			const startTime = Date.now();

			await expect(
				resilienceManager.execute(failingOperation),
			).rejects.toThrow();

			const endTime = Date.now();
			const totalTime = endTime - startTime;

			// Should have taken time for retries with delays
			expect(totalTime).toBeGreaterThan(200); // baseDelay + some backoff
		});

		it("should not retry when retry is not configured", async () => {
			const noRetryConfig: ResilienceConfig = { ...config, retry: undefined };
			const noRetryManager = new ResilienceManager("no-retry", noRetryConfig);

			const failingOperation = jest
				.fn()
				.mockRejectedValue(new Error("Fails once"));

			await expect(noRetryManager.execute(failingOperation)).rejects.toThrow(
				"Fails once",
			);
			expect(failingOperation).toHaveBeenCalledTimes(1);
		});
	});

	describe("Caching", () => {
		it("should cache successful operations when cache key provided", async () => {
			const cachedOperation = jest.fn().mockResolvedValue("cached-result");

			// First call should execute operation
			const result1 = await resilienceManager.execute(cachedOperation, {
				cacheKey: "test-key",
			});
			expect(result1).toBe("cached-result");
			expect(cachedOperation).toHaveBeenCalledTimes(1);

			// Second call should use cache
			const result2 = await resilienceManager.execute(cachedOperation, {
				cacheKey: "test-key",
			});
			expect(result2).toBe("cached-result");
			expect(cachedOperation).toHaveBeenCalledTimes(1); // Not called again
		});

		it("should not cache when skipCache is true", async () => {
			const cachedOperation = jest.fn().mockResolvedValue("result");

			await resilienceManager.execute(cachedOperation, {
				cacheKey: "test-key",
				skipCache: true,
			});

			await resilienceManager.execute(cachedOperation, {
				cacheKey: "test-key",
				skipCache: true,
			});

			expect(cachedOperation).toHaveBeenCalledTimes(2);
		});

		it("should handle cache expiration", async () => {
			const shortCacheConfig: ResilienceConfig = {
				...config,
				cache: {
					ttl: 100,
					keyGenerator: (...args: any[]) => JSON.stringify(args),
				},
			};
			const shortCacheManager = new ResilienceManager(
				"short-cache",
				shortCacheConfig,
			);

			const operation = jest.fn().mockResolvedValue("expired-result");

			await shortCacheManager.execute(operation, { cacheKey: "test-key" });
			expect(operation).toHaveBeenCalledTimes(1);

			// Advance time past cache TTL
			jest.advanceTimersByTime(150);

			await shortCacheManager.execute(operation, { cacheKey: "test-key" });
			expect(operation).toHaveBeenCalledTimes(2); // Called again after cache expired
		});

		it("should not cache when cache is not configured", async () => {
			const noCacheConfig: ResilienceConfig = { ...config, cache: undefined };
			const noCacheManager = new ResilienceManager("no-cache", noCacheConfig);

			const operation = jest.fn().mockResolvedValue("result");

			await noCacheManager.execute(operation, { cacheKey: "test-key" });
			await noCacheManager.execute(operation, { cacheKey: "test-key" });

			expect(operation).toHaveBeenCalledTimes(2); // Called twice, no caching
		});
	});

	describe("Bulkhead Pattern", () => {
		it("should limit concurrent operations", async () => {
			const slowOperation = jest
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(resolve, 500)),
				);

			// Execute more operations than maxConcurrent
			const promises = [];
			for (let i = 0; i < 5; i++) {
				promises.push(resilienceManager.execute(slowOperation));
			}

			const startTime = Date.now();
			const results = await Promise.all(promises);
			const endTime = Date.now();

			// Should take longer due to bulkhead limiting
			expect(endTime - startTime).toBeGreaterThan(1000); // At least 2 batches of 500ms each
			expect(results).toHaveLength(5);
		});

		it("should reject requests when bulkhead queue is full", async () => {
			const verySlowOperation = jest
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(resolve, 2000)),
				);

			// Execute many more operations than bulkhead can handle
			const promises = [];
			for (let i = 0; i < 10; i++) {
				promises.push(
					resilienceManager.execute(verySlowOperation).catch((error) => error),
				);
			}

			const results = await Promise.all(promises);
			const rejections = results.filter((result) => result instanceof Error);

			expect(rejections.length).toBeGreaterThan(0);
			expect(rejections.some((r) => r.message.includes("Bulkhead"))).toBe(true);
		});

		it("should not use bulkhead when not configured", async () => {
			const noBulkheadConfig: ResilienceConfig = {
				...config,
				bulkhead: undefined,
			};
			const noBulkheadManager = new ResilienceManager(
				"no-bulkhead",
				noBulkheadConfig,
			);

			const operation = jest.fn().mockResolvedValue("result");

			// Should execute concurrently without limitation
			const promises = [];
			for (let i = 0; i < 10; i++) {
				promises.push(noBulkheadManager.execute(operation));
			}

			const results = await Promise.all(promises);
			expect(results).toHaveLength(10);
			expect(operation).toHaveBeenCalledTimes(10);
		});
	});

	describe("Failover Integration", () => {
		it("should include failover manager when configured", () => {
			const failoverConfig: ResilienceConfig = {
				...config,
				failover: {
					primaryProvider: "primary",
					fallbackProviders: ["fallback"],
					healthCheckInterval: 30000,
					maxRetries: 2,
					retryDelay: 1000,
					failbackThreshold: 3,
				},
			};

			const failoverManager = new ResilienceManager(
				"failover-test",
				failoverConfig,
			);
			expect(failoverManager.getFailoverManager()).toBeInstanceOf(
				FailoverManager,
			);
		});

		it("should not include failover manager when not configured", () => {
			expect(resilienceManager.getFailoverManager()).toBeNull();
		});
	});

	describe("Metrics Collection", () => {
		it("should collect comprehensive metrics", async () => {
			// Execute some operations to generate metrics
			await resilienceManager.execute(mockOperation);
			await resilienceManager.execute(mockOperation);

			try {
				await resilienceManager.execute(
					jest.fn().mockRejectedValue(new Error("test")),
				);
			} catch (error) {
				// Expected to fail
			}

			const metrics = resilienceManager.getMetrics();

			expect(metrics.circuitBreaker).toBeDefined();
			expect(metrics.retry).toBeDefined();
			expect(metrics.timeout).toBeDefined();
			expect(metrics.bulkhead).toBeDefined();
			expect(metrics.cache).toBeDefined();

			expect(metrics.retry.totalAttempts).toBeGreaterThan(0);
			expect(metrics.timeout.totalOperations).toBeGreaterThan(0);
		});

		it("should track cache hit/miss rates", async () => {
			const operation = jest.fn().mockResolvedValue("cached-result");

			// First call - cache miss
			await resilienceManager.execute(operation, { cacheKey: "test-key" });

			// Second call - cache hit
			await resilienceManager.execute(operation, { cacheKey: "test-key" });

			const metrics = resilienceManager.getMetrics();
			expect(metrics.cache.hits).toBe(1);
			expect(metrics.cache.misses).toBe(1);
			expect(metrics.cache.hitRate).toBe(0.5);
		});
	});

	describe("Health Status", () => {
		it("should provide comprehensive health information", () => {
			const health = resilienceManager.getHealth();

			expect(health.isHealthy).toBeDefined();
			expect(health.circuitBreaker).toBeDefined();
			expect(health.circuitBreaker.state).toBeDefined();
			expect(health.circuitBreaker.available).toBeDefined();
			expect(health.failover).toBeDefined();
			expect(health.cache).toBeDefined();
			expect(health.bulkhead).toBeDefined();
		});

		it("should reflect circuit breaker state in health", () => {
			const circuitBreaker = resilienceManager.getCircuitBreaker()!;
			circuitBreaker.forceOpen();

			const health = resilienceManager.getHealth();
			expect(health.isHealthy).toBe(false);
			expect(health.circuitBreaker.state).toBe("OPEN");
			expect(health.circuitBreaker.available).toBe(false);
		});
	});

	describe("Availability Check", () => {
		it("should report availability based on circuit breaker", () => {
			expect(resilienceManager.isAvailable()).toBe(true);

			const circuitBreaker = resilienceManager.getCircuitBreaker()!;
			circuitBreaker.forceOpen();

			expect(resilienceManager.isAvailable()).toBe(false);
		});

		it("should always be available when no circuit breaker", () => {
			const noCbManager = new ResilienceManager("no-cb", {
				retry: config.retry,
			});
			expect(noCbManager.isAvailable()).toBe(true);
		});
	});

	describe("Manager Operations", () => {
		it("should reset all metrics and state", async () => {
			// Generate some activity
			await resilienceManager.execute(mockOperation);
			try {
				await resilienceManager.execute(
					jest.fn().mockRejectedValue(new Error("test")),
				);
			} catch (error) {
				// Expected
			}

			// Reset
			resilienceManager.reset();

			const metrics = resilienceManager.getMetrics();
			expect(metrics.retry.totalAttempts).toBe(0);
			expect(metrics.timeout.totalOperations).toBe(0);

			const health = resilienceManager.getHealth();
			expect(health.isHealthy).toBe(true);
		});
	});

	describe("Resilience Manager Registry", () => {
		let registry: ResilienceManagerRegistry;

		beforeEach(() => {
			registry = ResilienceManagerRegistry.getInstance();
		});

		it("should register and retrieve resilience managers", () => {
			const manager1 = registry.register("test1", config);
			const manager2 = registry.register("test2", config);

			expect(registry.get("test1")).toBe(manager1);
			expect(registry.get("test2")).toBe(manager2);
			expect(registry.get("nonexistent")).toBeUndefined();
		});

		it("should provide aggregated metrics", () => {
			registry.register("test1", config);
			registry.register("test2", config);

			const allMetrics = registry.getAllMetrics();
			expect(allMetrics.test1).toBeDefined();
			expect(allMetrics.test2).toBeDefined();
		});

		it("should provide aggregated health status", () => {
			registry.register("test1", config);
			registry.register("test2", config);

			const allHealth = registry.getAllHealth();
			expect(allHealth.test1).toBeDefined();
			expect(allHealth.test2).toBeDefined();
		});

		it("should support bulk reset operations", () => {
			registry.register("test1", config);
			registry.register("test2", config);

			expect(() => {
				registry.resetAll();
			}).not.toThrow();
		});

		it("should maintain singleton pattern", () => {
			const instance1 = ResilienceManagerRegistry.getInstance();
			const instance2 = ResilienceManagerRegistry.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("Default Configurations", () => {
		it("should provide default database configuration", () => {
			const dbConfig = defaultResilienceConfigs.database;
			expect(dbConfig.circuitBreaker).toBeDefined();
			expect(dbConfig.failover).toBeDefined();
			expect(dbConfig.retry).toBeDefined();
			expect(dbConfig.timeout).toBe(30000);
			expect(dbConfig.bulkhead).toBeDefined();
		});

		it("should provide default external API configuration", () => {
			const apiConfig = defaultResilienceConfigs.externalApi;
			expect(apiConfig.circuitBreaker).toBeDefined();
			expect(apiConfig.failover).toBeDefined();
			expect(apiConfig.timeout).toBe(15000);
			expect(apiConfig.bulkhead).toBeDefined();
		});

		it("should provide default cache configuration", () => {
			const cacheConfig = defaultResilienceConfigs.cache;
			expect(cacheConfig.circuitBreaker).toBeDefined();
			expect(cacheConfig.failover).toBeDefined();
			expect(cacheConfig.cache).toBeDefined();
			expect(cacheConfig.cache?.ttl).toBe(300000);
		});
	});

	describe("Decorator Integration", () => {
		it("should create resilience manager through decorator", () => {
			// Test decorator function exists
			expect(typeof resilient).toBe("function");
			expect(resilience("test", config)).toBeInstanceOf(Function);
		});

		it("should work with registry for decorator operations", () => {
			const registry = ResilienceManagerRegistry.getInstance();
			const manager = registry.register("decorator-test", config);

			expect(manager).toBeInstanceOf(ResilienceManager);
			expect(registry.get("decorator-test")).toBe(manager);
		});
	});

	describe("Error Handling", () => {
		it("should handle operations that throw non-Error objects", async () => {
			const stringErrorOperation = jest.fn().mockRejectedValue("string error");

			await expect(
				resilienceManager.execute(stringErrorOperation),
			).rejects.toThrow("string error");
		});

		it("should handle operations that throw null/undefined", async () => {
			const nullErrorOperation = jest.fn().mockRejectedValue(null);

			await expect(
				resilienceManager.execute(nullErrorOperation),
			).rejects.toThrow();
		});

		it("should handle context information properly", async () => {
			const contextOperation = jest.fn().mockResolvedValue("context-result");

			await resilienceManager.execute(contextOperation, {
				context: { userId: "123", action: "test" },
			});

			// Operation should succeed with context
			expect(contextOperation).toHaveBeenCalled();
		});
	});

	describe("Concurrent Operations", () => {
		it("should handle concurrent operations with multiple patterns", async () => {
			const promises = [];

			for (let i = 0; i < 5; i++) {
				promises.push(resilienceManager.execute(mockOperation));
			}

			const results = await Promise.all(promises);
			expect(results).toHaveLength(5);
			expect(results.every((result) => result === "success")).toBe(true);
		});

		it("should handle mixed success/failure operations concurrently", async () => {
			const mixedOperation = jest.fn().mockImplementation(() => {
				if (Math.random() < 0.3) {
					return Promise.reject(new Error("Random failure"));
				}
				return Promise.resolve("success");
			});

			const promises = [];
			for (let i = 0; i < 10; i++) {
				promises.push(
					resilienceManager.execute(mixedOperation).catch((error) => error),
				);
			}

			const results = await Promise.all(promises);
			const successes = results.filter((r) => r === "success");
			const failures = results.filter((r) => r instanceof Error);

			expect(successes.length + failures.length).toBe(10);
			expect(successes.length).toBeGreaterThan(0);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty configuration", () => {
			const emptyConfig: ResilienceConfig = {};
			const emptyManager = new ResilienceManager("empty", emptyConfig);

			expect(emptyManager.getCircuitBreaker()).toBeNull();
			expect(emptyManager.getFailoverManager()).toBeNull();
			expect(emptyManager.isAvailable()).toBe(true);
		});

		it("should handle operation timeouts longer than configured timeout", async () => {
			const timeoutConfig: ResilienceConfig = { ...config, timeout: 500 };
			const timeoutManager = new ResilienceManager("timeout", timeoutConfig);

			const slowOperation = jest
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(resolve, 1000)),
				);

			await expect(timeoutManager.execute(slowOperation)).rejects.toThrow(
				"Operation timeout",
			);
		});

		it("should handle cache with custom key generator", async () => {
			const customCacheConfig: ResilienceConfig = {
				...config,
				cache: {
					ttl: 60000,
					keyGenerator: (...args: any[]) => `custom-${args[0]}`,
				},
			};

			const customManager = new ResilienceManager(
				"custom-cache",
				customCacheConfig,
			);
			const operation = jest.fn().mockResolvedValue("custom-result");

			await customManager.execute(operation, { cacheKey: "test-key" });
			await customManager.execute(operation, { cacheKey: "test-key" });

			expect(operation).toHaveBeenCalledTimes(1); // Should be cached
		});
	});
});

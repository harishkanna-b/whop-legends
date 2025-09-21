import {
	CircuitBreaker,
	type CircuitBreakerConfig,
	CircuitBreakerRegistry,
	circuitBreaker,
	defaultCircuitBreakerConfigs,
} from "@/lib/circuit-breaker/circuit-breaker";

describe("Circuit Breaker - Comprehensive Coverage", () => {
	let circuitBreaker: CircuitBreaker;
	let config: CircuitBreakerConfig;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		config = {
			failureThreshold: 3,
			resetTimeout: 5000,
			monitoringPeriod: 10000,
			timeout: 1000,
			expectedException: (error: any) => {
				return error.message.includes("test");
			},
		};

		circuitBreaker = new CircuitBreaker(config);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("Basic Circuit Breaker Functionality", () => {
		it("should initialize with CLOSED state", () => {
			const state = circuitBreaker.getState();
			expect(state.state).toBe("CLOSED");
			expect(state.failures).toBe(0);
			expect(state.totalCalls).toBe(0);
		});

		it("should execute successful operations in CLOSED state", async () => {
			const operation = jest.fn().mockResolvedValue("success");
			const result = await circuitBreaker.execute(operation);

			expect(result).toBe("success");
			expect(operation).toHaveBeenCalled();

			const state = circuitBreaker.getState();
			expect(state.state).toBe("CLOSED");
			expect(state.successfulCalls).toBe(1);
			expect(state.failedCalls).toBe(0);
		});

		it("should handle failed operations in CLOSED state", async () => {
			const operation = jest.fn().mockRejectedValue(new Error("test error"));

			await expect(circuitBreaker.execute(operation)).rejects.toThrow(
				"test error",
			);
			expect(operation).toHaveBeenCalled();

			const state = circuitBreaker.getState();
			expect(state.state).toBe("CLOSED");
			expect(state.failures).toBe(1);
			expect(state.failedCalls).toBe(1);
		});

		it("should transition to OPEN state after threshold failures", async () => {
			const operation = jest.fn().mockRejectedValue(new Error("test error"));

			// Execute failing operations up to threshold
			for (let i = 0; i < config.failureThreshold; i++) {
				await expect(circuitBreaker.execute(operation)).rejects.toThrow();
			}

			const state = circuitBreaker.getState();
			expect(state.state).toBe("OPEN");
			expect(state.failures).toBe(config.failureThreshold);
		});

		it("should block calls when circuit is OPEN", async () => {
			const operation = jest.fn().mockResolvedValue("success");

			// Force circuit to OPEN state
			circuitBreaker.forceOpen();

			await expect(circuitBreaker.execute(operation)).rejects.toThrow(
				"Circuit breaker is OPEN",
			);
			expect(operation).not.toHaveBeenCalled();
		});

		it("should transition to HALF_OPEN after reset timeout", async () => {
			const operation = jest.fn().mockRejectedValue(new Error("test error"));

			// Open the circuit
			for (let i = 0; i < config.failureThreshold; i++) {
				await expect(circuitBreaker.execute(operation)).rejects.toThrow();
			}

			expect(circuitBreaker.getState().state).toBe("OPEN");

			// Advance time past reset timeout
			jest.advanceTimersByTime(config.resetTimeout + 1000);

			// Next call should transition to HALF_OPEN
			await expect(circuitBreaker.execute(operation)).rejects.toThrow();
			expect(circuitBreaker.getState().state).toBe("HALF_OPEN");
		});

		it("should transition back to CLOSED after successful calls in HALF_OPEN", async () => {
			// Set up HALF_OPEN state
			circuitBreaker.forceOpen();
			jest.advanceTimersByTime(config.resetTimeout + 1000);

			const successOperation = jest.fn().mockResolvedValue("success");

			// Execute successful operations to close circuit
			for (let i = 0; i < (config.halfOpenAttempts || 3); i++) {
				await circuitBreaker.execute(successOperation);
			}

			expect(circuitBreaker.getState().state).toBe("CLOSED");
			expect(circuitBreaker.getState().failures).toBe(0);
		});

		it("should immediately open on any failure in HALF_OPEN state", async () => {
			// Set up HALF_OPEN state
			circuitBreaker.forceOpen();
			jest.advanceTimersByTime(config.resetTimeout + 1000);

			const failOperation = jest
				.fn()
				.mockRejectedValue(new Error("test error"));

			await expect(circuitBreaker.execute(failOperation)).rejects.toThrow();
			expect(circuitBreaker.getState().state).toBe("OPEN");
		});
	});

	describe("Timeout Handling", () => {
		it("should timeout operations that take too long", async () => {
			const slowOperation = jest
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(resolve, 2000)),
				);

			await expect(circuitBreaker.execute(slowOperation)).rejects.toThrow(
				"Operation timeout",
			);
		});

		it("should execute operations within timeout", async () => {
			const fastOperation = jest
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(resolve, 500)),
				);

			const result = await circuitBreaker.execute(fastOperation);
			expect(result).toBeUndefined(); // Promise resolves with undefined
		});
	});

	describe("Expected Exception Filtering", () => {
		it("should count expected exceptions towards failure threshold", async () => {
			const expectedOperation = jest
				.fn()
				.mockRejectedValue(new Error("test error"));

			// This error should be counted
			await expect(circuitBreaker.execute(expectedOperation)).rejects.toThrow();

			expect(circuitBreaker.getState().failures).toBe(1);
		});

		it("should not count unexpected exceptions towards failure threshold", async () => {
			const unexpectedOperation = jest
				.fn()
				.mockRejectedValue(new Error("unexpected error"));

			// This error should not be counted
			await expect(
				circuitBreaker.execute(unexpectedOperation),
			).rejects.toThrow();

			expect(circuitBreaker.getState().failures).toBe(0);
		});

		it("should work without expected exception filter", async () => {
			const configWithoutFilter: CircuitBreakerConfig = {
				failureThreshold: 2,
				resetTimeout: 5000,
				monitoringPeriod: 10000,
			};

			const breakerWithoutFilter = new CircuitBreaker(configWithoutFilter);
			const operation = jest.fn().mockRejectedValue(new Error("any error"));

			await expect(breakerWithoutFilter.execute(operation)).rejects.toThrow();
			expect(breakerWithoutFilter.getState().failures).toBe(1);
		});
	});

	describe("Metrics Collection", () => {
		it("should collect accurate metrics", async () => {
			const successOperation = jest.fn().mockResolvedValue("success");
			const failOperation = jest
				.fn()
				.mockRejectedValue(new Error("test error"));

			// Execute successful operations
			for (let i = 0; i < 5; i++) {
				await circuitBreaker.execute(successOperation);
			}

			// Execute failed operations
			for (let i = 0; i < 2; i++) {
				try {
					await circuitBreaker.execute(failOperation);
				} catch (error) {
					// Expected to fail
				}
			}

			const metrics = circuitBreaker.getMetrics();

			expect(metrics.totalCalls).toBe(7);
			expect(metrics.successfulCalls).toBe(5);
			expect(metrics.failedCalls).toBe(2);
			expect(metrics.successRate).toBeCloseTo(71.4, 1); // 5/7 * 100
			expect(metrics.failureRate).toBeCloseTo(28.6, 1); // 2/7 * 100
			expect(metrics.averageResponseTime).toBeGreaterThan(0);
		});

		it("should track time in current state", async () => {
			const initialMetrics = circuitBreaker.getMetrics();
			expect(initialMetrics.timeInCurrentState).toBe(0);

			// Wait some time
			jest.advanceTimersByTime(1000);

			const laterMetrics = circuitBreaker.getMetrics();
			expect(laterMetrics.timeInCurrentState).toBe(1000);
		});
	});

	describe("State Management", () => {
		it("should allow manual state control", () => {
			circuitBreaker.forceOpen();
			expect(circuitBreaker.getState().state).toBe("OPEN");

			circuitBreaker.forceClosed();
			expect(circuitBreaker.getState().state).toBe("CLOSED");

			circuitBreaker.reset();
			expect(circuitBreaker.getState().state).toBe("CLOSED");
			expect(circuitBreaker.getState().failures).toBe(0);
			expect(circuitBreaker.getState().totalCalls).toBe(0);
		});

		it("should report availability correctly", () => {
			expect(circuitBreaker.isAvailable()).toBe(true);

			circuitBreaker.forceOpen();
			expect(circuitBreaker.isAvailable()).toBe(false);

			circuitBreaker.forceClosed();
			expect(circuitBreaker.isAvailable()).toBe(true);
		});

		it("should calculate remaining timeout correctly", () => {
			circuitBreaker.forceOpen();

			// Initially, should have full timeout remaining
			const initialRemaining = circuitBreaker.getRemainingTimeout();
			expect(initialRemaining).toBeGreaterThan(0);

			// Advance time
			jest.advanceTimersByTime(2000);

			const remainingAfterDelay = circuitBreaker.getRemainingTimeout();
			expect(remainingAfterDelay).toBeLessThan(initialRemaining);

			// Advance past timeout
			jest.advanceTimersByTime(config.resetTimeout);

			const remainingAfterTimeout = circuitBreaker.getRemainingTimeout();
			expect(remainingAfterTimeout).toBe(0);
		});
	});

	describe("Circuit Breaker Registry", () => {
		let registry: CircuitBreakerRegistry;

		beforeEach(() => {
			registry = CircuitBreakerRegistry.getInstance();
		});

		it("should register and retrieve circuit breakers", () => {
			const breaker1 = registry.register("test1", config);
			const breaker2 = registry.register("test2", config);

			expect(registry.get("test1")).toBe(breaker1);
			expect(registry.get("test2")).toBe(breaker2);
			expect(registry.get("nonexistent")).toBeUndefined();
		});

		it("should manage all circuit breakers", () => {
			registry.register("test1", config);
			registry.register("test2", config);

			const allBreakers = registry.getAll();
			expect(allBreakers.size).toBe(2);
			expect(allBreakers.has("test1")).toBe(true);
			expect(allBreakers.has("test2")).toBe(true);

			expect(registry.remove("test1")).toBe(true);
			expect(registry.get("test1")).toBeUndefined();
			expect(registry.getAll().size).toBe(1);
		});

		it("should provide aggregated states and metrics", () => {
			const breaker1 = registry.register("test1", config);
			const breaker2 = registry.register("test2", config);

			// Force different states
			breaker1.forceOpen();
			breaker2.forceClosed();

			const allStates = registry.getAllStates();
			expect(allStates.test1.state).toBe("OPEN");
			expect(allStates.test2.state).toBe("CLOSED");

			const allMetrics = registry.getAllMetrics();
			expect(allMetrics.test1).toBeDefined();
			expect(allMetrics.test2).toBeDefined();
		});

		it("should support bulk operations", () => {
			registry.register("test1", config);
			registry.register("test2", config);

			registry.forceOpenAll();
			expect(registry.get("test1")?.getState().state).toBe("OPEN");
			expect(registry.get("test2")?.getState().state).toBe("OPEN");

			registry.forceClosedAll();
			expect(registry.get("test1")?.getState().state).toBe("CLOSED");
			expect(registry.get("test2")?.getState().state).toBe("CLOSED");

			registry.resetAll();
			expect(registry.get("test1")?.getState().failures).toBe(0);
			expect(registry.get("test2")?.getState().failures).toBe(0);
		});

		it("should maintain singleton pattern", () => {
			const instance1 = CircuitBreakerRegistry.getInstance();
			const instance2 = CircuitBreakerRegistry.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("Default Configurations", () => {
		it("should provide default database configuration", () => {
			const dbConfig = defaultCircuitBreakerConfigs.database;
			expect(dbConfig.failureThreshold).toBe(3);
			expect(dbConfig.resetTimeout).toBe(30000);
			expect(dbConfig.timeout).toBe(10000);
			expect(dbConfig.expectedException).toBeDefined();
		});

		it("should provide default external API configuration", () => {
			const apiConfig = defaultCircuitBreakerConfigs.externalApi;
			expect(apiConfig.failureThreshold).toBe(5);
			expect(apiConfig.resetTimeout).toBe(60000);
			expect(apiConfig.timeout).toBe(15000);
			expect(apiConfig.expectedException).toBeDefined();
		});

		it("should provide default cache configuration", () => {
			const cacheConfig = defaultCircuitBreakerConfigs.cache;
			expect(cacheConfig.failureThreshold).toBe(10);
			expect(cacheConfig.resetTimeout).toBe(15000);
			expect(cacheConfig.timeout).toBe(5000);
			expect(cacheConfig.expectedException).toBeDefined();
		});
	});

	describe("Concurrent Operations", () => {
		it("should handle concurrent operations safely", async () => {
			const operation = jest.fn().mockResolvedValue("success");
			const promises = [];

			// Execute multiple operations concurrently
			for (let i = 0; i < 10; i++) {
				promises.push(circuitBreaker.execute(operation));
			}

			const results = await Promise.all(promises);
			expect(results).toHaveLength(10);
			expect(results.every((result) => result === "success")).toBe(true);

			const state = circuitBreaker.getState();
			expect(state.totalCalls).toBe(10);
			expect(state.successfulCalls).toBe(10);
		});

		it("should handle state transitions during concurrent operations", async () => {
			const successOperation = jest.fn().mockResolvedValue("success");
			const failOperation = jest
				.fn()
				.mockRejectedValue(new Error("test error"));

			// Mix of successful and failing operations
			const promises = [
				circuitBreaker.execute(successOperation),
				circuitBreaker.execute(successOperation),
				circuitBreaker.execute(failOperation),
				circuitBreaker.execute(successOperation),
				circuitBreaker.execute(failOperation),
			];

			await Promise.allSettled(promises);

			const state = circuitBreaker.getState();
			expect(state.totalCalls).toBe(5);
			expect(state.successfulCalls).toBe(3);
			expect(state.failedCalls).toBe(2);
		});
	});

	describe("Error Handling", () => {
		it("should handle synchronous errors in operations", async () => {
			const syncErrorOperation = jest.fn().mockImplementation(() => {
				throw new Error("sync error");
			});

			await expect(circuitBreaker.execute(syncErrorOperation)).rejects.toThrow(
				"sync error",
			);
		});

		it("should handle non-Error exceptions", async () => {
			const nonErrorOperation = jest.fn().mockRejectedValue("string error");

			await expect(circuitBreaker.execute(nonErrorOperation)).rejects.toThrow(
				"string error",
			);
		});

		it("should handle operations that return non-Promise values", async () => {
			const syncOperation = jest.fn().mockReturnValue("sync result");

			const result = await circuitBreaker.execute(syncOperation);
			expect(result).toBe("sync result");
		});
	});

	describe("Edge Cases", () => {
		it("should handle zero failure threshold", async () => {
			const zeroThresholdConfig: CircuitBreakerConfig = {
				...config,
				failureThreshold: 0,
			};

			const zeroBreaker = new CircuitBreaker(zeroThresholdConfig);
			const operation = jest.fn().mockRejectedValue(new Error("test error"));

			// Should open immediately on first failure
			await expect(zeroBreaker.execute(operation)).rejects.toThrow();
			expect(zeroBreaker.getState().state).toBe("OPEN");
		});

		it("should handle zero reset timeout", () => {
			const zeroTimeoutConfig: CircuitBreakerConfig = {
				...config,
				resetTimeout: 0,
			};

			const zeroTimeoutBreaker = new CircuitBreaker(zeroTimeoutConfig);
			zeroTimeoutBreaker.forceOpen();

			// Should be able to attempt reset immediately
			expect(zeroTimeoutBreaker.getRemainingTimeout()).toBe(0);
		});

		it("should handle very large configurations", () => {
			const largeConfig: CircuitBreakerConfig = {
				failureThreshold: 1000,
				resetTimeout: 24 * 60 * 60 * 1000, // 24 hours
				monitoringPeriod: 24 * 60 * 60 * 1000,
				timeout: 5 * 60 * 1000, // 5 minutes
			};

			const largeBreaker = new CircuitBreaker(largeConfig);
			const state = largeBreaker.getState();

			expect(state.state).toBe("CLOSED");
			expect(largeBreaker.getRemainingTimeout()).toBe(0);
		});
	});
});

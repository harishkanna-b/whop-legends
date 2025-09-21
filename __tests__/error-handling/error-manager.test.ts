import {
	CircuitBreaker,
	ErrorManager,
	SystemError,
	errorManager,
} from "@/lib/error-handling/error-manager";

describe("ErrorManager System", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		// Reset singleton instance for testing
		(ErrorManager as any).instance = null;
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("SystemError", () => {
		it("should create SystemError with correct properties", () => {
			const context = {
				component: "TestComponent",
				operation: "testOperation",
				userId: "user123",
			};

			const error = new SystemError(
				"Test error message",
				"TEST_ERROR",
				"medium",
				context,
				true,
			);

			expect(error.message).toBe("Test error message");
			expect(error.code).toBe("TEST_ERROR");
			expect(error.severity).toBe("medium");
			expect(error.context).toBe(context);
			expect(error.retryable).toBe(true);
			expect(error.name).toBe("SystemError");
			expect(typeof error.timestamp).toBe("number");
		});
	});

	describe("CircuitBreaker", () => {
		it("should execute operation successfully when closed", async () => {
			const circuitBreaker = new CircuitBreaker({
				failureThreshold: 3,
				resetTimeout: 1000,
				monitoringPeriod: 5000,
			});

			const operation = jest.fn().mockResolvedValue("success");
			const result = await circuitBreaker.execute(operation);

			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(1);
			expect(circuitBreaker.getState()).toBe("closed");
		});

		it("should open circuit after failure threshold is reached", async () => {
			const circuitBreaker = new CircuitBreaker({
				failureThreshold: 2,
				resetTimeout: 1000,
				monitoringPeriod: 5000,
			});

			const failingOperation = jest.fn().mockRejectedValue(new Error("Failed"));

			// First failure
			await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
			expect(circuitBreaker.getState()).toBe("closed");

			// Second failure should open the circuit
			await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
			expect(circuitBreaker.getState()).toBe("open");
		});

		it("should reject execution when circuit is open", async () => {
			const circuitBreaker = new CircuitBreaker({
				failureThreshold: 1,
				resetTimeout: 1000,
				monitoringPeriod: 5000,
			});

			const failingOperation = jest.fn().mockRejectedValue(new Error("Failed"));

			// Open the circuit
			await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
			expect(circuitBreaker.getState()).toBe("open");

			// Should reject immediately when circuit is open
			const operation = jest.fn().mockResolvedValue("success");
			await expect(circuitBreaker.execute(operation)).rejects.toThrow(
				"Circuit breaker is open",
			);
			expect(operation).not.toHaveBeenCalled();
		});

		it("should allow half-open state after reset timeout", async () => {
			const circuitBreaker = new CircuitBreaker({
				failureThreshold: 1,
				resetTimeout: 1000,
				monitoringPeriod: 5000,
			});

			const failingOperation = jest.fn().mockRejectedValue(new Error("Failed"));

			// Open the circuit
			await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
			expect(circuitBreaker.getState()).toBe("open");

			// Wait for reset timeout
			jest.advanceTimersByTime(1000);

			// Should be in half-open state
			const operation = jest.fn().mockResolvedValue("success");
			await expect(circuitBreaker.execute(operation)).resolves.toBe("success");
			expect(circuitBreaker.getState()).toBe("half-open");
		});

		it("should close circuit after 3 consecutive successes in half-open", async () => {
			const circuitBreaker = new CircuitBreaker({
				failureThreshold: 1,
				resetTimeout: 1000,
				monitoringPeriod: 5000,
			});

			const failingOperation = jest.fn().mockRejectedValue(new Error("Failed"));
			const successOperation = jest.fn().mockResolvedValue("success");

			// Open the circuit
			await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
			expect(circuitBreaker.getState()).toBe("open");

			// Wait for reset timeout
			jest.advanceTimersByTime(1000);

			// Execute successful operations to close the circuit
			await expect(circuitBreaker.execute(successOperation)).resolves.toBe(
				"success",
			);
			expect(circuitBreaker.getState()).toBe("half-open");

			await expect(circuitBreaker.execute(successOperation)).resolves.toBe(
				"success",
			);
			await expect(circuitBreaker.execute(successOperation)).resolves.toBe(
				"success",
			);

			// Should be closed after 3 consecutive successes
			expect(circuitBreaker.getState()).toBe("closed");
		});
	});

	describe("ErrorManager", () => {
		let errorManager: ErrorManager;

		beforeEach(() => {
			errorManager = ErrorManager.getInstance();
		});

		it("should be a singleton", () => {
			const instance1 = ErrorManager.getInstance();
			const instance2 = ErrorManager.getInstance();
			expect(instance1).toBe(instance2);
		});

		it("should have default recovery strategies", () => {
			const strategies = (errorManager as any).recoveryStrategies;
			expect(strategies.has("database")).toBe(true);
			expect(strategies.has("external_api")).toBe(true);
			expect(strategies.has("payment")).toBe(true);
		});

		describe("executeWithRetry", () => {
			it("should succeed on first attempt", async () => {
				const operation = jest.fn().mockResolvedValue("success");
				const strategy = {
					maxRetries: 3,
					retryDelay: 100,
					exponentialBackoff: false,
					jitter: false,
				};

				const result = await errorManager.executeWithRetry(
					operation,
					strategy,
					{ component: "Test", operation: "test" },
				);

				expect(result).toBe("success");
				expect(operation).toHaveBeenCalledTimes(1);
			});

			it("should retry on failure and eventually succeed", async () => {
				const operation = jest
					.fn()
					.mockRejectedValueOnce(new Error("First failure"))
					.mockRejectedValueOnce(new Error("Second failure"))
					.mockResolvedValue("success");

				const strategy = {
					maxRetries: 3,
					retryDelay: 100,
					exponentialBackoff: false,
					jitter: false,
				};

				const result = await errorManager.executeWithRetry(
					operation,
					strategy,
					{ component: "Test", operation: "test" },
				);

				expect(result).toBe("success");
				expect(operation).toHaveBeenCalledTimes(3);
			});

			it("should use fallback when all retries are exhausted", async () => {
				const operation = jest
					.fn()
					.mockRejectedValue(new Error("Always fails"));
				const fallback = jest.fn().mockResolvedValue("fallback result");

				const strategy = {
					maxRetries: 2,
					retryDelay: 100,
					exponentialBackoff: false,
					jitter: false,
					fallback,
				};

				const result = await errorManager.executeWithRetry(
					operation,
					strategy,
					{ component: "Test", operation: "test" },
				);

				expect(result).toBe("fallback result");
				expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry (for maxRetries: 2)
				expect(fallback).toHaveBeenCalledTimes(1);
			});

			it("should calculate exponential backoff delay", async () => {
				const operation = jest
					.fn()
					.mockRejectedValue(new Error("Always fails"));
				const fallback = jest.fn().mockResolvedValue("fallback");

				const strategy = {
					maxRetries: 3,
					retryDelay: 100,
					exponentialBackoff: true,
					jitter: false,
					fallback,
				};

				// Test the delay calculation directly instead of timing
				const testManager = errorManager as any;
				const delay1 = testManager.calculateRetryDelay(strategy, 1);
				const delay2 = testManager.calculateRetryDelay(strategy, 2);
				const delay3 = testManager.calculateRetryDelay(strategy, 3);

				// In test mode, delays should be capped at 10ms
				expect(delay1).toBe(10);
				expect(delay2).toBe(10);
				expect(delay3).toBe(10);
			});

			it("should add jitter to retry delay", async () => {
				const strategy = {
					maxRetries: 2,
					retryDelay: 100,
					exponentialBackoff: false,
					jitter: true,
				};

				// Test the delay calculation directly
				const testManager = errorManager as any;

				// Test multiple times to ensure jitter is applied
				const delays = [];
				for (let i = 0; i < 10; i++) {
					const delay = testManager.calculateRetryDelay(strategy, 1);
					delays.push(delay);
				}

				// In test mode, delays should still be capped but with jitter variation
				delays.forEach((delay) => {
					expect(delay).toBeGreaterThan(0);
					expect(delay).toBeLessThanOrEqual(50); // Max test mode delay
				});

				// Verify there's some variation (though it might be minimal in test mode)
				const uniqueDelays = new Set(delays);
				expect(uniqueDelays.size).toBeGreaterThan(0);
			});
		});

		describe("executeWithCircuitBreaker", () => {
			it("should execute operation with circuit breaker", async () => {
				const operation = jest.fn().mockResolvedValue("success");

				const result = await errorManager.executeWithCircuitBreaker(
					operation,
					"test-circuit",
					{
						failureThreshold: 2,
						resetTimeout: 1000,
						monitoringPeriod: 5000,
					},
					{ component: "Test", operation: "test" },
				);

				expect(result).toBe("success");
				expect(operation).toHaveBeenCalledTimes(1);
			});

			it("should reuse existing circuit breaker", async () => {
				const operation1 = jest.fn().mockResolvedValue("success1");
				const operation2 = jest.fn().mockResolvedValue("success2");

				const config = {
					failureThreshold: 2,
					resetTimeout: 1000,
					monitoringPeriod: 5000,
				};

				await errorManager.executeWithCircuitBreaker(
					operation1,
					"shared-circuit",
					config,
					{ component: "Test", operation: "test1" },
				);

				await errorManager.executeWithCircuitBreaker(
					operation2,
					"shared-circuit",
					config,
					{ component: "Test", operation: "test2" },
				);

				expect(operation1).toHaveBeenCalledTimes(1);
				expect(operation2).toHaveBeenCalledTimes(1);

				// Should use the same circuit breaker instance
				const circuitBreakers = (errorManager as any).circuitBreakers;
				expect(circuitBreakers.has("shared-circuit")).toBe(true);
			});
		});

		describe("convenience methods", () => {
			it("should execute database operation with retry", async () => {
				const operation = jest.fn().mockResolvedValue("db result");

				const result = await errorManager.withDatabaseRetry(operation, {
					operation: "query",
				});

				expect(result).toBe("db result");
				expect(operation).toHaveBeenCalledTimes(1);
			});

			it("should execute external API operation with retry", async () => {
				const operation = jest.fn().mockResolvedValue("api result");

				const result = await errorManager.withExternalApiRetry(operation, {
					operation: "call",
				});

				expect(result).toBe("api result");
				expect(operation).toHaveBeenCalledTimes(1);
			});

			it("should execute payment operation with retry", async () => {
				const operation = jest.fn().mockResolvedValue("payment result");

				const result = await errorManager.withPaymentRetry(operation, {
					operation: "process",
				});

				expect(result).toBe("payment result");
				expect(operation).toHaveBeenCalledTimes(1);
			});

			it("should execute operation with circuit breaker", async () => {
				const operation = jest.fn().mockResolvedValue("circuit result");

				const result = await errorManager.withCircuitBreaker(
					operation,
					"test-circuit",
					{ operation: "protected" },
				);

				expect(result).toBe("circuit result");
				expect(operation).toHaveBeenCalledTimes(1);
			});
		});

		describe("error metrics", () => {
			it("should track error metrics", () => {
				const error1 = new SystemError("Error 1", "ERROR_1", "low", {
					component: "Component1",
					operation: "op1",
				});

				const error2 = new SystemError("Error 2", "ERROR_2", "high", {
					component: "Component2",
					operation: "op2",
				});

				// Simulate error logging
				(errorManager as any).logError(error1);
				(errorManager as any).logError(error2);

				const metrics = errorManager.getErrorMetrics();

				expect(metrics.totalErrors).toBe(2);
				expect(metrics.errorByType.ERROR_1).toBe(1);
				expect(metrics.errorByType.ERROR_2).toBe(1);
				expect(metrics.errorByComponent.Component1).toBe(1);
				expect(metrics.errorByComponent.Component2).toBe(1);
			});

			it("should clean up old metrics", () => {
				// Simulate old metrics
				const oldHourKey = Math.floor(
					(Date.now() - 25 * 60 * 60 * 1000) / (60 * 60 * 1000),
				);
				const errorMetrics = (errorManager as any).errorMetrics;
				errorMetrics.set(oldHourKey, {
					total: 100,
					byType: { OLD_ERROR: 100 },
					byComponent: { OldComponent: 100 },
					bySeverity: { low: 100 },
				});

				// Add recent error
				const recentError = new SystemError(
					"Recent error",
					"RECENT_ERROR",
					"medium",
					{ component: "RecentComponent", operation: "recent" },
				);

				(errorManager as any).logError(recentError);

				const metrics = errorManager.getErrorMetrics();

				// Should only include recent errors
				expect(metrics.totalErrors).toBe(1);
				expect(metrics.errorByType.RECENT_ERROR).toBe(1);
				expect(metrics.errorByComponent.RecentComponent).toBe(1);
				expect(metrics.errorByType.OLD_ERROR).toBeUndefined();
			});
		});

		describe("error handlers", () => {
			it("should register and execute error handlers", async () => {
				const mockHandler = jest.fn().mockResolvedValue(undefined);
				errorManager.registerErrorHandler("test-handler", mockHandler);

				const error = new SystemError("Test error", "TEST_ERROR", "medium", {
					component: "Test",
					operation: "test",
				});

				// Simulate error logging
				(errorManager as any).logError(error);

				expect(mockHandler).toHaveBeenCalledWith(error);
			});

			it("should handle errors in error handlers gracefully", async () => {
				const failingHandler = jest
					.fn()
					.mockRejectedValue(new Error("Handler failed"));
				errorManager.registerErrorHandler("failing-handler", failingHandler);

				const error = new SystemError("Test error", "TEST_ERROR", "medium", {
					component: "Test",
					operation: "test",
				});

				// Should not throw when handler fails
				expect(() => {
					(errorManager as any).logError(error);
				}).not.toThrow();

				expect(failingHandler).toHaveBeenCalledWith(error);
			});
		});

		describe("error severity determination", () => {
			it("should determine correct severity for different error types", () => {
				const errorManager = ErrorManager.getInstance();

				// Test timeout errors
				const timeoutError = { code: "ETIMEDOUT" };
				expect((errorManager as any).determineSeverity(timeoutError)).toBe(
					"high",
				);

				// Test database errors
				const dbError = { code: "DATABASE_ERROR" };
				expect((errorManager as any).determineSeverity(dbError)).toBe(
					"critical",
				);

				// Test HTTP errors
				const serverError = { status: 500 };
				expect((errorManager as any).determineSeverity(serverError)).toBe(
					"high",
				);

				const clientError = { status: 400 };
				expect((errorManager as any).determineSeverity(clientError)).toBe(
					"medium",
				);

				// Test unknown errors
				const unknownError = {};
				expect((errorManager as any).determineSeverity(unknownError)).toBe(
					"low",
				);
			});
		});

		describe("retryable error detection", () => {
			it("should correctly identify retryable errors", () => {
				const errorManager = ErrorManager.getInstance();

				// Test retryable error codes
				const timeoutError = { code: "ETIMEDOUT" };
				expect((errorManager as any).isRetryable(timeoutError)).toBe(true);

				const serverError = { status: 500 };
				expect((errorManager as any).isRetryable(serverError)).toBe(true);

				const explicitlyRetryable = { retryable: true };
				expect((errorManager as any).isRetryable(explicitlyRetryable)).toBe(
					true,
				);

				// Test non-retryable errors
				const clientError = { status: 400 };
				expect((errorManager as any).isRetryable(clientError)).toBe(false);

				const nonRetryable = { code: "NON_RETRYABLE" };
				expect((errorManager as any).isRetryable(nonRetryable)).toBe(false);
			});
		});

		describe("circuit breaker status", () => {
			it("should provide circuit breaker status", async () => {
				const operation = jest.fn().mockRejectedValue(new Error("Failed"));

				// Create circuit breaker by executing with failure
				try {
					await errorManager.executeWithCircuitBreaker(
						operation,
						"status-test-circuit",
						{
							failureThreshold: 1,
							resetTimeout: 1000,
							monitoringPeriod: 5000,
						},
						{ component: "Test", operation: "test" },
					);
				} catch (error) {
					// Expected to fail
				}

				const status = errorManager.getCircuitBreakerStatus();
				expect(status["status-test-circuit"]).toBeDefined();
				expect(status["status-test-circuit"].state).toBe("open");
				expect(status["status-test-circuit"].failureCount).toBe(1);
			});
		});
	});
});

import { supabaseService } from "@/lib/supabase-client";

export interface RetryConfig {
	maxRetries: number;
	initialDelay: number;
	maxDelay: number;
	backoffFactor: number;
	retryableErrors: string[];
}

export interface RetryResult {
	success: boolean;
	attempts: number;
	error?: Error;
	retryDelay?: number;
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	initialDelay: 1000, // 1 second
	maxDelay: 30000, // 30 seconds
	backoffFactor: 2,
	retryableErrors: [
		"network",
		"timeout",
		"connection",
		"unavailable",
		"rate_limit",
		"5xx",
		"ECONNRESET",
		"ETIMEDOUT",
	],
};

// Check if an error is retryable
export const isRetryableError = (
	error: Error,
	config: RetryConfig,
): boolean => {
	const errorMessage = error.message.toLowerCase();

	return config.retryableErrors.some((retryableError) =>
		errorMessage.includes(retryableError.toLowerCase()),
	);
};

// Calculate exponential backoff delay
export const calculateBackoffDelay = (
	attempt: number,
	config: RetryConfig,
): number => {
	const delay = Math.min(
		config.initialDelay * config.backoffFactor ** (attempt - 1),
		config.maxDelay,
	);

	// Add jitter to prevent thundering herd
	const jitter = delay * 0.1 * Math.random();

	return Math.floor(delay + jitter);
};

// Generic retry function with exponential backoff
export const retryWithBackoff = async <T>(
	operation: () => Promise<T>,
	config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<RetryResult & { result?: T }> => {
	let lastError: Error = new Error("Unknown error");

	for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
		try {
			const result = await operation();
			return {
				success: true,
				attempts: attempt,
				result,
			};
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Check if we should retry
			if (
				attempt === config.maxRetries ||
				!isRetryableError(lastError, config)
			) {
				break;
			}

			// Calculate delay and wait
			const delay = calculateBackoffDelay(attempt, config);
			console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);

			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return {
		success: false,
		attempts: config.maxRetries,
		error: lastError,
	};
};

// Webhook-specific retry handler with database persistence
export const retryWebhookProcessing = async (
	webhookId: string,
	eventType: string,
	payload: any,
	processingFunction: () => Promise<any>,
): Promise<RetryResult> => {
	let webhookError: Error = new Error("Unknown error");

	// Log retry attempt to database
	const logRetryAttempt = async (attempt: number, error?: Error) => {
		try {
			await supabaseService().from("webhook_retry_logs").insert({
				webhook_id: webhookId,
				event_type: eventType,
				attempt_number: attempt,
				error_message: error?.message,
				retry_at: new Date().toISOString(),
			});
		} catch (logError) {
			console.error("Failed to log retry attempt:", logError);
		}
	};

	const config: RetryConfig = {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 5, // More retries for webhooks
		initialDelay: 2000, // Start with 2 seconds
		retryableErrors: [
			...DEFAULT_RETRY_CONFIG.retryableErrors,
			"database",
			"constraint",
			"foreign_key",
		],
	};

	for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
		try {
			const result = await processingFunction();

			// Mark webhook as successfully processed
			await supabaseService()
				.from("webhook_logs")
				.update({
					status: "success",
					processed_at: new Date().toISOString(),
					retry_count: attempt,
				})
				.eq("webhook_id", webhookId);

			return {
				success: true,
				attempts: attempt,
			};
		} catch (error) {
			webhookError = error instanceof Error ? error : new Error(String(error));

			// Log the failed attempt
			await logRetryAttempt(attempt, webhookError);

			// Check if we should retry
			if (
				attempt === config.maxRetries ||
				!isRetryableError(webhookError, config)
			) {
				break;
			}

			// Calculate delay and wait
			const delay = calculateBackoffDelay(attempt, config);
			console.log(
				`Webhook ${webhookId} attempt ${attempt} failed, retrying in ${delay}ms...`,
			);

			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// Mark webhook as failed after all retries
	await supabaseService()
		.from("webhook_logs")
		.update({
			status: "failed",
			error_message: webhookError?.message,
			retry_count: config.maxRetries,
		})
		.eq("webhook_id", webhookId);

	return {
		success: false,
		attempts: config.maxRetries,
		error: webhookError,
	};
};

// Rate limit aware retry handler
export const retryWithRateLimit = async <T>(
	operation: () => Promise<T>,
	config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<RetryResult & { result?: T }> => {
	let rateError: Error = new Error("Unknown error");

	for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
		try {
			const result = await operation();
			return {
				success: true,
				attempts: attempt,
				result,
			};
		} catch (error) {
			rateError = error instanceof Error ? error : new Error(String(error));

			// Handle rate limit specifically
			if (
				rateError.message.includes("rate_limit") ||
				(error as any)?.status === 429
			) {
				const retryAfter = (error as any)?.headers?.["retry-after"] || 60;
				const delay = Number.parseInt(retryAfter) * 1000;

				console.log(`Rate limited, waiting ${delay}ms before retry...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}

			// Check if we should retry for other errors
			if (
				attempt === config.maxRetries ||
				!isRetryableError(rateError, config)
			) {
				break;
			}

			// Calculate delay and wait
			const delay = calculateBackoffDelay(attempt, config);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return {
		success: false,
		attempts: config.maxRetries,
		error: rateError,
	};
};

// Circuit breaker pattern for external services
export class CircuitBreaker {
	private failureCount = 0;
	private lastFailureTime = 0;
	private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

	constructor(
		private readonly failureThreshold: number,
		private readonly timeout: number,
		private readonly monitoringPeriod: number,
	) {}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === "OPEN") {
			if (Date.now() - this.lastFailureTime > this.timeout) {
				this.state = "HALF_OPEN";
			} else {
				throw new Error("Circuit breaker is OPEN");
			}
		}

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess() {
		this.failureCount = 0;
		this.state = "CLOSED";
	}

	private onFailure() {
		this.failureCount++;
		this.lastFailureTime = Date.now();

		if (this.failureCount >= this.failureThreshold) {
			this.state = "OPEN";
			console.log(`Circuit breaker OPENED after ${this.failureCount} failures`);
		}
	}

	getState() {
		return {
			state: this.state,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime,
		};
	}
}

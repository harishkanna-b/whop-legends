import { supabaseService } from "@/lib/supabase-client";
import type { WhopWebhookEvent } from "@/types/whop";
import { WebhookRetryQueue, webhookRetryQueue } from "./retry-queue";
import { webhookHealthMonitor } from "./webhook-health";

export interface WebhookManagerConfig {
	autoStartRetryQueue?: boolean;
	enableHealthMonitoring?: boolean;
	maxRetries?: number;
	healthCheckInterval?: number;
}

export class WebhookManager {
	private isInitialized = false;
	private healthCheckInterval: NodeJS.Timeout | null = null;

	constructor(private readonly config: WebhookManagerConfig = {}) {
		// Set default values
		this.config = {
			autoStartRetryQueue: true,
			enableHealthMonitoring: true,
			maxRetries: 5,
			healthCheckInterval: 30000, // 30 seconds
			...config,
		};
	}

	// Initialize the webhook manager
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			console.log("Webhook manager already initialized");
			return;
		}

		try {
			console.log("Initializing webhook manager...");

			// Start the retry queue if enabled
			if (this.config.autoStartRetryQueue) {
				webhookRetryQueue.start();
				console.log("Started webhook retry queue");
			}

			// Start health monitoring if enabled
			if (this.config.enableHealthMonitoring) {
				this.startHealthMonitoring();
				console.log("Started health monitoring");
			}

			// Perform initial health check
			const health = await webhookHealthMonitor.checkHealth();
			if (!health.healthy) {
				console.warn("Webhook system started with issues:", health.issues);
			} else {
				console.log("Webhook system initialized successfully");
			}

			this.isInitialized = true;
		} catch (error) {
			console.error("Failed to initialize webhook manager:", error);
			throw error;
		}
	}

	// Shutdown the webhook manager
	async shutdown(): Promise<void> {
		try {
			console.log("Shutting down webhook manager...");

			// Stop the retry queue
			webhookRetryQueue.stop();

			// Stop health monitoring
			if (this.healthCheckInterval) {
				clearInterval(this.healthCheckInterval);
				this.healthCheckInterval = null;
			}

			this.isInitialized = false;
			console.log("Webhook manager shutdown complete");
		} catch (error) {
			console.error("Error during webhook manager shutdown:", error);
		}
	}

	// Process a webhook event with full error handling and retry logic
	async processWebhook(event: WhopWebhookEvent): Promise<{
		success: boolean;
		webhookId: string;
		error?: string;
		shouldRetry?: boolean;
	}> {
		if (!this.isInitialized) {
			throw new Error("Webhook manager not initialized");
		}

		const startTime = Date.now();
		const webhookId = event.id;

		try {
			// Log the incoming webhook
			await this.logIncomingWebhook(event);

			// Get the appropriate handler
			const { handleWebhookEvent } = await import("@/lib/webhooks/handlers");

			// Process the webhook
			const result = await handleWebhookEvent(event);

			// Calculate processing time
			const processingTime = Date.now() - startTime;

			// Log performance metrics
			await webhookHealthMonitor.logWebhookPerformance(
				webhookId,
				event.type,
				processingTime,
				result.success,
				result.error,
			);

			// Update webhook log
			await this.updateWebhookLog(webhookId, {
				status: result.success ? "success" : "failed",
				processing_time_ms: processingTime,
				error_message: result.error,
			});

			// If processing failed and should retry, add to retry queue
			if (!result.success && result.shouldRetry) {
				await WebhookRetryQueue.add(webhookId, event.type, event.data, {
					priority: "medium",
					maxAttempts: this.config.maxRetries,
					delay: 5000, // 5 second delay before first retry
				});
			}

			return {
				success: result.success,
				webhookId,
				error: result.error,
				shouldRetry: result.shouldRetry,
			};
		} catch (error) {
			const processingTime = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			// Log the error
			await webhookHealthMonitor.logWebhookPerformance(
				webhookId,
				event.type,
				processingTime,
				false,
				errorMessage,
			);

			// Update webhook log with error
			await this.updateWebhookLog(webhookId, {
				status: "failed",
				processing_time_ms: processingTime,
				error_message: errorMessage,
			});

			// Add to retry queue
			await WebhookRetryQueue.add(webhookId, event.type, event.data, {
				priority: "high", // High priority for unexpected errors
				maxAttempts: this.config.maxRetries,
				delay: 2000, // 2 second delay for unexpected errors
			});

			return {
				success: false,
				webhookId,
				error: errorMessage,
				shouldRetry: true,
			};
		}
	}

	// Get system status
	async getStatus() {
		if (!this.isInitialized) {
			return {
				status: "not_initialized",
				message: "Webhook manager has not been initialized",
			};
		}

		const metrics = await webhookHealthMonitor.getMetrics();
		const health = await webhookHealthMonitor.checkHealth();
		const queueStats = await WebhookRetryQueue.getStats();

		return {
			status: health.healthy ? "healthy" : "unhealthy",
			initialized: this.isInitialized,
			metrics,
			health,
			queue: queueStats,
			config: {
				autoStartRetryQueue: this.config.autoStartRetryQueue,
				enableHealthMonitoring: this.config.enableHealthMonitoring,
				maxRetries: this.config.maxRetries,
			},
		};
	}

	// Start health monitoring
	private startHealthMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}

		this.healthCheckInterval = setInterval(async () => {
			try {
				const health = await webhookHealthMonitor.checkHealth();

				if (!health.healthy) {
					console.warn("Webhook system health check failed:", health.issues);

					// Take corrective actions based on specific issues
					if (health.issues.includes("Too many overdue webhooks in queue")) {
						console.log("Scaling up retry queue processing...");
						// Implement scaling logic here
					}
				}
			} catch (error) {
				console.error("Error in health monitoring:", error);
			}
		}, this.config.healthCheckInterval);
	}

	// Log incoming webhook
	private async logIncomingWebhook(event: WhopWebhookEvent): Promise<void> {
		try {
			await supabaseService().from("webhook_logs").insert({
				webhook_id: event.id,
				event_type: event.type,
				payload: event.data,
				received_at: new Date().toISOString(),
				status: "processing",
			});
		} catch (error) {
			console.error("Failed to log incoming webhook:", error);
			// Don't throw here as this is not critical for webhook processing
		}
	}

	// Update webhook log
	private async updateWebhookLog(
		webhookId: string,
		updates: {
			status: "success" | "failed" | "processing";
			processing_time_ms?: number;
			error_message?: string;
		},
	): Promise<void> {
		try {
			await supabaseService()
				.from("webhook_logs")
				.update({
					...updates,
					processed_at: new Date().toISOString(),
				})
				.eq("webhook_id", webhookId);
		} catch (error) {
			console.error("Failed to update webhook log:", error);
			// Don't throw here as this is not critical for webhook processing
		}
	}
}

// Global instance of the webhook manager
export const webhookManager = new WebhookManager();

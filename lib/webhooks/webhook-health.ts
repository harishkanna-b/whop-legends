import { supabaseService } from "@/lib/supabase-client";

export interface WebhookHealthMetrics {
	totalWebhooks: number;
	successRate: number;
	averageProcessingTime: number;
	errorRate: number;
	recentErrors: WebhookError[];
	queueSize: number;
	lastProcessed: string | null;
}

export interface WebhookError {
	webhook_id: string;
	event_type: string;
	error_message: string;
	timestamp: string;
	retry_count: number;
}

export class WebhookHealthMonitor {
	private metrics: WebhookHealthMetrics = {
		totalWebhooks: 0,
		successRate: 0,
		averageProcessingTime: 0,
		errorRate: 0,
		recentErrors: [],
		queueSize: 0,
		lastProcessed: null,
	};

	private lastUpdate = 0;
	private readonly cacheTTL = 60000; // 1 minute cache

	// Get current health metrics
	async getMetrics(): Promise<WebhookHealthMetrics> {
		// Check cache
		if (Date.now() - this.lastUpdate < this.cacheTTL) {
			return this.metrics;
		}

		try {
			// Get overall webhook statistics
			const { data: webhooks, error: webhookError } = await supabaseService()
				.from("webhook_logs")
				.select(
					"status, processing_time_ms, created_at, webhook_id, event_type",
				)
				.order("created_at", { ascending: false })
				.limit(1000);

			if (webhookError) throw webhookError;

			// Calculate metrics
			const totalWebhooks = webhooks?.length || 0;
			const successfulWebhooks =
				webhooks?.filter((w: any) => w.status === "success").length || 0;
			const failedWebhooks =
				webhooks?.filter((w: any) => w.status === "failed").length || 0;
			const successRate =
				totalWebhooks > 0 ? (successfulWebhooks / totalWebhooks) * 100 : 0;
			const errorRate =
				totalWebhooks > 0 ? (failedWebhooks / totalWebhooks) * 100 : 0;

			// Calculate average processing time
			const processingTimes =
				webhooks
					?.filter((w: any) => w.processing_time_ms)
					.map((w: any) => w.processing_time_ms) || [];
			const averageProcessingTime =
				processingTimes.length > 0
					? processingTimes.reduce((sum: any, time: any) => sum + time, 0) /
						processingTimes.length
					: 0;

			// Get recent errors
			const recentErrors = await this.getRecentErrors();

			// Get queue size
			const queueSize = await this.getQueueSize();

			// Get last processed time
			const lastProcessed =
				webhooks && webhooks.length > 0 ? webhooks[0].created_at : null;

			this.metrics = {
				totalWebhooks,
				successRate,
				averageProcessingTime,
				errorRate,
				recentErrors,
				queueSize,
				lastProcessed,
			};

			this.lastUpdate = Date.now();

			return this.metrics;
		} catch (error) {
			console.error("Error getting webhook health metrics:", error);
			return this.metrics;
		}
	}

	// Get recent webhook errors
	private async getRecentErrors(limit = 10): Promise<WebhookError[]> {
		try {
			const { data: errors, error } = await supabaseService()
				.from("webhook_logs")
				.select(
					"webhook_id, event_type, error_message, created_at, retry_count",
				)
				.eq("status", "failed")
				.order("created_at", { ascending: false })
				.limit(limit);

			if (error) throw error;

			return (errors || []).map((error: any) => ({
				webhook_id: error.webhook_id,
				event_type: error.event_type,
				error_message: error.error_message || "Unknown error",
				timestamp: error.created_at,
				retry_count: error.retry_count || 0,
			}));
		} catch (error) {
			console.error("Error getting recent webhook errors:", error);
			return [];
		}
	}

	// Get current retry queue size
	private async getQueueSize(): Promise<number> {
		try {
			const { data: queue, error } = await supabaseService()
				.from("webhook_retry_queue")
				.select("*", { count: "exact", head: true });

			if (error) throw error;

			return queue?.length || 0;
		} catch (error) {
			console.error("Error getting queue size:", error);
			return 0;
		}
	}

	// Log webhook performance metrics
	async logWebhookPerformance(
		webhookId: string,
		eventType: string,
		processingTime: number,
		success: boolean,
		error?: string,
	): Promise<void> {
		try {
			await supabaseService().from("webhook_performance_logs").insert({
				webhook_id: webhookId,
				event_type: eventType,
				processing_time_ms: processingTime,
				success,
				error_message: error,
				timestamp: new Date().toISOString(),
			});
		} catch (logError) {
			console.error("Failed to log webhook performance:", logError);
		}
	}

	// Check webhook system health
	async checkHealth(): Promise<{
		healthy: boolean;
		checks: {
			database: boolean;
			webhookQueue: boolean;
			errorRate: boolean;
			processingTime: boolean;
		};
		issues: string[];
	}> {
		const issues: string[] = [];
		const checks = {
			database: false,
			webhookQueue: false,
			errorRate: false,
			processingTime: false,
		};

		try {
			// Check database connectivity
			const { data: test, error: dbError } = await supabaseService()
				.from("webhook_logs")
				.select("id", { count: "exact", head: true })
				.limit(1);

			checks.database = !dbError;
			if (dbError) {
				issues.push("Database connectivity issue");
			}

			// Check webhook queue (should not have too many overdue items)
			const { data: overdue } = await supabaseService()
				.from("webhook_retry_queue")
				.select("*", { count: "exact", head: true })
				.lte("scheduled_at", new Date(Date.now() - 300000)); // 5 minutes overdue

			checks.webhookQueue = (overdue?.length || 0) < 100;
			if ((overdue?.length || 0) >= 100) {
				issues.push("Too many overdue webhooks in queue");
			}

			// Get current metrics for other checks
			const metrics = await this.getMetrics();

			// Check error rate (should be below 10%)
			checks.errorRate = metrics.errorRate < 10;
			if (metrics.errorRate >= 10) {
				issues.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
			}

			// Check average processing time (should be below 5 seconds)
			checks.processingTime = metrics.averageProcessingTime < 5000;
			if (metrics.averageProcessingTime >= 5000) {
				issues.push(
					`Slow processing time: ${metrics.averageProcessingTime.toFixed(2)}ms`,
				);
			}

			return {
				healthy:
					checks.database &&
					checks.webhookQueue &&
					checks.errorRate &&
					checks.processingTime,
				checks,
				issues,
			};
		} catch (error) {
			console.error("Error checking webhook health:", error);
			return {
				healthy: false,
				checks,
				issues: ["Health check failed"],
			};
		}
	}

	// Get webhook statistics for a specific time period
	async getStatsForPeriod(
		startDate: string,
		endDate: string,
	): Promise<{
		totalWebhooks: number;
		successfulWebhooks: number;
		failedWebhooks: number;
		successRate: number;
		averageProcessingTime: number;
		eventTypeBreakdown: Record<string, { count: number; successRate: number }>;
	}> {
		try {
			const { data: webhooks, error } = await supabaseService()
				.from("webhook_logs")
				.select("*")
				.gte("created_at", startDate)
				.lte("created_at", endDate);

			if (error) throw error;

			const totalWebhooks = webhooks?.length || 0;
			const successfulWebhooks =
				webhooks?.filter((w: any) => w.status === "success").length || 0;
			const failedWebhooks =
				webhooks?.filter((w: any) => w.status === "failed").length || 0;
			const successRate =
				totalWebhooks > 0 ? (successfulWebhooks / totalWebhooks) * 100 : 0;

			const processingTimes =
				webhooks
					?.filter((w: any) => w.processing_time_ms)
					.map((w: any) => w.processing_time_ms) || [];
			const averageProcessingTime =
				processingTimes.length > 0
					? processingTimes.reduce((sum: any, time: any) => sum + time, 0) /
						processingTimes.length
					: 0;

			// Calculate breakdown by event type
			const eventTypeCounts: Record<
				string,
				{ success: number; total: number }
			> = {};

			webhooks?.forEach((webhook: any) => {
				if (!eventTypeCounts[webhook.event_type]) {
					eventTypeCounts[webhook.event_type] = { success: 0, total: 0 };
				}
				eventTypeCounts[webhook.event_type].total++;
				if (webhook.status === "success") {
					eventTypeCounts[webhook.event_type].success++;
				}
			});

			const eventTypeBreakdown: Record<
				string,
				{ count: number; successRate: number }
			> = {};

			Object.entries(eventTypeCounts).forEach(([eventType, counts]) => {
				eventTypeBreakdown[eventType] = {
					count: counts.total,
					successRate:
						counts.total > 0 ? (counts.success / counts.total) * 100 : 0,
				};
			});

			return {
				totalWebhooks,
				successfulWebhooks,
				failedWebhooks,
				successRate,
				averageProcessingTime,
				eventTypeBreakdown,
			};
		} catch (error) {
			console.error("Error getting period stats:", error);
			return {
				totalWebhooks: 0,
				successfulWebhooks: 0,
				failedWebhooks: 0,
				successRate: 0,
				averageProcessingTime: 0,
				eventTypeBreakdown: {},
			};
		}
	}
}

// Global instance of the health monitor
export const webhookHealthMonitor = new WebhookHealthMonitor();

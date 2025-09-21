import {
	WebhookRetryQueue,
	webhookRetryQueue,
} from "@/lib/webhooks/retry-queue";
import { webhookHealthMonitor } from "@/lib/webhooks/webhook-health";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function healthHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Get current health metrics
		const metrics = await webhookHealthMonitor.getMetrics();

		// Check overall health
		const healthCheck = await webhookHealthMonitor.checkHealth();

		// Get queue stats
		const queueStats = await WebhookRetryQueue.getStats();

		// Return comprehensive health information
		const response = {
			status: healthCheck.healthy ? "healthy" : "unhealthy",
			timestamp: new Date().toISOString(),
			metrics: {
				...metrics,
				queue: queueStats,
			},
			checks: healthCheck.checks,
			issues: healthCheck.issues,
			uptime: process.uptime(),
			memory: process.memoryUsage(),
		};

		// Set appropriate status code based on health
		const statusCode = healthCheck.healthy ? 200 : 503;

		return res.status(statusCode).json(response);
	} catch (error) {
		console.error("Webhook health check error:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);

		return res.status(500).json({
			status: "error",
			timestamp: new Date().toISOString(),
			error: errorMessage,
		});
	}
}

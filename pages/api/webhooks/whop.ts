import { rateLimitMiddleware } from "@/lib/rate-limit";
import { validateWebhookRequest } from "@/lib/webhooks/verify-signature";
import { webhookManager } from "@/lib/webhooks/webhook-manager";
import type { NextApiRequest, NextApiResponse } from "next";

// Webhook secret from environment
const WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET!;

if (!WEBHOOK_SECRET) {
	throw new Error("WHOP_WEBHOOK_SECRET environment variable is required");
}

export const config = {
	api: {
		bodyParser: {
			sizeLimit: "10mb", // Increase limit for webhook payloads
		},
	},
};

export default async function webhookHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	// Only accept POST requests
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Apply rate limiting
		const rateLimitResult = await rateLimitMiddleware(req);
		if (!rateLimitResult.allowed) {
			return res.status(429).json({
				error: "Rate limit exceeded",
				retryAfter: rateLimitResult.retryAfter,
			});
		}

		// Verify webhook signature
		const validation = validateWebhookRequest(
			{
				headers: {
					"x-whop-signature": req.headers["x-whop-signature"] as string,
					"x-whop-timestamp": req.headers["x-whop-timestamp"] as string,
					"x-whop-event": req.headers["x-whop-event"] as string,
				},
				body: req.body,
			},
			WEBHOOK_SECRET,
		);
		if (!validation.isValid) {
			console.error("Webhook signature validation failed:", validation.error);
			return res.status(401).json({ error: "Invalid signature" });
		}

		console.log(`Processing webhook event: ${validation.eventType}`);

		// Process the webhook event using the webhook manager
		const result = await webhookManager.processWebhook(req.body);

		// Return appropriate response based on processing result
		if (result.success) {
			return res.status(200).json({
				success: true,
				webhook_id: result.webhookId,
				message: "Webhook processed successfully",
			});
		}
		// For processing errors, still return 200 but with error details
		// This prevents Whop from retrying non-retryable errors
		return res.status(200).json({
			success: false,
			webhook_id: result.webhookId,
			error: result.error,
			shouldRetry: result.shouldRetry || false,
		});
	} catch (error) {
		console.error("Webhook processing error:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);

		// Return 500 for unexpected errors
		return res.status(500).json({
			error: "Internal server error",
			message: errorMessage,
		});
	}
}

// Initialize webhook manager on startup
if (typeof window === "undefined") {
	// Only run on server side
	webhookManager.initialize().catch((error) => {
		console.error("Failed to initialize webhook manager:", error);
	});
}

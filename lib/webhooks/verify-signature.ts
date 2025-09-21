import crypto from "node:crypto";
import type { WebhookSignature } from "@/types/whop";

export class WebhookSignatureError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "WebhookSignatureError";
	}
}

export const verifyWebhookSignature = (
	payload: string,
	signature: string,
	timestamp: string,
	secret: string,
): boolean => {
	try {
		// Verify timestamp is recent (within 5 minutes)
		const now = Math.floor(Date.now() / 1000);
		const timestampNum = Number.parseInt(timestamp, 10);

		if (Math.abs(now - timestampNum) > 300) {
			throw new WebhookSignatureError("Webhook timestamp is too old");
		}

		// Create the signed payload string
		const signedPayload = `${timestamp}.${payload}`;

		// Compute the expected signature
		const expectedSignature = crypto
			.createHmac("sha256", secret)
			.update(signedPayload, "utf8")
			.digest("hex");

		// Check if signatures have the same length before comparing
		if (signature.length !== expectedSignature.length) {
			return false;
		}

		// Compare signatures securely
		return crypto.timingSafeEqual(
			Buffer.from(signature, "hex"),
			Buffer.from(expectedSignature, "hex"),
		);
	} catch (error) {
		if (error instanceof WebhookSignatureError) {
			throw error;
		}
		// For buffer length errors and other crypto errors, return false instead of throwing
		if (error instanceof RangeError && error.message.includes("byte length")) {
			return false;
		}
		const message = error instanceof Error ? error.message : String(error);
		throw new WebhookSignatureError(
			`Signature verification failed: ${message}`,
		);
	}
};

export const extractSignatureFromHeader = (
	signatureHeader: string,
): WebhookSignature => {
	// Expected format: t={timestamp},v1={signature}
	const parts = signatureHeader.split(",");

	let timestamp = "";
	let signature = "";

	for (const part of parts) {
		const [key, value] = part.split("=");
		if (key === "t") {
			timestamp = value;
		} else if (key === "v1") {
			signature = value;
		}
	}

	if (!timestamp || !signature) {
		throw new WebhookSignatureError("Invalid signature header format");
	}

	return { timestamp, signature };
};

export const validateWebhookRequest = (
	req: {
		headers: {
			"x-whop-signature"?: string;
			"x-whop-timestamp"?: string;
			"x-whop-event"?: string;
		};
		body: any;
	},
	secret: string,
): { isValid: boolean; eventType?: string; error?: string } => {
	try {
		const signatureHeader = req.headers["x-whop-signature"];
		const timestampHeader = req.headers["x-whop-timestamp"];
		const eventType = req.headers["x-whop-event"];

		if (!signatureHeader) {
			throw new WebhookSignatureError("Missing X-Whop-Signature header");
		}

		if (!timestampHeader) {
			throw new WebhookSignatureError("Missing X-Whop-Timestamp header");
		}

		if (!eventType) {
			throw new WebhookSignatureError("Missing X-Whop-Event header");
		}

		const payload =
			typeof req.body === "string" ? req.body : JSON.stringify(req.body);
		const isValid = verifyWebhookSignature(
			payload,
			signatureHeader,
			timestampHeader,
			secret,
		);

		return { isValid, eventType };
	} catch (error) {
		return {
			isValid: false,
			error:
				error instanceof WebhookSignatureError
					? error.message
					: "Unknown error",
		};
	}
};

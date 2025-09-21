import crypto from "node:crypto";
import { SecurityValidator } from "./validation";

export interface WebhookSecurityConfig {
	maxPayloadSize: number;
	allowedIps: string[];
	requestTimeout: number;
	retryLimit: number;
	signatureAlgorithm: string;
	signatureHeader: string;
}

export interface ValidatedWebhook {
	isValid: boolean;
	data?: any;
	error?: string;
	riskScore: number;
	securityChecks: {
		signatureValid: boolean;
		ipAllowed: boolean;
		payloadSizeValid: boolean;
		timestampValid: boolean;
		rateLimitValid: boolean;
	};
}

export class WebhookSecurity {
	private static config: WebhookSecurityConfig = {
		maxPayloadSize: 1024 * 1024, // 1MB
		allowedIps: process.env.WHOP_ALLOWED_IPS?.split(",") || [],
		requestTimeout: 5000, // 5 seconds
		retryLimit: 3,
		signatureAlgorithm: "sha256",
		signatureHeader: "whop-signature",
	};

	private static rateLimiter = new Map<
		string,
		{ count: number; resetTime: number }
	>();

	/**
	 * Enhanced webhook security validation with comprehensive checks
	 */
	static async validateWebhook(
		request: Request,
		rawBody: string,
	): Promise<ValidatedWebhook> {
		const startTime = Date.now();
		const clientIp = WebhookSecurity.getClientIP(request);
		const signature = request.headers.get(
			WebhookSecurity.config.signatureHeader,
		);

		const securityChecks = {
			signatureValid: false,
			ipAllowed: false,
			payloadSizeValid: false,
			timestampValid: false,
			rateLimitValid: false,
		};

		let riskScore = 0;
		let error: string | undefined;

		try {
			// 1. Rate limiting check
			const rateLimitResult = WebhookSecurity.checkRateLimit(clientIp);
			securityChecks.rateLimitValid = rateLimitResult.allowed;
			if (!rateLimitResult.allowed) {
				riskScore += 0.4;
				error = `Rate limit exceeded: ${rateLimitResult.remaining} requests remaining`;
			}

			// 2. IP whitelist check
			if (WebhookSecurity.config.allowedIps.length > 0) {
				securityChecks.ipAllowed =
					WebhookSecurity.config.allowedIps.includes(clientIp);
				if (!securityChecks.ipAllowed) {
					riskScore += 0.3;
					error = `IP address not allowed: ${clientIp}`;
				}
			} else {
				securityChecks.ipAllowed = true; // Allow all if no IP restrictions
			}

			// 3. Payload size validation
			securityChecks.payloadSizeValid =
				rawBody.length <= WebhookSecurity.config.maxPayloadSize;
			if (!securityChecks.payloadSizeValid) {
				riskScore += 0.2;
				error = `Payload size exceeds limit: ${rawBody.length} > ${WebhookSecurity.config.maxPayloadSize}`;
			}

			// 4. Timestamp validation (if present in payload)
			const timestampValidation = WebhookSecurity.validateTimestamp(rawBody);
			securityChecks.timestampValid = timestampValidation.valid;
			if (!timestampValidation.valid) {
				riskScore += 0.1;
				error = timestampValidation.error;
			}

			// 5. Signature validation
			if (signature && process.env.WHOP_WEBHOOK_SECRET) {
				securityChecks.signatureValid = WebhookSecurity.validateSignature(
					signature,
					rawBody,
					process.env.WHOP_WEBHOOK_SECRET,
				);
				if (!securityChecks.signatureValid) {
					riskScore += 0.5;
					error = "Invalid webhook signature";
				}
			} else {
				securityChecks.signatureValid = true; // Skip signature validation if not configured
			}

			// 6. Parse and validate payload structure
			let data: any;
			try {
				data = JSON.parse(rawBody);

				// Enhanced payload validation
				const payloadValidation =
					WebhookSecurity.validatePayloadStructure(data);
				if (!payloadValidation.valid) {
					riskScore += 0.2;
					error = payloadValidation.error;
				}
			} catch (parseError) {
				riskScore += 0.3;
				error = "Invalid JSON payload";
				return {
					isValid: false,
					error,
					riskScore: Math.min(riskScore, 1.0),
					securityChecks,
				};
			}

			// 7. Security pattern detection
			const securityScan = WebhookSecurity.scanForSecurityThreats(
				data,
				rawBody,
			);
			if (securityScan.threatDetected) {
				riskScore += 0.6;
				error = `Security threat detected: ${securityScan.threatType}`;
			}

			const isValid =
				riskScore < 0.3 &&
				Object.values(securityChecks).every((check) => check);

			return {
				isValid,
				data: isValid ? data : undefined,
				error: isValid ? undefined : error,
				riskScore: Math.min(riskScore, 1.0),
				securityChecks,
			};
		} catch (err) {
			riskScore += 0.8;
			return {
				isValid: false,
				error: `Security validation failed: ${err}`,
				riskScore: Math.min(riskScore, 1.0),
				securityChecks,
			};
		} finally {
			// Log security metrics
			WebhookSecurity.logSecurityMetrics(
				clientIp,
				riskScore,
				securityChecks,
				Date.now() - startTime,
			);
		}
	}

	/**
	 * Enhanced rate limiting with sliding window and IP tracking
	 */
	private static checkRateLimit(ip: string): {
		allowed: boolean;
		remaining: number;
	} {
		const now = Date.now();
		const windowSize = 60 * 1000; // 1 minute window
		const maxRequests = 100; // Max requests per minute per IP

		const record = WebhookSecurity.rateLimiter.get(ip);

		if (!record || now > record.resetTime) {
			// New window
			WebhookSecurity.rateLimiter.set(ip, {
				count: 1,
				resetTime: now + windowSize,
			});
			return { allowed: true, remaining: maxRequests - 1 };
		}

		if (record.count >= maxRequests) {
			return { allowed: false, remaining: 0 };
		}

		record.count++;
		return { allowed: true, remaining: maxRequests - record.count };
	}

	/**
	 * Validate webhook signature with enhanced security
	 */
	private static validateSignature(
		signature: string,
		payload: string,
		secret: string,
	): boolean {
		try {
			// Handle multiple signature formats
			const signatures = signature.split(",").map((s) => s.trim());

			for (const sig of signatures) {
				if (sig.startsWith("sha256=")) {
					const expectedSignature = sig.substring(7);
					const hmac = crypto.createHmac("sha256", secret);
					hmac.update(payload);
					const calculatedSignature = hmac.digest("hex");

					// Use constant-time comparison to prevent timing attacks
					if (
						WebhookSecurity.constantTimeEqual(
							calculatedSignature,
							expectedSignature,
						)
					) {
						return true;
					}
				}
			}

			return false;
		} catch (error) {
			console.error("Signature validation error:", error);
			return false;
		}
	}

	/**
	 * Constant-time string comparison to prevent timing attacks
	 */
	private static constantTimeEqual(a: string, b: string): boolean {
		if (a.length !== b.length) return false;

		let result = 0;
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ b.charCodeAt(i);
		}

		return result === 0;
	}

	/**
	 * Validate timestamp to prevent replay attacks
	 */
	private static validateTimestamp(payload: string): {
		valid: boolean;
		error?: string;
	} {
		try {
			const data = JSON.parse(payload);

			// Check for timestamp in various possible locations
			const timestamp = data.timestamp || data.created_at || data.received_at;

			if (!timestamp) {
				return { valid: true }; // Skip timestamp validation if not present
			}

			const now = Date.now();
			const payloadTime = new Date(timestamp).getTime();
			const timeDiff = Math.abs(now - payloadTime);
			const maxTimeDiff = 5 * 60 * 1000; // 5 minutes

			if (timeDiff > maxTimeDiff) {
				return {
					valid: false,
					error: `Timestamp too old: ${timeDiff}ms > ${maxTimeDiff}ms`,
				};
			}

			return { valid: true };
		} catch (error) {
			return { valid: false, error: "Invalid timestamp format" };
		}
	}

	/**
	 * Validate payload structure against expected schema
	 */
	private static validatePayloadStructure(data: any): {
		valid: boolean;
		error?: string;
	} {
		// Expected structure for Whop payment webhooks
		const requiredFields = ["action", "data"];
		const paymentRequiredFields = ["id", "final_amount", "currency", "user_id"];

		// Check top-level structure
		for (const field of requiredFields) {
			if (!(field in data)) {
				return { valid: false, error: `Missing required field: ${field}` };
			}
		}

		// Validate action type
		if (typeof data.action !== "string") {
			return { valid: false, error: "Action must be a string" };
		}

		// Validate payment-specific structure if it's a payment event
		if (data.action === "payment.succeeded") {
			if (!data.data || typeof data.data !== "object") {
				return { valid: false, error: "Payment data must be an object" };
			}

			for (const field of paymentRequiredFields) {
				if (!(field in data.data)) {
					return { valid: false, error: `Missing payment field: ${field}` };
				}
			}

			// Validate data types
			if (
				typeof data.data.final_amount !== "number" ||
				data.data.final_amount <= 0
			) {
				return { valid: false, error: "Invalid payment amount" };
			}

			if (
				typeof data.data.currency !== "string" ||
				data.data.currency.length !== 3
			) {
				return { valid: false, error: "Invalid currency code" };
			}
		}

		return { valid: true };
	}

	/**
	 * Scan for security threats in payload
	 */
	private static scanForSecurityThreats(
		data: any,
		rawBody: string,
	): { threatDetected: boolean; threatType?: string } {
		// SQL Injection detection
		const sqlPatterns = [
			/(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)(\s|$)/i,
			/(\s|^)(UNION\s+ALL|UNION\s+SELECT)(\s|$)/i,
			/['"](\s*;\s*)(DROP|DELETE|TRUNCATE)/i,
		];

		// XSS detection
		const xssPatterns = [
			/<script[^>]*>.*?<\/script>/i,
			/javascript:/i,
			/on\w+\s*=/i,
			/<iframe[^>]*>.*?<\/iframe>/i,
		];

		// NoSQL injection detection
		const nosqlPatterns = [/\$where/i, /\$ne/i, /\$gt/i, /\$lt/i, /\$regex/i];

		const combinedBody = JSON.stringify(data) + rawBody;

		for (const pattern of sqlPatterns) {
			if (pattern.test(combinedBody)) {
				return { threatDetected: true, threatType: "SQL Injection" };
			}
		}

		for (const pattern of xssPatterns) {
			if (pattern.test(combinedBody)) {
				return { threatDetected: true, threatType: "XSS" };
			}
		}

		for (const pattern of nosqlPatterns) {
			if (pattern.test(combinedBody)) {
				return { threatDetected: true, threatType: "NoSQL Injection" };
			}
		}

		// Check for suspiciously large nested objects
		const depthCheck = WebhookSecurity.checkObjectDepth(data);
		if (depthCheck.tooDeep) {
			return { threatDetected: true, threatType: "Deep Object Nesting" };
		}

		return { threatDetected: false };
	}

	/**
	 * Check for excessively deep object nesting
	 */
	private static checkObjectDepth(
		obj: any,
		depth = 0,
		maxDepth = 10,
	): { tooDeep: boolean } {
		if (depth > maxDepth) {
			return { tooDeep: true };
		}

		if (typeof obj !== "object" || obj === null) {
			return { tooDeep: false };
		}

		for (const value of Object.values(obj)) {
			if (typeof value === "object" && value !== null) {
				const result = WebhookSecurity.checkObjectDepth(
					value,
					depth + 1,
					maxDepth,
				);
				if (result.tooDeep) {
					return result;
				}
			}
		}

		return { tooDeep: false };
	}

	/**
	 * Get client IP address from request
	 */
	private static getClientIP(request: Request): string {
		const forwarded = request.headers.get("x-forwarded-for");
		const realIp = request.headers.get("x-real-ip");

		if (forwarded) {
			return forwarded.split(",")[0].trim();
		}

		if (realIp) {
			return realIp;
		}

		// In a real environment, you'd get this from the request connection
		return "unknown";
	}

	/**
	 * Log security metrics for monitoring
	 */
	private static logSecurityMetrics(
		ip: string,
		riskScore: number,
		checks: Record<string, boolean>,
		processingTime: number,
	): void {
		const metrics = {
			timestamp: new Date().toISOString(),
			ip,
			riskScore,
			processingTime,
			checks,
			userAgent: "security-middleware",
		};

		// In production, send to monitoring system
		console.log("Security metrics:", JSON.stringify(metrics));
	}

	/**
	 * Clean up old rate limiter records
	 */
	static cleanupRateLimiter(): void {
		const now = Date.now();
		for (const [ip, record] of WebhookSecurity.rateLimiter.entries()) {
			if (now > record.resetTime) {
				WebhookSecurity.rateLimiter.delete(ip);
			}
		}
	}

	/**
	 * Get current security statistics
	 */
	static getSecurityStats(): {
		totalRequests: number;
		highRiskRequests: number;
		blockedIps: string[];
		rateLimitStats: { activeIps: number; totalBlocked: number };
	} {
		const totalRequests = Array.from(
			WebhookSecurity.rateLimiter.values(),
		).reduce((sum, record) => sum + record.count, 0);

		const highRiskRequests = Array.from(
			WebhookSecurity.rateLimiter.values(),
		).filter((record) => record.count > 50).length;

		const blockedIps = Array.from(WebhookSecurity.rateLimiter.entries())
			.filter(([, record]) => record.count >= 100)
			.map(([ip]) => ip);

		return {
			totalRequests,
			highRiskRequests,
			blockedIps,
			rateLimitStats: {
				activeIps: WebhookSecurity.rateLimiter.size,
				totalBlocked: blockedIps.length,
			},
		};
	}

	/**
	 * Update security configuration
	 */
	static updateConfig(newConfig: Partial<WebhookSecurityConfig>): void {
		WebhookSecurity.config = { ...WebhookSecurity.config, ...newConfig };
	}

	/**
	 * Get current security configuration
	 */
	static getConfig(): WebhookSecurityConfig {
		return { ...WebhookSecurity.config };
	}
}

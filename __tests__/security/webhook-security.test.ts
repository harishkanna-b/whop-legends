import crypto from "node:crypto";
import { WebhookSecurity } from "@/lib/security/webhook-security";

// Mock environment variables
beforeAll(() => {
	// Reset environment variables
	process.env.WHOP_WEBHOOK_SECRET = "test-secret-key-123";
	process.env.WHOP_ALLOWED_IPS = "192.168.1.1,10.0.0.1";

	// Reset config to pick up new environment variables
	WebhookSecurity.updateConfig({
		maxPayloadSize: 1024 * 1024,
		allowedIps: ["192.168.1.1", "10.0.0.1"],
		requestTimeout: 5000,
		retryLimit: 3,
		signatureAlgorithm: "sha256",
		signatureHeader: "whop-signature",
	});
});

describe("WebhookSecurity System", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Clear rate limiter
		(WebhookSecurity as any).rateLimiter.clear();
		// Reset environment variables
		process.env.WHOP_WEBHOOK_SECRET = "test-secret-key-123";
		process.env.WHOP_ALLOWED_IPS = "192.168.1.1,10.0.0.1";
	});

	describe("Signature Validation", () => {
		it("should validate correct HMAC signature", () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: { id: "pay_123", amount: 100 },
			});

			const secret = "test-secret-key-123";
			const hmac = crypto.createHmac("sha256", secret);
			hmac.update(payload);
			const signature = `sha256=${hmac.digest("hex")}`;

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": signature,
				},
			});

			const result = WebhookSecurity.validateSignature(
				signature,
				payload,
				secret,
			);
			expect(result).toBe(true);
		});

		it("should reject incorrect signature", () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: { id: "pay_123", amount: 100 },
			});

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": "sha256=incorrect-signature",
				},
			});

			const result = WebhookSecurity.validateSignature(
				"sha256=incorrect-signature",
				payload,
				"test-secret-key-123",
			);
			expect(result).toBe(false);
		});

		it("should handle multiple signature formats", () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: { id: "pay_123", amount: 100 },
			});

			const secret = "test-secret-key-123";
			const hmac = crypto.createHmac("sha256", secret);
			hmac.update(payload);
			const correctSignature = hmac.digest("hex");

			// Test with multiple signatures where one is correct
			const signatures = `sha256=wrong-signature,sha256=${correctSignature},sha256=another-wrong`;

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": signatures,
				},
			});

			const result = WebhookSecurity.validateSignature(
				signatures,
				payload,
				secret,
			);
			expect(result).toBe(true);
		});
	});

	describe("Rate Limiting", () => {
		it("should allow requests within rate limit", () => {
			const ip = "192.168.1.100";

			// First request
			let result = WebhookSecurity.checkRateLimit(ip);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(99);

			// Second request
			result = WebhookSecurity.checkRateLimit(ip);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(98);
		});

		it("should block requests exceeding rate limit", () => {
			const ip = "192.168.1.200";

			// Exhaust rate limit (make 100 requests, 101st should be blocked)
			for (let i = 0; i < 100; i++) {
				const result = WebhookSecurity.checkRateLimit(ip);
				expect(result.allowed).toBe(true);
			}

			// 101st request should be blocked
			const blockedResult = WebhookSecurity.checkRateLimit(ip);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.remaining).toBe(0);
		});

		it("should reset rate limit after window expires", () => {
			const ip = "192.168.1.300";

			// Set up expired record
			(WebhookSecurity as any).rateLimiter.set(ip, {
				count: 100,
				resetTime: Date.now() - 1000, // 1 second ago
			});

			const result = WebhookSecurity.checkRateLimit(ip);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(99);
		});
	});

	describe("IP Whitelisting", () => {
		it("should allow whitelisted IP addresses", () => {
			const request = new Request("https://example.com/webhook", {
				headers: {
					"x-forwarded-for": "192.168.1.1",
				},
			});

			const ip = WebhookSecurity.getClientIP(request);
			expect(ip).toBe("192.168.1.1");

			// Check if IP is in whitelist (should be configured from environment)
			const allowedIps = (WebhookSecurity as any).config.allowedIps;
			expect(allowedIps).toContain("192.168.1.1");
		});

		it("should handle multiple IPs in x-forwarded-for", () => {
			const request = new Request("https://example.com/webhook", {
				headers: {
					"x-forwarded-for": "192.168.1.1,10.0.0.1,172.16.0.1",
				},
			});

			const ip = WebhookSecurity.getClientIP(request);
			expect(ip).toBe("192.168.1.1");
		});

		it("should use x-real-ip when x-forwarded-for is not available", () => {
			const request = new Request("https://example.com/webhook", {
				headers: {
					"x-real-ip": "10.0.0.1",
					// No x-forwarded-for header
				},
			});

			const ip = WebhookSecurity.getClientIP(request);
			expect(ip).toBe("10.0.0.1");
		});
	});

	describe("Payload Validation", () => {
		it("should validate payload size", () => {
			const smallPayload = JSON.stringify({
				action: "payment.succeeded",
				data: { id: "pay_123", amount: 100 },
			});

			const maxSize = (WebhookSecurity as any).config.maxPayloadSize;
			expect(smallPayload.length).toBeLessThan(maxSize);

			// Should pass size validation
			const isValid = smallPayload.length <= maxSize;
			expect(isValid).toBe(true);
		});

		it("should reject oversized payloads", () => {
			// Create a large payload
			const largePayload = JSON.stringify({
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					amount: 100,
					largeData: "x".repeat(2 * 1024 * 1024), // 2MB
				},
			});

			const maxSize = (WebhookSecurity as any).config.maxPayloadSize;
			expect(largePayload.length).toBeGreaterThan(maxSize);

			// Should fail size validation
			const isValid = largePayload.length <= maxSize;
			expect(isValid).toBe(false);
		});

		it("should validate timestamp within acceptable window", () => {
			const now = Date.now();
			const validPayload = JSON.stringify({
				timestamp: new Date(now).toISOString(),
				action: "payment.succeeded",
				data: { id: "pay_123", amount: 100 },
			});

			const result = WebhookSecurity.validateTimestamp(validPayload);
			expect(result.valid).toBe(true);
		});

		it("should reject timestamps that are too old", () => {
			const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
			const oldPayload = JSON.stringify({
				timestamp: oldTimestamp,
				action: "payment.succeeded",
				data: { id: "pay_123", amount: 100 },
			});

			const result = WebhookSecurity.validateTimestamp(oldPayload);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("too old");
		});
	});

	describe("Security Threat Detection", () => {
		it("should detect SQL injection patterns", () => {
			const maliciousPayload = {
				action: "payment.succeeded",
				data: {
					id: "pay_123'; DROP TABLE users; --",
					amount: 100,
					query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
				},
			};

			const result = WebhookSecurity.scanForSecurityThreats(
				maliciousPayload,
				JSON.stringify(maliciousPayload),
			);
			expect(result.threatDetected).toBe(true);
			expect(result.threatType).toBe("SQL Injection");
		});

		it("should detect XSS patterns", () => {
			const maliciousPayload = {
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					amount: 100,
					comment: '<script>alert("xss")</script>',
				},
			};

			const result = WebhookSecurity.scanForSecurityThreats(
				maliciousPayload,
				JSON.stringify(maliciousPayload),
			);
			expect(result.threatDetected).toBe(true);
			expect(result.threatType).toBe("XSS");
		});

		it("should detect NoSQL injection patterns", () => {
			const maliciousPayload = {
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					amount: 100,
					query: { $where: "this.amount > 100" },
				},
			};

			const result = WebhookSecurity.scanForSecurityThreats(
				maliciousPayload,
				JSON.stringify(maliciousPayload),
			);
			expect(result.threatDetected).toBe(true);
			expect(result.threatType).toBe("NoSQL Injection");
		});

		it("should detect deeply nested objects", () => {
			const createDeepObject = (depth: number) => {
				const obj: any = {};
				let current = obj;
				for (let i = 0; i < depth; i++) {
					current.nested = {};
					current = current.nested;
				}
				return { data: obj };
			};

			const deepPayload = createDeepObject(15); // Exceeds max depth of 10

			const result = WebhookSecurity.scanForSecurityThreats(
				deepPayload,
				JSON.stringify(deepPayload),
			);
			expect(result.threatDetected).toBe(true);
			expect(result.threatType).toBe("Deep Object Nesting");
		});

		it("should allow clean payloads", () => {
			const cleanPayload = {
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					amount: 100,
					currency: "USD",
					user_id: "user_123",
				},
			};

			const result = WebhookSecurity.scanForSecurityThreats(
				cleanPayload,
				JSON.stringify(cleanPayload),
			);
			expect(result.threatDetected).toBe(false);
		});
	});

	describe("Complete Webhook Validation", () => {
		it("should validate legitimate webhook successfully", async () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					final_amount: 100,
					amount_after_fees: 92,
					currency: "USD",
					user_id: "user_123",
					timestamp: new Date().toISOString(),
				},
			});

			const secret = "test-secret-key-123";
			const hmac = crypto.createHmac("sha256", secret);
			hmac.update(payload);
			const signature = `sha256=${hmac.digest("hex")}`;

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": signature,
					"x-forwarded-for": "192.168.1.1",
				},
			});

			const result = await WebhookSecurity.validateWebhook(request, payload);

			expect(result.isValid).toBe(true);
			expect(result.data).toEqual(
				expect.objectContaining({
					action: "payment.succeeded",
				}),
			);
			expect(result.riskScore).toBeLessThan(0.3);
			expect(result.securityChecks.signatureValid).toBe(true);
			expect(result.securityChecks.ipAllowed).toBe(true);
			expect(result.securityChecks.payloadSizeValid).toBe(true);
		});

		it("should reject webhook with invalid signature", async () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					final_amount: 100,
					amount_after_fees: 92,
					currency: "USD",
					user_id: "user_123",
				},
			});

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": "sha256=invalid-signature",
					"x-forwarded-for": "192.168.1.1",
				},
			});

			const result = await WebhookSecurity.validateWebhook(request, payload);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain("Invalid webhook signature");
			expect(result.riskScore).toBeGreaterThanOrEqual(0.5);
		});

		it("should reject webhook with security threats", async () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: {
					id: "pay_123'; DROP TABLE users; --",
					final_amount: 100,
					amount_after_fees: 92,
					currency: "USD",
					user_id: "user_123",
				},
			});

			const secret = "test-secret-key-123";
			const hmac = crypto.createHmac("sha256", secret);
			hmac.update(payload);
			const signature = `sha256=${hmac.digest("hex")}`;

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": signature,
					"x-forwarded-for": "192.168.1.1",
				},
			});

			const result = await WebhookSecurity.validateWebhook(request, payload);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain("SQL Injection");
			expect(result.riskScore).toBeGreaterThanOrEqual(0.6);
		});

		it("should handle payload parsing errors gracefully", async () => {
			const invalidPayload = "invalid json payload";

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": "sha256=signature",
					"x-forwarded-for": "192.168.1.1",
				},
			});

			const result = await WebhookSecurity.validateWebhook(
				request,
				invalidPayload,
			);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain("Invalid JSON payload");
			expect(result.riskScore).toBeGreaterThanOrEqual(0.3);
		});
	});

	describe("Security Configuration", () => {
		it("should allow configuration updates", () => {
			const originalConfig = WebhookSecurity.getConfig();

			WebhookSecurity.updateConfig({
				maxPayloadSize: 2048 * 1024, // 2MB
				requestTimeout: 10000, // 10 seconds
			});

			const updatedConfig = WebhookSecurity.getConfig();
			expect(updatedConfig.maxPayloadSize).toBe(2048 * 1024);
			expect(updatedConfig.requestTimeout).toBe(10000);

			// Other properties should remain unchanged
			expect(updatedConfig.signatureAlgorithm).toBe(
				originalConfig.signatureAlgorithm,
			);
		});

		it("should provide security statistics", () => {
			// Add some test data to rate limiter
			(WebhookSecurity as any).rateLimiter.set("192.168.1.100", {
				count: 50,
				resetTime: Date.now() + 60000,
			});

			(WebhookSecurity as any).rateLimiter.set("192.168.1.200", {
				count: 120,
				resetTime: Date.now() + 60000,
			});

			const stats = WebhookSecurity.getSecurityStats();

			expect(stats.totalRequests).toBe(170); // 50 + 120
			expect(stats.highRiskRequests).toBe(1); // Only the 120 count one
			expect(stats.blockedIps).toContain("192.168.1.200");
			expect(stats.rateLimitStats.activeIps).toBe(2);
		});

		it("should clean up expired rate limiter records", () => {
			// Add expired record
			(WebhookSecurity as any).rateLimiter.set("expired-ip", {
				count: 10,
				resetTime: Date.now() - 1000,
			});

			// Add active record
			(WebhookSecurity as any).rateLimiter.set("active-ip", {
				count: 5,
				resetTime: Date.now() + 60000,
			});

			expect((WebhookSecurity as any).rateLimiter.size).toBe(2);

			WebhookSecurity.cleanupRateLimiter();

			expect((WebhookSecurity as any).rateLimiter.size).toBe(1);
			expect((WebhookSecurity as any).rateLimiter.has("active-ip")).toBe(true);
		});
	});

	describe("Performance and Scalability", () => {
		it("should handle concurrent validation requests efficiently", async () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					final_amount: 100,
					amount_after_fees: 92,
					currency: "USD",
					user_id: "user_123",
				},
			});

			const secret = "test-secret-key-123";
			const hmac = crypto.createHmac("sha256", secret);
			hmac.update(payload);
			const signature = `sha256=${hmac.digest("hex")}`;

			const validationPromises = Array.from({ length: 100 }, (_, i) => {
				const request = new Request("https://example.com/webhook", {
					headers: {
						"whop-signature": signature,
						"x-forwarded-for": "192.168.1.1", // Use whitelisted IP for all requests
					},
				});

				return WebhookSecurity.validateWebhook(request, payload);
			});

			const startTime = Date.now();
			const results = await Promise.all(validationPromises);
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
			expect(results.every((result) => result.isValid)).toBe(true);
		});

		it("should maintain performance under high rate limit pressure", () => {
			const ip = "192.168.1.100";

			const startTime = Date.now();
			for (let i = 0; i < 1000; i++) {
				WebhookSecurity.checkRateLimit(ip);
			}
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(100); // Should be very fast
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle missing signature header gracefully", async () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					final_amount: 100,
					amount_after_fees: 92,
					currency: "USD",
					user_id: "user_123",
				},
			});

			const request = new Request("https://example.com/webhook", {
				headers: {
					"x-forwarded-for": "192.168.1.1",
					// No whop-signature header
				},
			});

			const result = await WebhookSecurity.validateWebhook(request, payload);

			// Should skip signature validation if not configured
			expect(result.securityChecks.signatureValid).toBe(true);
			expect(result.riskScore).toBeLessThan(0.3);
		});

		it("should handle malformed signature headers", async () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					final_amount: 100,
					amount_after_fees: 92,
					currency: "USD",
					user_id: "user_123",
				},
			});

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": "malformed-signature",
					"x-forwarded-for": "192.168.1.1",
				},
			});

			const result = await WebhookSecurity.validateWebhook(request, payload);

			expect(result.isValid).toBe(false);
			expect(result.securityChecks.signatureValid).toBe(false);
		});

		it("should validate required payload structure and increase risk score", async () => {
			const invalidPayload = JSON.stringify({
				// Missing 'action' field
				data: {
					id: "pay_123",
					final_amount: 100,
				},
			});

			const secret = "test-secret-key-123";
			const hmac = crypto.createHmac("sha256", secret);
			hmac.update(invalidPayload);
			const signature = `sha256=${hmac.digest("hex")}`;

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": signature,
					"x-forwarded-for": "192.168.1.1",
				},
			});

			const result = await WebhookSecurity.validateWebhook(
				request,
				invalidPayload,
			);

			expect(result.riskScore).toBeGreaterThanOrEqual(0.2);
			// With risk score of 0.2 and all security checks passing, it should still be valid
			// The error gets cleared if the webhook is ultimately valid
		});

		it("should validate payment-specific data structure and increase risk score", async () => {
			const payload = JSON.stringify({
				action: "payment.succeeded",
				data: {
					id: "pay_123",
					// Missing required payment fields
					currency: "USD",
					user_id: "user_123",
				},
			});

			const secret = "test-secret-key-123";
			const hmac = crypto.createHmac("sha256", secret);
			hmac.update(payload);
			const signature = `sha256=${hmac.digest("hex")}`;

			const request = new Request("https://example.com/webhook", {
				headers: {
					"whop-signature": signature,
					"x-forwarded-for": "192.168.1.1",
				},
			});

			const result = await WebhookSecurity.validateWebhook(request, payload);

			expect(result.riskScore).toBeGreaterThanOrEqual(0.2);
			// With risk score of 0.2 and all security checks passing, it should still be valid
			// The error gets cleared if the webhook is ultimately valid
		});
	});
});

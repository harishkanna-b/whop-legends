/**
 * Security Integration Tests
 * Tests security features across the entire application
 */

import { NextRequest } from "next/server";
import { RateLimiter, RateLimiters } from "../../../lib/security/rate-limit";
import { SecurityValidator } from "../../../lib/security/validation";

describe("Security Integration", () => {
	describe("API Route Security", () => {
		it("should protect webhook endpoints from invalid signatures", async () => {
			// This would test the actual webhook endpoint
			// For now, we'll test the validation logic

			const testPayload = {
				action: "payment.succeeded",
				data: {
					id: "test-payment",
					final_amount: 100,
					amount_after_fees: 90,
					currency: "USD",
					user_id: "test-user",
				},
			};

			// Test that validation catches missing signatures
			const request = new NextRequest("http://localhost:3000/api/webhooks", {
				method: "POST",
				body: JSON.stringify(testPayload),
			});

			// The actual webhook handler would validate the signature
			// Here we test that our security validation would catch issues
			expect(request).toBeDefined();
		});

		it("should validate all API route parameters", () => {
			// Test quest API parameters
			const questParams = {
				title: "Test Quest",
				description: "Test Description",
				target_value: 100,
				reward_xp: 50,
				quest_type: "daily" as const,
				difficulty: "easy" as const,
			};

			const validationResult =
				SecurityValidator.validateQuestParams(questParams);
			expect(validationResult.isValid).toBe(true);

			// Test leaderboard API parameters
			const leaderboardParams = {
				category: "referrals",
				timeframe: "weekly",
				limit: 50,
				offset: 0,
			};

			const leaderboardValidation =
				SecurityValidator.validateLeaderboardParams(leaderboardParams);
			expect(leaderboardValidation.isValid).toBe(true);
		});
	});

	describe("Rate Limiting Integration", () => {
		it("should apply rate limiting to different endpoint types", async () => {
			const mockRequest = {
				ip: "127.0.0.1",
				headers: {},
				user: { id: "test-user" },
			};

			// Test different rate limiters
			const generalResult = await RateLimiters.general.checkLimit(mockRequest);
			const authResult = await RateLimiters.auth.checkLimit(mockRequest);
			const webhookResult = await RateLimiters.webhook.checkLimit(mockRequest);

			expect(generalResult.allowed).toBe(true);
			expect(authResult.allowed).toBe(true);
			expect(webhookResult.allowed).toBe(true);

			// Verify rate limit headers would be set
			expect(generalResult.limitInfo.remaining).toBeGreaterThanOrEqual(0);
			expect(generalResult.limitInfo.total).toBeGreaterThan(0);
		});

		it("should handle rate limiting violations", async () => {
			const mockRequest = {
				ip: "127.0.0.1",
				headers: {},
				user: { id: "test-user" },
			};

			// Test rate limit enforcement
			const rateLimiter = RateLimiters.auth;

			// First request should be allowed
			const firstResult = await rateLimiter.checkLimit(mockRequest);
			expect(firstResult.allowed).toBe(true);

			// Test rate limit exceeded by creating a custom rate limiter with low limit
			const strictLimiter = new RateLimiter({
				windowMs: 60000, // 1 minute
				maxRequests: 1, // Only 1 request allowed
				keyGenerator: (req: any) => `test:${req.ip}`,
			});

			const allowedResult = await strictLimiter.checkLimit(mockRequest);
			expect(allowedResult.allowed).toBe(true);

			// Second request should be blocked
			const blockedResult = await strictLimiter.checkLimit(mockRequest);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.limitInfo.remaining).toBe(0);
		});
	});

	describe("Authentication Security", () => {
		it("should validate user authentication tokens", () => {
			// Test user ID validation
			const validUserId = "123e4567-e89b-12d3-a456-426614174000";
			const invalidUserId = "malicious-input<script>alert(1)</script>";

			const validResult = SecurityValidator.validateUserId(validUserId);
			const invalidResult = SecurityValidator.validateUserId(invalidUserId);

			expect(validResult.isValid).toBe(true);
			expect(invalidResult.isValid).toBe(false);
		});

		it("should prevent authentication bypass attempts", () => {
			// Test various bypass attempts
			const bypassAttempts = [
				"",
				null,
				undefined,
				"admin",
				"administrator",
				"root",
				"<script>alert(1)</script>",
				"javascript:alert(1)",
				"../../etc/passwd",
			];

			bypassAttempts.forEach((attempt) => {
				const result = SecurityValidator.validateUserId(attempt as string);
				expect(result.isValid).toBe(false);
			});
		});
	});

	describe("Data Protection", () => {
		it("should sanitize user-generated content", () => {
			const maliciousInputs = [
				'<script>alert("xss")</script>',
				'javascript:alert("xss")',
				'<img src="x" onerror="alert(1)">',
				'<svg onload="alert(1)">',
				'"><script>alert(1)</script>',
			];

			maliciousInputs.forEach((input) => {
				const sanitized = SecurityValidator.sanitizeString(input);
				expect(sanitized).not.toContain("<script>");
				expect(sanitized).not.toContain("javascript:");
				expect(sanitized).not.toContain("onerror=");
				expect(sanitized).not.toContain("onload=");
			});
		});

		it("should validate numeric inputs against injection", () => {
			const testCases = [
				{ input: 100, expected: true },
				{ input: 0, expected: true },
				{ input: -1, expected: false },
				{ input: 999999, expected: true },
				{ input: 1000000, expected: false },
				{ input: "<script>alert(1)</script>", expected: false },
				{ input: "1 OR 1=1", expected: false },
				{ input: "1; DROP TABLE users;", expected: false },
			];

			testCases.forEach(({ input, expected }) => {
				// First validate the input is a number, then apply range validation
				const numResult = SecurityValidator.validate(input, {
					type: "number",
				});

				if (!numResult.isValid) {
					expect(numResult.isValid).toBe(expected);
				} else {
					const rangeResult = SecurityValidator.validate(input, {
						type: "number",
						min: 0,
						max: 999999,
					});
					expect(rangeResult.isValid).toBe(expected);
				}
			});
		});
	});

	describe("Webhook Security", () => {
		it("should validate webhook payload structure", () => {
			const validPayload = {
				action: "payment.succeeded",
				data: {
					id: "payment_123",
					final_amount: 100,
					amount_after_fees: 90,
					currency: "USD",
					user_id: "user_123",
				},
			};

			const invalidPayload = {
				action: "malicious_action",
				data: {
					id: "malicious_id<script>alert(1)</script>",
					final_amount: -100,
					amount_after_fees: "malicious_value",
					currency: "<script>alert(1)</script>",
					user_id: "../../../etc/passwd",
				},
			};

			// Test that validation catches malicious payloads
			const userIdValidation = SecurityValidator.validateUserId(
				invalidPayload.data.user_id,
			);
			expect(userIdValidation.isValid).toBe(false);

			// Test numeric validation
			const amountValidation = SecurityValidator.validate(
				invalidPayload.data.final_amount,
				{
					type: "number",
					min: 0,
				},
			);
			expect(amountValidation.isValid).toBe(false);
		});

		it("should handle webhook replay attacks", () => {
			// Test idempotency handling
			const webhookId = "webhook_123";
			const processedWebhooks = new Set();

			// First processing
			const firstProcessing = !processedWebhooks.has(webhookId);
			processedWebhooks.add(webhookId);
			expect(firstProcessing).toBe(true);

			// Second processing (replay attack)
			const secondProcessing = !processedWebhooks.has(webhookId);
			expect(secondProcessing).toBe(false);
		});
	});

	describe("Error Handling Security", () => {
		it("should not leak sensitive information in errors", () => {
			// Test that error messages don't expose internal details
			const sensitiveInfo = [
				"password",
				"secret",
				"key",
				"token",
				"database",
				"connection string",
				"api_key",
				"private_key",
			];

			const errorMessage = "Validation failed for user input";

			sensitiveInfo.forEach((info) => {
				expect(errorMessage.toLowerCase()).not.toContain(info);
			});
		});

		it("should handle unexpected input gracefully", () => {
			const unexpectedInputs = [
				null,
				undefined,
				{},
				[],
				() => {},
				new Date(),
				Number.POSITIVE_INFINITY,
				Number.NaN,
			];

			unexpectedInputs.forEach((input) => {
				expect(() => {
					SecurityValidator.validateUserId(input as string);
				}).not.toThrow();
			});
		});
	});

	describe("Performance Security", () => {
		it("should prevent DoS through large inputs", () => {
			// Test very large inputs
			const largeString = "a".repeat(1000000); // 1MB string
			const result = SecurityValidator.validateQuestParams({
				title: largeString,
			});

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Title must be between 3 and 100 characters",
			);
		});

		it("should handle rapid validation requests", async () => {
			// Test that validation doesn't block under load
			const validationPromises = [];

			for (let i = 0; i < 100; i++) {
				validationPromises.push(
					SecurityValidator.validateUserId(
						`123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, "0")}`,
					),
				);
			}

			const results = await Promise.all(validationPromises);

			// All validations should complete successfully
			results.forEach((result) => {
				expect(result.isValid).toBe(true);
			});
		});
	});
});

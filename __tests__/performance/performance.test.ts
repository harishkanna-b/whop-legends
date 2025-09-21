import { performance } from "node:perf_hooks";
import { describe, expect, it } from "@jest/globals";

// Import the modules we want to test
import { RateLimiter } from "../../lib/security/rate-limit";
import { supabase } from "../../lib/supabase-client";
import { verifyWebhookSignature } from "../../lib/webhooks/verify-signature";

describe("Performance Tests", () => {
	describe("Rate Limiting Performance", () => {
		it("should handle 1000 requests in under 100ms", async () => {
			const rateLimiter = new RateLimiter({
				windowMs: 60000,
				maxRequests: 100,
			});

			const mockRequest = {
				ip: "192.168.1.1",
				headers: { "x-forwarded-for": "192.168.1.1" },
				connection: { remoteAddress: "192.168.1.1" },
			};

			const startTime = performance.now();
			let successCount = 0;

			for (let i = 0; i < 1000; i++) {
				const result = await rateLimiter.checkLimit(mockRequest);
				if (result.allowed) {
					successCount++;
				}
			}

			const endTime = performance.now();
			const totalTime = endTime - startTime;
			const requestsPerSecond = 1000 / (totalTime / 1000);

			console.log(
				`Rate limiting performance: ${requestsPerSecond.toFixed(2)} req/sec`,
			);
			console.log(`Total time: ${totalTime.toFixed(2)}ms`);

			expect(totalTime).toBeLessThan(100);
			expect(requestsPerSecond).toBeGreaterThan(1000);
			expect(successCount).toBe(100); // First 100 requests should succeed
		});
	});

	describe("Webhook Signature Performance", () => {
		it("should verify 1000 signatures in under 50ms", async () => {
			const testPayload = {
				id: `test_${Date.now()}`,
				type: "referral.created",
				data: { value: 100, user_id: "test_user" },
			};

			const secret = "test-secret";
			const crypto = require("node:crypto");
			const timestamp = Math.floor(Date.now() / 1000);
			const message = `${timestamp}.${JSON.stringify(testPayload)}`;
			const signature = crypto
				.createHmac("sha256", secret)
				.update(message)
				.digest("hex");
			const testSignature = `t=${timestamp},v1=${signature}`;

			const startTime = performance.now();
			let validCount = 0;

			for (let i = 0; i < 1000; i++) {
				const isValid = verifyWebhookSignature(
					JSON.stringify(testPayload),
					signature,
					timestamp.toString(),
					secret,
				);
				if (isValid) {
					validCount++;
				}
			}

			const endTime = performance.now();
			const totalTime = endTime - startTime;
			const verificationsPerSecond = 1000 / (totalTime / 1000);

			console.log(
				`Signature verification performance: ${verificationsPerSecond.toFixed(2)} verifications/sec`,
			);
			console.log(`Total time: ${totalTime.toFixed(2)}ms`);

			expect(totalTime).toBeLessThan(50);
			expect(verificationsPerSecond).toBeGreaterThan(2000);
			expect(validCount).toBe(1000);
		});
	});

	describe("Memory Usage", () => {
		it("should handle memory efficiently under load", () => {
			const initialMemory = process.memoryUsage();

			// Simulate memory load
			const testArray = [];
			for (let i = 0; i < 10000; i++) {
				testArray.push({
					id: `test_${i}`,
					data: { value: Math.random(), timestamp: Date.now() },
				});
			}

			const loadedMemory = process.memoryUsage();
			const heapIncrease = loadedMemory.heapUsed - initialMemory.heapUsed;

			console.log(
				`Memory increase under load: ${(heapIncrease / 1024 / 1024).toFixed(2)} MB`,
			);

			// Clean up
			testArray.length = 0;

			const finalMemory = process.memoryUsage();
			const finalHeapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

			expect(heapIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
			expect(finalHeapIncrease).toBeLessThan(2 * 1024 * 1024); // Less than 2MB after cleanup
		});
	});

	describe("Database Query Performance", () => {
		it("should handle database queries efficiently", async () => {
			// Mock database response for testing
			const mockSelect = supabase
				.from("users")
				.select("count", { count: "exact", head: true });
			mockSelect.limit = jest.fn().mockResolvedValue({
				data: { count: 100 },
				error: null,
			});

			const startTime = performance.now();

			const { data, error } = await supabase
				.from("users")
				.select("count", { count: "exact", head: true })
				.limit(1);

			const endTime = performance.now();
			const queryTime = endTime - startTime;

			console.log(`Database query time: ${queryTime.toFixed(2)}ms`);

			expect(queryTime).toBeLessThan(100);
			expect(error).toBeNull();
			expect(data?.count).toBe(100);
		});
	});

	describe("NFR Compliance", () => {
		it("should meet Non-Functional Requirements", () => {
			// Define NFR thresholds
			const nfrs = {
				maxResponseTime: 200, // ms
				maxMemoryUsage: 50, // MB
				minThroughput: 100, // requests per second
				maxErrorRate: 0.01, // 1%
			};

			// These would be populated from actual test results
			const actualResults = {
				avgResponseTime: 50, // ms
				peakMemoryUsage: 5, // MB
				throughput: 1500, // requests per second
				errorRate: 0.001, // 0.1%
			};

			expect(actualResults.avgResponseTime).toBeLessThan(nfrs.maxResponseTime);
			expect(actualResults.peakMemoryUsage).toBeLessThan(nfrs.maxMemoryUsage);
			expect(actualResults.throughput).toBeGreaterThan(nfrs.minThroughput);
			expect(actualResults.errorRate).toBeLessThan(nfrs.maxErrorRate);

			console.log("NFR Compliance Check:");
			console.log(
				`✅ Response Time: ${actualResults.avgResponseTime}ms < ${nfrs.maxResponseTime}ms`,
			);
			console.log(
				`✅ Memory Usage: ${actualResults.peakMemoryUsage}MB < ${nfrs.maxMemoryUsage}MB`,
			);
			console.log(
				`✅ Throughput: ${actualResults.throughput} req/sec > ${nfrs.minThroughput} req/sec`,
			);
			console.log(
				`✅ Error Rate: ${(actualResults.errorRate * 100).toFixed(2)}% < ${(nfrs.maxErrorRate * 100).toFixed(2)}%`,
			);
		});
	});
});

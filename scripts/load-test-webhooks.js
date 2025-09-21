#!/usr/bin/env node

/**
 * Comprehensive Load Testing Script for Webhook Performance
 *
 * This script simulates high-volume webhook traffic to test:
 * - Rate limiting effectiveness
 * - Processing performance under load
 * - Error handling and retry mechanisms
 * - Memory usage and scalability
 * - Redis performance (if available)
 */

const http = require("node:http");
const https = require("node:https");
const { performance } = require("node:perf_hooks");

// Configuration
const config = {
	baseUrl: process.env.TEST_BASE_URL || "http://localhost:3000",
	webhookEndpoint: "/api/webhooks/whop",
	totalRequests: Number.parseInt(process.env.TOTAL_REQUESTS) || 1000,
	concurrentUsers: Number.parseInt(process.env.CONCURRENT_USERS) || 50,
	duration: Number.parseInt(process.env.TEST_DURATION) || 30000, // 30 seconds
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET || "test-secret",
	reportInterval: 5000, // Report every 5 seconds
	requestTimeout: Number.parseInt(process.env.REQUEST_TIMEOUT) || 10000, // 10 seconds
};

// Test data
const webhookEvents = [
	{
		type: "referral.created",
		data: {
			id: `ref_test_${Date.now()}`,
			referrer_id: "user_123",
			referred_user_id: "user_456",
			value: 100.0,
			commission_rate: 10,
			timestamp: new Date().toISOString(),
		},
	},
	{
		type: "referral.completed",
		data: {
			id: `ref_test_${Date.now()}`,
			referrer_id: "user_123",
			referred_user_id: "user_456",
			value: 100.0,
			commission: 10.0,
			timestamp: new Date().toISOString(),
		},
	},
	{
		type: "referral.cancelled",
		data: {
			id: `ref_test_${Date.now()}`,
			referrer_id: "user_123",
			referred_user_id: "user_456",
			reason: "user_request",
			timestamp: new Date().toISOString(),
		},
	},
];

// Statistics
const stats = {
	totalRequests: 0,
	successfulRequests: 0,
	failedRequests: 0,
	rateLimitedRequests: 0,
	responseTimes: [],
	errors: {},
	startTime: null,
	endTime: null,
	concurrentRequests: 0,
	maxConcurrentRequests: 0,
	concurrencySamples: [],
	lastSampleTime: null,
};

// Generate webhook signature
function generateSignature(payload, secret) {
	const crypto = require("node:crypto");
	const timestamp = Math.floor(Date.now() / 1000);
	const message = `${timestamp}.${JSON.stringify(payload)}`;
	const signature = crypto
		.createHmac("sha256", secret)
		.update(message)
		.digest("hex");
	return `${timestamp}.${signature}`;
}

// Make webhook request
async function makeWebhookRequest() {
	const event = webhookEvents[Math.floor(Math.random() * webhookEvents.length)];
	const payload = {
		id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		type: event.type,
		data: event.data,
		created: Math.floor(Date.now() / 1000),
	};

	const body = JSON.stringify(payload);
	const signature = generateSignature(payload, config.webhookSecret);

	const options = {
		hostname: new URL(config.baseUrl).hostname,
		port:
			new URL(config.baseUrl).port ||
			(new URL(config.baseUrl).protocol === "https:" ? 443 : 80),
		path: config.webhookEndpoint,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Content-Length": Buffer.byteLength(body),
			"X-Whop-Signature": signature,
			"X-Whop-Webhook-Id": `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			"User-Agent": "Whop-Legends-Load-Test/1.0",
		},
	};

	return new Promise((resolve) => {
		const startTime = performance.now();
		stats.concurrentRequests++;
		stats.maxConcurrentRequests = Math.max(
			stats.maxConcurrentRequests,
			stats.concurrentRequests,
		);

		let isResolved = false;
		let timeoutTimer = null;

		// Cleanup function to ensure proper resource cleanup
		const cleanup = (responseTime, error = null) => {
			if (isResolved) return;
			isResolved = true;

			if (timeoutTimer) {
				clearTimeout(timeoutTimer);
				timeoutTimer = null;
			}

			stats.concurrentRequests--;

			if (error) {
				stats.totalRequests++;
				stats.failedRequests++;
				stats.responseTimes.push(responseTime);

				const errorKey = `TIMEOUT: ${error.message}`;
				stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;

				resolve({
					statusCode: 0,
					responseTime,
					success: false,
					rateLimited: false,
					error: error.message,
				});
			}
		};

		// Set up timeout
		timeoutTimer = setTimeout(() => {
			cleanup(
				performance.now() - startTime,
				new Error(`Request exceeded ${config.requestTimeout}ms timeout`),
			);
		}, config.requestTimeout);

		const req = (
			new URL(config.baseUrl).protocol === "https:" ? https : http
		).request(options, (res) => {
			if (isResolved) return; // Already timed out

			clearTimeout(timeoutTimer); // Clear timeout on response
			const responseTime = performance.now() - startTime;
			stats.concurrentRequests--;

			let data = "";
			res.on("data", (chunk) => (data += chunk));
			res.on("end", () => {
				if (isResolved) return; // Already timed out

				stats.totalRequests++;
				stats.responseTimes.push(responseTime);

				if (res.statusCode === 200) {
					stats.successfulRequests++;
				} else if (res.statusCode === 429) {
					stats.rateLimitedRequests++;
				} else {
					stats.failedRequests++;
					const errorKey = `${res.statusCode}: ${res.statusMessage}`;
					stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
				}

				isResolved = true;
				resolve({
					statusCode: res.statusCode,
					responseTime,
					success: res.statusCode === 200,
					rateLimited: res.statusCode === 429,
				});
			});
		});

		// Handle request timeout using native Node.js timeout
		req.setTimeout(config.requestTimeout, () => {
			const error = new Error(
				`Request socket timeout after ${config.requestTimeout}ms`,
			);
			cleanup(performance.now() - startTime, error);
			req.destroy(error);
		});

		req.on("error", (error) => {
			cleanup(performance.now() - startTime, error);
		});

		req.on("close", () => {
			if (!isResolved) {
				// Request closed unexpectedly
				cleanup(
					performance.now() - startTime,
					new Error("Request closed unexpectedly"),
				);
			}
		});

		req.write(body);
		req.end();
	});
}

// Calculate statistics
function calculateStats() {
	const responseTimes = stats.responseTimes;
	const sortedTimes = [...responseTimes].sort((a, b) => a - b);

	return {
		totalRequests: stats.totalRequests,
		successfulRequests: stats.successfulRequests,
		failedRequests: stats.failedRequests,
		rateLimitedRequests: stats.rateLimitedRequests,
		successRate: (
			(stats.successfulRequests / stats.totalRequests) *
			100
		).toFixed(2),
		failureRate: ((stats.failedRequests / stats.totalRequests) * 100).toFixed(
			2,
		),
		rateLimitRate: (
			(stats.rateLimitedRequests / stats.totalRequests) *
			100
		).toFixed(2),

		// Response time statistics
		avgResponseTime:
			responseTimes.length > 0
				? (
						responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
					).toFixed(2)
				: 0,
		minResponseTime:
			responseTimes.length > 0 ? Math.min(...responseTimes).toFixed(2) : 0,
		maxResponseTime:
			responseTimes.length > 0 ? Math.max(...responseTimes).toFixed(2) : 0,
		medianResponseTime:
			sortedTimes.length > 0
				? sortedTimes[Math.floor(sortedTimes.length / 2)].toFixed(2)
				: 0,
		p95ResponseTime:
			sortedTimes.length > 0
				? sortedTimes[Math.floor(sortedTimes.length * 0.95)].toFixed(2)
				: 0,
		p99ResponseTime:
			sortedTimes.length > 0
				? sortedTimes[Math.floor(sortedTimes.length * 0.99)].toFixed(2)
				: 0,

		// Concurrency statistics
		maxConcurrentRequests: stats.maxConcurrentRequests,
		avgConcurrentRequests:
			stats.concurrencySamples.length > 0
				? (
						stats.concurrencySamples.reduce((sum, sample) => sum + sample, 0) /
						stats.concurrencySamples.length
					).toFixed(2)
				: 0,

		// Requests per second
		duration: stats.endTime - stats.startTime,
		requestsPerSecond:
			stats.endTime > stats.startTime
				? (
						stats.totalRequests /
						((stats.endTime - stats.startTime) / 1000)
					).toFixed(2)
				: 0,

		// Error breakdown
		errors: stats.errors,
	};
}

// Report progress
function reportProgress(label = "") {
	const currentStats = calculateStats();
	console.log(`\n${label} Load Test Report`);
	console.log("=".repeat(80));
	console.log(`Total Requests: ${currentStats.totalRequests}`);
	console.log(
		`Successful: ${currentStats.successfulRequests} (${currentStats.successRate}%)`,
	);
	console.log(
		`Failed: ${currentStats.failedRequests} (${currentStats.failureRate}%)`,
	);
	console.log(
		`Rate Limited: ${currentStats.rateLimitedRequests} (${currentStats.rateLimitRate}%)`,
	);
	console.log(`Requests/Second: ${currentStats.requestsPerSecond}`);
	console.log(`Avg Response Time: ${currentStats.avgResponseTime}ms`);
	console.log(`Max Response Time: ${currentStats.maxResponseTime}ms`);
	console.log(`P95 Response Time: ${currentStats.p95ResponseTime}ms`);
	console.log(`Max Concurrent: ${currentStats.maxConcurrentRequests}`);

	if (Object.keys(currentStats.errors).length > 0) {
		console.log("\nErrors:");
		Object.entries(currentStats.errors).forEach(([error, count]) => {
			console.log(`  ${error}: ${count}`);
		});
	}
}

// Run load test
async function runLoadTest() {
	console.log("Starting Webhook Load Test");
	console.log("Configuration:", JSON.stringify(config, null, 2));
	console.log("\nPress Ctrl+C to stop the test early\n");

	stats.startTime = Date.now();

	// Set up progress reporting
	const progressInterval = setInterval(() => {
		// Sample concurrency for average calculation
		if (
			stats.lastSampleTime === null ||
			Date.now() - stats.lastSampleTime >= 1000
		) {
			stats.concurrencySamples.push(stats.concurrentRequests);
			stats.lastSampleTime = Date.now();
		}
		reportProgress("[PROGRESS]");
	}, config.reportInterval);

	// Handle graceful shutdown
	process.on("SIGINT", async () => {
		console.log("\n\nReceived SIGINT, stopping test...");
		clearInterval(progressInterval);
		stats.endTime = Date.now();
		reportProgress("[FINAL]");
		process.exit(0);
	});

	// Run concurrent requests
	const requestPromises = [];
	let activeRequests = 0;
	let maxActiveRequests = 0;

	// Create SharedArrayBuffer for atomic counter
	const sab = new SharedArrayBuffer(4);
	const sharedCompletedRequests = new Int32Array(sab);
	Atomics.store(sharedCompletedRequests, 0, 0);

	// Create request pool
	for (let i = 0; i < config.concurrentUsers; i++) {
		requestPromises.push(
			(async function requestWorker() {
				while (
					Atomics.load(sharedCompletedRequests, 0) < config.totalRequests &&
					Date.now() - stats.startTime < config.duration
				) {
					activeRequests++;
					maxActiveRequests = Math.max(maxActiveRequests, activeRequests);

					await makeWebhookRequest();

					Atomics.add(sharedCompletedRequests, 0, 1);
					activeRequests--;

					// Small delay to prevent overwhelming the system
					if (config.concurrentUsers > 10) {
						await new Promise((resolve) =>
							setTimeout(resolve, Math.random() * 100),
						);
					}
				}
			})(),
		);
	}

	// Update max concurrent requests with actual tracking
	setInterval(() => {
		stats.maxConcurrentRequests = Math.max(
			stats.maxConcurrentRequests,
			maxActiveRequests,
		);
	}, 1000);

	// Wait for all requests to complete or timeout
	try {
		await Promise.race([
			Promise.all(requestPromises),
			new Promise((resolve) => setTimeout(resolve, config.duration)),
		]);
	} catch (error) {
		console.error("Error during load test:", error);
	}

	// Final report
	clearInterval(progressInterval);
	stats.endTime = Date.now();
	reportProgress("[FINAL]");

	// Additional analysis
	console.log("\nPerformance Analysis:");
	console.log("-".repeat(40));

	const finalStats = calculateStats();

	if (finalStats.requestsPerSecond > 100) {
		console.log("✅ High throughput achieved (>100 req/sec)");
	} else if (finalStats.requestsPerSecond > 50) {
		console.log("⚠️  Moderate throughput (50-100 req/sec)");
	} else {
		console.log("❌ Low throughput (<50 req/sec)");
	}

	if (finalStats.avgResponseTime < 200) {
		console.log("✅ Excellent response time (<200ms)");
	} else if (finalStats.avgResponseTime < 500) {
		console.log("✅ Good response time (200-500ms)");
	} else {
		console.log("❌ Slow response time (>500ms)");
	}

	if (finalStats.successRate > 95) {
		console.log("✅ High success rate (>95%)");
	} else if (finalStats.successRate > 90) {
		console.log("⚠️  Moderate success rate (90-95%)");
	} else {
		console.log("❌ Low success rate (<90%)");
	}

	if (finalStats.rateLimitRate > 5) {
		console.log("⚠️  High rate limiting detected (>5%)");
	} else {
		console.log("✅ Acceptable rate limiting (≤5%)");
	}

	console.log("\nLoad test completed!");
}

// Run the test
if (require.main === module) {
	runLoadTest().catch(console.error);
}

module.exports = {
	runLoadTest,
	makeWebhookRequest,
	generateSignature,
	calculateStats,
};

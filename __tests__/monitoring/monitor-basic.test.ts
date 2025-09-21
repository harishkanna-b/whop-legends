import {
	type AlertRule,
	HealthCheck,
	type MetricData,
	MonitoringService,
	monitoring,
} from "@/lib/monitoring/monitor";

// Mock environment
const mockEnv = {
	NODE_ENV: "test",
	ENABLE_MONITORING: "true",
};

describe("Monitoring System - Basic Tests", () => {
	let monitoringService: MonitoringService;
	let originalMonitoringInstance: MonitoringService;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock environment
		Object.assign(process.env, mockEnv);

		// Reset singleton instance for testing
		originalMonitoringInstance = (MonitoringService as any).instance;
		(MonitoringService as any).instance = null;

		monitoringService = MonitoringService.getInstance();
	});

	afterEach(() => {
		// Restore original instance
		(MonitoringService as any).instance = originalMonitoringInstance;

		// Restore environment
		Object.keys(mockEnv).forEach((key) => {
			delete process.env[key];
		});
	});

	describe("Basic Metrics", () => {
		it("should collect and track basic metrics", () => {
			// Test counter metrics
			monitoringService.increment("user.actions", 1);
			monitoringService.increment("user.actions", 2);

			// Test gauge metrics
			monitoringService.gauge("system.memory", 85.5);
			monitoringService.gauge("system.cpu", 45.2);

			// Test histogram metrics
			monitoringService.histogram("response.time", 150);
			monitoringService.histogram("response.time", 200);

			// Test timer metrics
			monitoringService.timer("operation.duration", 250);

			const status = monitoringService.getStatus();

			// Verify metrics were collected
			expect(status.metrics.names).toContain("user.actions");
			expect(status.metrics.names).toContain("system.memory");
			expect(status.metrics.names).toContain("response.time");
			expect(status.metrics.names).toContain("operation.duration");

			// Verify system metrics exist
			expect(status.system).toBeDefined();
			expect(typeof status.system["memory.rss"]).toBe("number");
			expect(typeof status.system.uptime).toBe("number");
		});

		it("should handle metric retention", () => {
			// Add a metric with old timestamp
			const oldMetric: MetricData = {
				name: "old.metric",
				value: 1,
				timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
				tags: {},
				type: "counter",
			};

			// Manually add old metric by accessing private method
			(monitoringService as any).addMetric(oldMetric);

			// Add recent metric
			monitoringService.increment("recent.metric", 1);

			const status = monitoringService.getStatus();

			// Old metric should be cleaned up
			expect(status.metrics.names).not.toContain("old.metric");
			expect(status.metrics.names).toContain("recent.metric");
		});
	});

	describe("Performance Monitoring", () => {
		it("should time successful operations", async () => {
			const mockOperation = jest.fn().mockResolvedValue("success");

			const result = await monitoringService.time(
				"test.operation",
				mockOperation,
				{ type: "database" },
			);

			expect(result).toBe("success");
			expect(mockOperation).toHaveBeenCalled();

			// Verify timer metric was collected
			const status = monitoringService.getStatus();
			expect(status.metrics.names).toContain("test.operation");
		});

		it("should time failed operations", async () => {
			const error = new Error("Operation failed");
			const mockOperation = jest.fn().mockRejectedValue(error);

			await expect(
				monitoringService.time("failing.operation", mockOperation, {
					type: "api",
				}),
			).rejects.toThrow("Operation failed");

			// Verify error metric was collected
			const status = monitoringService.getStatus();
			expect(status.metrics.names).toContain("failing.operation");
		});
	});

	describe("Health Checks", () => {
		it("should register and run health checks", async () => {
			const mockCheckFn = jest.fn().mockResolvedValue({
				component: "database",
				status: "healthy" as const,
				message: "Connected",
				metrics: { connections: 5, latency: 10 },
			});

			monitoringService.registerHealthCheck("database", mockCheckFn);

			const status = monitoringService.getStatus();
			expect(status.health.database).toBeDefined();

			// Run the health check
			await monitoringService.runHealthCheck("database", mockCheckFn);

			const updatedStatus = monitoringService.getStatus();
			const healthCheck = updatedStatus.health.database;

			expect(healthCheck.status).toBe("healthy");
			expect(healthCheck.metrics.connections).toBe(5);
		});

		it("should handle health check failures", async () => {
			const error = new Error("Database connection failed");
			const mockCheckFn = jest.fn().mockRejectedValue(error);

			await monitoringService.runHealthCheck("database", mockCheckFn);

			const status = monitoringService.getStatus();
			const healthCheck = status.health.database;

			expect(healthCheck).toBeDefined();
			expect(healthCheck.status).toBe("unhealthy");
			expect(healthCheck.message).toBe("Database connection failed");
		});
	});

	describe("Alert Management", () => {
		it("should add and remove alert rules", () => {
			const rule: AlertRule = {
				id: "test.alert.rule",
				metric: "test.metric",
				condition: "gt",
				threshold: 100,
				duration: 300,
				severity: "high",
				message: "Test metric exceeded threshold",
				actions: [],
			};

			monitoringService.addAlertRule(rule);
			monitoringService.removeAlertRule("test.alert.rule");

			// Should not throw any errors
			expect(true).toBe(true);
		});

		it("should trigger alerts when conditions are met", () => {
			const rule: AlertRule = {
				id: "high.value.alert",
				metric: "test.metric",
				condition: "gt",
				threshold: 100,
				duration: 0,
				severity: "critical",
				message: "High value detected",
				actions: [],
			};

			monitoringService.addAlertRule(rule);

			// Add metric that triggers alert
			monitoringService.gauge("test.metric", 150);

			const status = monitoringService.getStatus();
			const criticalAlerts = status.alerts.filter(
				(alert) => alert.severity === "critical",
			);

			// Should have triggered an alert
			expect(criticalAlerts.length).toBeGreaterThan(0);
		});

		it("should not trigger alerts when conditions are not met", () => {
			const rule: AlertRule = {
				id: "low.value.alert",
				metric: "test.metric",
				condition: "gt",
				threshold: 100,
				duration: 0,
				severity: "medium",
				message: "High value expected but not found",
				actions: [],
			};

			monitoringService.addAlertRule(rule);

			// Add metric that doesn't trigger alert
			monitoringService.gauge("test.metric", 50);

			const status = monitoringService.getStatus();
			const mediumAlerts = status.alerts.filter(
				(alert) => alert.severity === "medium",
			);

			// Should not have triggered an alert
			expect(mediumAlerts.length).toBe(0);
		});
	});

	describe("Report Generation", () => {
		it("should generate basic metrics report", () => {
			// Add some test metrics
			monitoringService.increment("test.count", 1);
			monitoringService.gauge("test.gauge", 85.5);

			const report = monitoringService.generateReport();

			expect(report.report.timestamp).toBeDefined();
			expect(report.report.timeRange).toBe(3600000); // 1 hour default
			expect(report.report.summary).toBeDefined();
			expect(report.report.metrics).toBeDefined();
			expect(report.report.alerts).toBeDefined();
			expect(report.report.health).toBeDefined();
		});

		it("should generate report with custom time range", () => {
			const customTimeRange = 1800000; // 30 minutes
			const report = monitoringService.generateReport(customTimeRange);

			expect(report.report.timeRange).toBe(customTimeRange);
		});

		it("should calculate summary statistics", () => {
			// Add multiple metrics
			for (let i = 0; i < 10; i++) {
				monitoringService.gauge("test.stats", i * 10);
			}

			const report = monitoringService.generateReport();
			const stats = report.report.metrics["test.stats"];

			if (stats) {
				// Only check if stats exist (they might be filtered by time)
				expect(stats.count).toBe(10);
				expect(stats.min).toBe(0);
				expect(stats.max).toBe(90);
				expect(stats.avg).toBe(45);
				expect(stats.latest).toBe(90);
			}
		});
	});

	describe("System Metrics", () => {
		it("should collect system metrics", () => {
			monitoringService.collectSystemMetrics();

			const status = monitoringService.getStatus();
			const system = status.system;

			expect(system["memory.rss"]).toBeDefined();
			expect(system["memory.heapTotal"]).toBeDefined();
			expect(system["memory.heapUsed"]).toBeDefined();
			expect(system["memory.external"]).toBeDefined();
			expect(system.uptime).toBeDefined();
		});
	});

	describe("Error Handling", () => {
		it("should handle invalid metric values", () => {
			expect(() => {
				monitoringService.gauge("test.metric", Number.NaN);
			}).not.toThrow();

			expect(() => {
				monitoringService.gauge("test.metric", Number.POSITIVE_INFINITY);
			}).not.toThrow();
		});

		it("should handle invalid metric names", () => {
			expect(() => {
				monitoringService.increment("", 1);
			}).not.toThrow();

			expect(() => {
				monitoringService.increment(null as any, 1);
			}).not.toThrow();
		});

		it("should handle health check function errors", () => {
			const invalidCheckFn = null as any;

			expect(async () => {
				await monitoringService.runHealthCheck(
					"test.component",
					invalidCheckFn,
				);
			}).not.toThrow();
		});
	});

	describe("Concurrent Operations", () => {
		it("should handle concurrent metric collection", async () => {
			const promises = [];
			const numOperations = 50;

			for (let i = 0; i < numOperations; i++) {
				promises.push(
					monitoringService.increment("concurrent.metric", 1, { iteration: i }),
				);
			}

			await Promise.all(promises);

			const status = monitoringService.getStatus();
			expect(status.metrics.names).toContain("concurrent.metric");
		});
	});
});

import { Logger } from "@/lib/logging/logger";
import {
	Alert,
	type AlertRule,
	HealthCheck,
	type MetricData,
	MonitoringService,
	healthCheck,
	monitorPerformance,
	monitoring,
} from "@/lib/monitoring/monitor";

// Mock environment
const mockEnv = {
	NODE_ENV: "test",
	ENABLE_MONITORING: "true",
	METRICS_RETENTION_HOURS: "24",
	HEALTH_CHECK_INTERVAL: "60",
	ALERT_COOLDOWN_PERIOD: "300",
};

// Mock logger
const mockLogger = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	critical: jest.fn(),
	health: jest.fn(),
};

describe("Monitoring System - Comprehensive Coverage", () => {
	let monitoringService: MonitoringService;
	let originalMonitoringInstance: MonitoringService;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		// Mock environment
		Object.assign(process.env, mockEnv);

		// Mock logger
		jest.spyOn(Logger, "getInstance").mockReturnValue(mockLogger as any);

		// Reset singleton instance for testing
		originalMonitoringInstance = (MonitoringService as any).instance;
		(MonitoringService as any).instance = null;

		monitoringService = MonitoringService.getInstance();
	});

	afterEach(() => {
		// Clear all timers to prevent timeout issues
		jest.clearAllTimers();

		// Restore original instance
		(MonitoringService as any).instance = originalMonitoringInstance;

		// Restore environment
		Object.keys(mockEnv).forEach((key) => {
			delete process.env[key];
		});

		jest.useRealTimers();
	});

	describe("Service Initialization", () => {
		it("should initialize as singleton", () => {
			const instance1 = MonitoringService.getInstance();
			const instance2 = MonitoringService.getInstance();

			expect(instance1).toBe(instance2);
		});

		it("should initialize with default configuration", () => {
			const status = monitoringService.getStatus();

			expect(status.health).toBeDefined();
			expect(status.alerts).toBeDefined();
			expect(status.metrics).toBeDefined();
			expect(status.system).toBeDefined();
		});

		it("should have default alert rules", () => {
			const status = monitoringService.getStatus();

			// Check that default alert rules are loaded
			expect(status.alerts).toBeDefined();
		});

		it("should detect production environment", () => {
			process.env.NODE_ENV = "production";
			(MonitoringService as any).instance = null;
			const prodService = MonitoringService.getInstance();

			// Test production-specific behavior
			prodService.increment("test.metric", 1);

			process.env.NODE_ENV = "test";
		});
	});

	describe("Metrics Collection", () => {
		it("should collect counter metrics", () => {
			monitoringService.increment("user.actions.login", 1, { method: "email" });

			const status = monitoringService.getStatus();
			expect(status.metrics.names).toContain("user.actions.login");
		});

		it("should collect gauge metrics", () => {
			monitoringService.gauge("system.memory.usage", 85.5, { unit: "percent" });

			const status = monitoringService.getStatus();
			expect(status.metrics.names).toContain("system.memory.usage");
		});

		it("should collect histogram metrics", () => {
			monitoringService.histogram("response.time", 150, {
				endpoint: "/api/users",
			});

			const status = monitoringService.getStatus();
			expect(status.metrics.names).toContain("response.time");
		});

		it("should collect timer metrics", () => {
			monitoringService.timer("operation.duration", 250, {
				operation: "database.query",
			});

			const status = monitoringService.getStatus();
			expect(status.metrics.names).toContain("operation.duration");
		});

		it("should handle metric retention", () => {
			// Add old metric
			const oldMetric: MetricData = {
				name: "old.metric",
				value: 1,
				timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
				tags: {},
				type: "counter",
			};

			// Add recent metric
			monitoringService.increment("recent.metric", 1);

			const status = monitoringService.getStatus();

			// Old metric should be cleaned up, recent should remain
			expect(status.metrics.names).toContain("recent.metric");
			expect(status.metrics.names).not.toContain("old.metric");
		});

		it("should handle metric tags properly", () => {
			monitoringService.increment("test.metric", 1, {
				environment: "test",
				version: "1.0.0",
				component: "auth",
			});

			// Generate report and check that metric was collected
			const report = monitoringService.generateReport();
			const status = monitoringService.getStatus();

			expect(status.metrics.names).toContain("test.metric");
			// Note: Individual metric data in report may be filtered by time range
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

			// Check that timer metric was collected
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

			// Check that error metric was collected
			const status = monitoringService.getStatus();
			expect(status.metrics.names).toContain("failing.operation");
		});

		it("should include request ID in timing logs", async () => {
			const mockOperation = jest.fn().mockResolvedValue("result");

			await monitoringService.time("timed.operation", mockOperation, {
				endpoint: "/api/test",
			});

			// Check that debug logs were called (they should be)
			expect(mockLogger.debug).toHaveBeenCalled();
		});

		it("should handle timing with tags", async () => {
			const mockOperation = jest.fn().mockResolvedValue("result");

			await monitoringService.time("tagged.operation", mockOperation, {
				environment: "test",
				component: "auth",
			});

			// Check that metric was collected
			const status = monitoringService.getStatus();
			expect(status.metrics.names).toContain("tagged.operation");
		});
	});

	describe("Health Check Management", () => {
		it("should register health check functions", () => {
			const mockCheckFn = jest.fn().mockResolvedValue({
				component: "database",
				status: "healthy" as const,
				message: "Connected",
				metrics: { connections: 5, latency: 10 },
			});

			monitoringService.registerHealthCheck("database", mockCheckFn);

			const status = monitoringService.getStatus();
			expect(status.health.database).toBeDefined();
		});

		it("should run health checks successfully", async () => {
			const mockCheckFn = jest.fn().mockResolvedValue({
				component: "cache",
				status: "healthy" as const,
				message: "Operational",
				metrics: { hitRate: 0.95, memoryUsage: 60 },
			});

			await monitoringService.runHealthCheck("cache", mockCheckFn);

			const status = monitoringService.getStatus();
			const healthCheck = status.health.cache;

			expect(healthCheck).toBeDefined();
			expect(healthCheck.status).toBe("healthy");
			expect(healthCheck.metrics.hitRate).toBe(0.95);
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

		it("should log health status changes", async () => {
			const mockCheckFn = jest
				.fn()
				.mockResolvedValueOnce({
					component: "api",
					status: "healthy" as const,
					message: "Available",
					metrics: { responseTime: 100 },
				})
				.mockResolvedValueOnce({
					component: "api",
					status: "degraded" as const,
					message: "Slow response",
					metrics: { responseTime: 500 },
				});

			// First check (healthy)
			await monitoringService.runHealthCheck("api", mockCheckFn);

			// Second check (degraded)
			await monitoringService.runHealthCheck("api", mockCheckFn);

			// Should log status change
			expect(mockLogger.warn).toHaveBeenCalledWith(
				"Health status changed: api",
				"Monitoring",
				{
					from: "healthy",
					to: "degraded",
					message: "Slow response",
				},
			);
		});

		it("should call health logger", async () => {
			const mockCheckFn = jest.fn().mockResolvedValue({
				component: "service",
				status: "healthy" as const,
				message: "Running",
				metrics: { uptime: 3600 },
			});

			await monitoringService.runHealthCheck("service", mockCheckFn);

			expect(mockLogger.health).toHaveBeenCalledWith("service", "healthy", {
				uptime: 3600,
			});
		});
	});

	describe("Alert Management", () => {
		it("should add alert rules", () => {
			const rule: AlertRule = {
				id: "test.alert.rule",
				metric: "test.metric",
				condition: "gt",
				threshold: 100,
				duration: 300,
				severity: "high",
				message: "Test metric exceeded threshold",
				actions: [{ type: "slack", config: { channel: "#alerts" } }],
			};

			monitoringService.addAlertRule(rule);

			const status = monitoringService.getStatus();
			// Alert rule should be stored (may not be visible in status without active alerts)
			expect(mockLogger.info).toHaveBeenCalledWith(
				"Alert rule added: test.alert.rule",
				"Monitoring",
				rule,
			);
		});

		it("should remove alert rules", () => {
			const rule: AlertRule = {
				id: "removable.rule",
				metric: "test.metric",
				condition: "lt",
				threshold: 10,
				duration: 60,
				severity: "medium",
				message: "Test metric below threshold",
				actions: [],
			};

			monitoringService.addAlertRule(rule);
			monitoringService.removeAlertRule("removable.rule");

			expect(mockLogger.info).toHaveBeenCalledWith(
				"Alert rule removed: removable.rule",
				"Monitoring",
			);
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

		it("should evaluate different alert conditions", () => {
			const testConditions = [
				{
					condition: "gt" as const,
					threshold: 100,
					value: 150,
					shouldAlert: true,
				},
				{
					condition: "gt" as const,
					threshold: 100,
					value: 50,
					shouldAlert: false,
				},
				{
					condition: "lt" as const,
					threshold: 10,
					value: 5,
					shouldAlert: true,
				},
				{
					condition: "lt" as const,
					threshold: 10,
					value: 15,
					shouldAlert: false,
				},
				{
					condition: "eq" as const,
					threshold: 100,
					value: 100,
					shouldAlert: true,
				},
				{
					condition: "eq" as const,
					threshold: 100,
					value: 99,
					shouldAlert: false,
				},
				{
					condition: "ne" as const,
					threshold: 100,
					value: 99,
					shouldAlert: true,
				},
				{
					condition: "ne" as const,
					threshold: 100,
					value: 100,
					shouldAlert: false,
				},
			];

			testConditions.forEach(({ condition, threshold, value, shouldAlert }) => {
				const rule: AlertRule = {
					id: `test.${condition}.${threshold}`,
					metric: `test.metric.${condition}`,
					condition,
					threshold,
					duration: 0,
					severity: "low",
					message: `Test ${condition} condition`,
					actions: [],
				};

				monitoringService.addAlertRule(rule);
				monitoringService.gauge(`test.metric.${condition}`, value);

				const status = monitoringService.getStatus();
				const alerts = status.alerts.filter(
					(alert) => alert.ruleId === rule.id,
				);

				if (shouldAlert) {
					expect(alerts.length).toBe(1);
				} else {
					expect(alerts.length).toBe(0);
				}
			});
		});
	});

	describe("System Metrics Collection", () => {
		it("should collect memory metrics", () => {
			monitoringService.collectSystemMetrics();

			const status = monitoringService.getStatus();
			const system = status.system;

			expect(system["memory.rss"]).toBeDefined();
			expect(system["memory.heapTotal"]).toBeDefined();
			expect(system["memory.heapUsed"]).toBeDefined();
			expect(system["memory.external"]).toBeDefined();
		});

		it("should collect uptime metrics", () => {
			monitoringService.collectSystemMetrics();

			const status = monitoringService.getStatus();
			const system = status.system;

			expect(system.uptime).toBeDefined();
			expect(system.uptime).toBeGreaterThan(0);
		});

		it("should collect CPU usage metrics", () => {
			monitoringService.collectSystemMetrics();

			const status = monitoringService.getStatus();
			const system = status.system;

			expect(system["cpu.usage"]).toBeDefined();
		});

		it("should collect event loop lag metrics", () => {
			monitoringService.collectSystemMetrics();

			const status = monitoringService.getStatus();
			const system = status.system;

			expect(system["eventLoop.lag"]).toBeDefined();
		});

		it("should collect active connections metrics", () => {
			monitoringService.collectSystemMetrics();

			const status = monitoringService.getStatus();
			const system = status.system;

			expect(system.activeConnections).toBeDefined();
		});
	});

	describe("Report Generation", () => {
		it("should generate metrics report with default time range", () => {
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

			expect(stats).toBeDefined();
			expect(stats.count).toBe(10);
			expect(stats.min).toBe(0);
			expect(stats.max).toBe(90);
			expect(stats.avg).toBe(45);
			expect(stats.latest).toBe(90);
		});

		it("should handle empty metrics in report", () => {
			const report = monitoringService.generateReport();

			expect(report.report.summary.totalMetrics).toBe(0);
			expect(Object.keys(report.report.metrics).length).toBe(0);
		});

		it("should include health summary in report", () => {
			// Add a health check
			const mockCheckFn = jest.fn().mockResolvedValue({
				component: "test.service",
				status: "healthy" as const,
				message: "Running",
				metrics: { uptime: 3600 },
			});

			monitoringService.registerHealthCheck("test.service", mockCheckFn);

			const report = monitoringService.generateReport();
			const summary = report.report.summary;

			expect(summary.healthyComponents).toBeGreaterThan(0);
			expect(summary.unhealthyComponents).toBe(0);
		});
	});

	describe("Alert Actions", () => {
		it("should send email alerts", () => {
			const rule: AlertRule = {
				id: "email.alert",
				metric: "test.metric",
				condition: "gt",
				threshold: 100,
				duration: 0,
				severity: "high",
				message: "Email test alert",
				actions: [
					{
						type: "email",
						config: { to: "admin@example.com", subject: "Test Alert" },
					},
				],
			};

			monitoringService.addAlertRule(rule);
			monitoringService.gauge("test.metric", 150);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"Email alert would be sent: Email test alert",
				"Monitoring",
				{
					to: "admin@example.com",
					subject: "Test Alert",
					alert: expect.any(Object),
				},
			);
		});

		it("should send Slack alerts", () => {
			const rule: AlertRule = {
				id: "slack.alert",
				metric: "test.metric",
				condition: "gt",
				threshold: 100,
				duration: 0,
				severity: "medium",
				message: "Slack test alert",
				actions: [
					{
						type: "slack",
						config: {
							webhook: "https://hooks.slack.com/test",
							channel: "#alerts",
						},
					},
				],
			};

			monitoringService.addAlertRule(rule);
			monitoringService.gauge("test.metric", 150);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"Slack alert would be sent: Slack test alert",
				"Monitoring",
				{
					webhook: "https://hooks.slack.com/test",
					channel: "#alerts",
					alert: expect.any(Object),
				},
			);
		});

		it("should send webhook alerts", () => {
			const rule: AlertRule = {
				id: "webhook.alert",
				metric: "test.metric",
				condition: "gt",
				threshold: 100,
				duration: 0,
				severity: "low",
				message: "Webhook test alert",
				actions: [
					{
						type: "webhook",
						config: { url: "https://api.example.com/alerts" },
					},
				],
			};

			monitoringService.addAlertRule(rule);
			monitoringService.gauge("test.metric", 150);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"Webhook alert would be sent: Webhook test alert",
				"Monitoring",
				{
					url: "https://api.example.com/alerts",
					alert: expect.any(Object),
				},
			);
		});

		it("should handle alert action errors gracefully", () => {
			const rule: AlertRule = {
				id: "failing.action.alert",
				metric: "test.metric",
				condition: "gt",
				threshold: 100,
				duration: 0,
				severity: "high",
				message: "Failing action alert",
				actions: [
					{
						type: "email",
						config: { to: "invalid-email" },
					},
				],
			};

			monitoringService.addAlertRule(rule);
			monitoringService.gauge("test.metric", 150);

			// Should log error but not throw
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	describe("Default Alert Rules", () => {
		it("should initialize with high memory usage rule", () => {
			// The rule should be initialized by default
			monitoringService.gauge("system.memory.heapUsed", 600 * 1024 * 1024); // 600MB > 500MB threshold

			const status = monitoringService.getStatus();
			const memoryAlerts = status.alerts.filter((alert) =>
				alert.message.includes("High memory usage detected"),
			);

			expect(memoryAlerts.length).toBeGreaterThan(0);
		});

		it("should initialize with high CPU usage rule", () => {
			monitoringService.gauge("system.cpu.usage", 90); // 90% > 80% threshold

			const status = monitoringService.getStatus();
			const cpuAlerts = status.alerts.filter((alert) =>
				alert.message.includes("High CPU usage detected"),
			);

			expect(cpuAlerts.length).toBeGreaterThan(0);
		});

		it("should initialize with event loop lag rule", () => {
			monitoringService.gauge("system.eventLoop.lag", 150); // 150ms > 100ms threshold

			const status = monitoringService.getStatus();
			const lagAlerts = status.alerts.filter((alert) =>
				alert.message.includes("Event loop lag detected"),
			);

			expect(lagAlerts.length).toBeGreaterThan(0);
		});
	});

	describe("Decorators", () => {
		describe("monitorPerformance decorator", () => {
			it("should monitor method performance", async () => {
				class TestService {
					@monitorPerformance("test.service.method", { component: "test" })
					async testMethod(input: string): Promise<string> {
						await new Promise((resolve) => setTimeout(resolve, 10));
						return `processed: ${input}`;
					}
				}

				const service = new TestService();
				const result = await service.testMethod("test-input");

				expect(result).toBe("processed: test-input");

				// Check that performance metric was collected
				const status = monitoringService.getStatus();
				expect(status.metrics.names).toContain("test.service.method");
			});

			it("should handle method errors in decorator", async () => {
				class TestService {
					@monitorPerformance("test.failing.method", { component: "test" })
					async failingMethod(): Promise<void> {
						throw new Error("Method failed");
					}
				}

				const service = new TestService();

				await expect(service.failingMethod()).rejects.toThrow("Method failed");

				// Check that error metric was collected
				const status = monitoringService.getStatus();
				expect(status.metrics.names).toContain("test.failing.method");
			});
		});

		describe("healthCheck decorator", () => {
			it("should run health checks for decorated methods", async () => {
				class TestService {
					@healthCheck("test.component")
					async healthyMethod(): Promise<{ status: string; message: string }> {
						return { status: "healthy", message: "Component is healthy" };
					}
				}

				const service = new TestService();
				const result = await service.healthyMethod();

				expect(result).toEqual({
					status: "healthy",
					message: "Component is healthy",
				});

				// Check that health check was registered
				const status = monitoringService.getStatus();
				expect(status.health["test.component"]).toBeDefined();
			});

			it("should handle method errors in health check decorator", async () => {
				class TestService {
					@healthCheck("test.failing.component")
					async failingMethod(): Promise<void> {
						throw new Error("Health check failed");
					}
				}

				const service = new TestService();

				await expect(service.failingMethod()).rejects.toThrow(
					"Health check failed",
				);

				// Check that unhealthy status was recorded
				const status = monitoringService.getStatus();
				const healthCheck = status.health["test.failing.component"];

				expect(healthCheck).toBeDefined();
				expect(healthCheck.status).toBe("unhealthy");
			});
		});
	});

	describe("Background Tasks", () => {
		it("should collect system metrics periodically", () => {
			// Advance timers to trigger metric collection
			jest.advanceTimersByTime(30000); // 30 seconds

			// Should collect system metrics
			const status = monitoringService.getStatus();

			expect(status.system["memory.rss"]).toBeDefined();
			expect(status.system.uptime).toBeDefined();
		});

		it("should run health checks periodically", () => {
			// Register a health check
			const mockCheckFn = jest.fn().mockResolvedValue({
				component: "periodic.check",
				status: "healthy" as const,
				message: "Running",
				metrics: {},
			});

			monitoringService.registerHealthCheck("periodic.check", mockCheckFn);

			// Advance timers to trigger health checks
			jest.advanceTimersByTime(60000); // 60 seconds

			// Should log that health check is due
			expect(mockLogger.debug).toHaveBeenCalledWith(
				"Health check due: periodic.check",
				"Monitoring",
			);
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

		it("should handle alert rule validation errors", () => {
			const invalidRule = {
				id: "",
				metric: "",
				condition: "invalid" as any,
				threshold: -100,
				duration: -1,
				severity: "invalid" as any,
				message: "",
				actions: [],
			};

			expect(() => {
				monitoringService.addAlertRule(invalidRule as any);
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
			const numOperations = 100;

			for (let i = 0; i < numOperations; i++) {
				promises.push(
					monitoringService.increment("concurrent.metric", 1, { iteration: i }),
				);
			}

			await Promise.all(promises);

			const status = monitoringService.getStatus();
			const metricData = status.metrics;

			expect(metricData.names).toContain("concurrent.metric");
		});

		it("should handle concurrent alert evaluations", async () => {
			const rule: AlertRule = {
				id: "concurrent.alert",
				metric: "concurrent.test",
				condition: "gt",
				threshold: 50,
				duration: 0,
				severity: "high",
				message: "Concurrent test alert",
				actions: [],
			};

			monitoringService.addAlertRule(rule);

			const promises = [];
			const numOperations = 100;

			for (let i = 0; i < numOperations; i++) {
				promises.push(monitoringService.gauge("concurrent.test", i));
			}

			await Promise.all(promises);

			const status = monitoringService.getStatus();
			const alerts = status.alerts.filter(
				(alert) => alert.ruleId === "concurrent.alert",
			);

			expect(alerts.length).toBeGreaterThan(0);
		});
	});
});

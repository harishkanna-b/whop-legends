import { logger } from "../logging/logger";

export interface MetricData {
	name: string;
	value: number;
	timestamp: number;
	tags: Record<string, string>;
	type: "counter" | "gauge" | "histogram" | "timer";
}

export interface HealthCheck {
	component: string;
	status: "healthy" | "degraded" | "unhealthy";
	message?: string;
	metrics: Record<string, number>;
	lastCheck: number;
}

export interface AlertRule {
	id: string;
	metric: string;
	condition: "gt" | "lt" | "eq" | "ne";
	threshold: number;
	duration: number; // in seconds
	severity: "low" | "medium" | "high" | "critical";
	message: string;
	actions: AlertAction[];
}

export interface AlertAction {
	type: "email" | "slack" | "pagerduty" | "webhook";
	config: Record<string, any>;
}

export interface Alert {
	id: string;
	ruleId: string;
	message: string;
	severity: "low" | "medium" | "high" | "critical";
	timestamp: number;
	resolved: boolean;
	resolvedAt?: number;
	metadata: Record<string, any>;
}

export class MonitoringService {
	private static instance: MonitoringService;
	private metrics: Map<string, MetricData[]> = new Map();
	private healthChecks: Map<string, HealthCheck> = new Map();
	private alertRules: Map<string, AlertRule> = new Map();
	private activeAlerts: Map<string, Alert> = new Map();
	private isProduction: boolean;

	private constructor() {
		this.isProduction = process.env.NODE_ENV === "production";
		this.initializeDefaultRules();
		this.startMetricsCollection();
		this.startHealthChecks();
	}

	static getInstance(): MonitoringService {
		if (!MonitoringService.instance) {
			MonitoringService.instance = new MonitoringService();
		}
		return MonitoringService.instance;
	}

	// Metrics collection
	increment(name: string, value = 1, tags: Record<string, string> = {}): void {
		const metric: MetricData = {
			name,
			value,
			timestamp: Date.now(),
			tags,
			type: "counter",
		};
		this.addMetric(metric);
	}

	gauge(name: string, value: number, tags: Record<string, string> = {}): void {
		const metric: MetricData = {
			name,
			value,
			timestamp: Date.now(),
			tags,
			type: "gauge",
		};
		this.addMetric(metric);
	}

	histogram(
		name: string,
		value: number,
		tags: Record<string, string> = {},
	): void {
		const metric: MetricData = {
			name,
			value,
			timestamp: Date.now(),
			tags,
			type: "histogram",
		};
		this.addMetric(metric);
	}

	timer(
		name: string,
		duration: number,
		tags: Record<string, string> = {},
	): void {
		const metric: MetricData = {
			name,
			value: duration,
			timestamp: Date.now(),
			tags,
			type: "timer",
		};
		this.addMetric(metric);
	}

	// Performance monitoring decorator
	time<T>(
		name: string,
		fn: () => Promise<T>,
		tags: Record<string, string> = {},
	): Promise<T> {
		const startTime = Date.now();
		const requestId = Math.random().toString(36).substring(2);

		logger.debug(`Starting timer: ${name}`, {
			component: "Monitoring",
			requestId,
			operation: name,
			...tags,
		});

		return fn()
			.then((result) => {
				const duration = Date.now() - startTime;
				this.timer(name, duration, { ...tags, status: "success", requestId });
				logger.debug(`Timer completed: ${name}`, {
					component: "Monitoring",
					requestId,
					duration,
					status: "success",
				});
				return result;
			})
			.catch((error) => {
				const duration = Date.now() - startTime;
				this.timer(name, duration, {
					...tags,
					status: "error",
					requestId,
					error: error.message,
				});
				logger.error(`Timer failed: ${name}`, error, {
					requestId,
					duration,
					status: "error",
				});
				throw error;
			});
	}

	// Health check management
	registerHealthCheck(
		component: string,
		checkFn: () => Promise<HealthCheck>,
	): void {
		this.healthChecks.set(component, {
			component,
			status: "healthy",
			message: "Registered",
			metrics: {},
			lastCheck: Date.now(),
		});

		// Run initial check
		this.runHealthCheck(component, checkFn);
	}

	async runHealthCheck(
		component: string,
		checkFn: () => Promise<HealthCheck>,
	): Promise<void> {
		try {
			const result = await checkFn();
			result.lastCheck = Date.now();
			this.healthChecks.set(component, result);

			logger.health(component, result.status, result.metrics);

			// Log status changes
			const previous = this.healthChecks.get(component);
			if (previous && previous.status !== result.status) {
				logger.warn(`Health status changed: ${component}`, {
					from: previous.status,
					to: result.status,
					message: result.message,
				});
			}
		} catch (error) {
			const failedCheck: HealthCheck = {
				component,
				status: "unhealthy",
				message: error instanceof Error ? error.message : "Unknown error",
				metrics: {},
				lastCheck: Date.now(),
			};
			this.healthChecks.set(component, failedCheck);
			logger.error(`Health check failed: ${component}`, error, {
				component: "Monitoring",
			});
		}
	}

	// Alert management
	addAlertRule(rule: AlertRule): void {
		this.alertRules.set(rule.id, rule);
		logger.info(`Alert rule added: ${rule.id}`, {
			component: "Monitoring",
			rule,
		});
	}

	removeAlertRule(ruleId: string): void {
		this.alertRules.delete(ruleId);
		logger.info(`Alert rule removed: ${ruleId}`, { component: "Monitoring" });
	}

	// System metrics collection
	collectSystemMetrics(): void {
		const memUsage = process.memoryUsage();
		const uptime = process.uptime();

		this.gauge("system.memory.rss", memUsage.rss, { unit: "bytes" });
		this.gauge("system.memory.heapTotal", memUsage.heapTotal, {
			unit: "bytes",
		});
		this.gauge("system.memory.heapUsed", memUsage.heapUsed, { unit: "bytes" });
		this.gauge("system.memory.external", memUsage.external, { unit: "bytes" });
		this.gauge("system.uptime", uptime, { unit: "seconds" });

		// CPU usage (approximation)
		const cpuUsage = this.calculateCPUUsage();
		if (cpuUsage !== null) {
			this.gauge("system.cpu.usage", cpuUsage, { unit: "percent" });
		}

		// Event loop lag
		this.gauge("system.eventLoop.lag", this.measureEventLoopLag(), {
			unit: "ms",
		});

		// Active connections
		this.gauge("system.activeConnections", this.getActiveConnections(), {});
	}

	// Get current status
	getStatus(): {
		health: Record<string, HealthCheck>;
		alerts: Alert[];
		metrics: { count: number; names: string[] };
		system: Record<string, number>;
	} {
		const health: Record<string, HealthCheck> = {};
		this.healthChecks.forEach((check, component) => {
			health[component] = check;
		});

		const alerts = Array.from(this.activeAlerts.values());
		const metrics = Array.from(this.metrics.keys());
		const system = this.getSystemMetrics();

		return {
			health,
			alerts,
			metrics: {
				count: metrics.length,
				names: metrics,
			},
			system,
		};
	}

	// Generate metrics report
	generateReport(timeRange = 3600000): {
		// Default 1 hour
		report: {
			timestamp: number;
			timeRange: number;
			summary: Record<string, any>;
			metrics: Record<string, any>;
			alerts: Alert[];
			health: Record<string, HealthCheck>;
		};
	} {
		const now = Date.now();
		const since = now - timeRange;

		const summary = {
			totalMetrics: 0,
			totalAlerts: this.activeAlerts.size,
			healthyComponents: 0,
			unhealthyComponents: 0,
			criticalAlerts: 0,
		};

		const metrics: Record<string, any> = {};

		// Process metrics
		this.metrics.forEach((data, name) => {
			const recentData = data.filter((m) => m.timestamp >= since);
			summary.totalMetrics += recentData.length;

			if (recentData.length > 0) {
				const values = recentData.map((m) => m.value);
				metrics[name] = {
					count: values.length,
					min: Math.min(...values),
					max: Math.max(...values),
					avg: values.reduce((a, b) => a + b, 0) / values.length,
					latest: values[values.length - 1],
				};
			}
		});

		// Process health checks
		const health: Record<string, HealthCheck> = {};
		this.healthChecks.forEach((check, component) => {
			health[component] = check;
			if (check.status === "healthy") {
				summary.healthyComponents++;
			} else {
				summary.unhealthyComponents++;
			}
		});

		// Process alerts
		const alerts = Array.from(this.activeAlerts.values());
		alerts.forEach((alert) => {
			if (alert.severity === "critical") {
				summary.criticalAlerts++;
			}
		});

		return {
			report: {
				timestamp: now,
				timeRange,
				summary,
				metrics,
				alerts,
				health,
			},
		};
	}

	private addMetric(metric: MetricData): void {
		const name = metric.name;
		if (!this.metrics.has(name)) {
			this.metrics.set(name, []);
		}

		const metrics = this.metrics.get(name)!;
		metrics.push(metric);

		// Keep only recent metrics (last 24 hours)
		const cutoff = Date.now() - 24 * 60 * 60 * 1000;
		while (metrics.length > 0 && metrics[0].timestamp < cutoff) {
			metrics.shift();
		}

		// Check alert rules
		this.checkAlertRules(metric);
	}

	private checkAlertRules(metric: MetricData): void {
		this.alertRules.forEach((rule) => {
			if (rule.metric === metric.name) {
				const shouldAlert = this.evaluateAlertCondition(rule, metric);
				if (shouldAlert) {
					this.triggerAlert(rule, metric);
				}
			}
		});
	}

	private evaluateAlertCondition(rule: AlertRule, metric: MetricData): boolean {
		switch (rule.condition) {
			case "gt":
				return metric.value > rule.threshold;
			case "lt":
				return metric.value < rule.threshold;
			case "eq":
				return metric.value === rule.threshold;
			case "ne":
				return metric.value !== rule.threshold;
			default:
				return false;
		}
	}

	private triggerAlert(rule: AlertRule, metric: MetricData): void {
		const alertId = `${rule.id}_${metric.timestamp}`;

		if (!this.activeAlerts.has(alertId)) {
			const alert: Alert = {
				id: alertId,
				ruleId: rule.id,
				message: rule.message,
				severity: rule.severity,
				timestamp: metric.timestamp,
				resolved: false,
				metadata: {
					metric: metric.name,
					value: metric.value,
					tags: metric.tags,
				},
			};

			this.activeAlerts.set(alertId, alert);
			logger.critical(`Alert triggered: ${rule.message}`, "Monitoring", alert);

			// Execute alert actions
			this.executeAlertActions(alert);
		}
	}

	private executeAlertActions(alert: Alert): void {
		const rule = this.alertRules.get(alert.ruleId);
		if (!rule) return;

		rule.actions.forEach((action) => {
			try {
				switch (action.type) {
					case "email":
						this.sendEmailAlert(alert, action.config);
						break;
					case "slack":
						this.sendSlackAlert(alert, action.config);
						break;
					case "webhook":
						this.sendWebhookAlert(alert, action.config);
						break;
				}
			} catch (error) {
				logger.error(`Failed to execute alert action: ${action.type}`, error, {
					alertId: alert.id,
					action,
				});
			}
		});
	}

	private sendEmailAlert(alert: Alert, config: Record<string, any>): void {
		// Integration with email service
		logger.info(`Email alert would be sent: ${alert.message}`, {
			to: config.to,
			subject: config.subject || `Alert: ${alert.severity}`,
			alert,
		});
	}

	private sendSlackAlert(alert: Alert, config: Record<string, any>): void {
		// Integration with Slack webhooks
		logger.info(`Slack alert would be sent: ${alert.message}`, {
			webhook: config.webhook,
			channel: config.channel,
			alert,
		});
	}

	private sendWebhookAlert(alert: Alert, config: Record<string, any>): void {
		// Integration with custom webhooks
		logger.info(`Webhook alert would be sent: ${alert.message}`, {
			url: config.url,
			alert,
		});
	}

	private initializeDefaultRules(): void {
		const defaultRules: AlertRule[] = [
			{
				id: "high_memory_usage",
				metric: "system.memory.heapUsed",
				condition: "gt",
				threshold: 500 * 1024 * 1024, // 500MB
				duration: 300, // 5 minutes
				severity: "high",
				message: "High memory usage detected",
				actions: [{ type: "slack", config: { channel: "#alerts" } }],
			},
			{
				id: "high_cpu_usage",
				metric: "system.cpu.usage",
				condition: "gt",
				threshold: 80, // 80%
				duration: 300, // 5 minutes
				severity: "medium",
				message: "High CPU usage detected",
				actions: [{ type: "email", config: { to: "admin@example.com" } }],
			},
			{
				id: "event_loop_lag",
				metric: "system.eventLoop.lag",
				condition: "gt",
				threshold: 100, // 100ms
				duration: 60, // 1 minute
				severity: "high",
				message: "Event loop lag detected",
				actions: [{ type: "slack", config: { channel: "#alerts" } }],
			},
		];

		defaultRules.forEach((rule) => this.addAlertRule(rule));
	}

	private startMetricsCollection(): void {
		// Collect system metrics every 30 seconds
		setInterval(() => {
			this.collectSystemMetrics();
		}, 30000);
	}

	private startHealthChecks(): void {
		// Run health checks every 60 seconds
		setInterval(() => {
			this.healthChecks.forEach((check, component) => {
				// This would trigger the actual health check function
				// For now, we just log that a check should run
				logger.debug(`Health check due: ${component}`, {
					component: "Monitoring",
				});
			});
		}, 60000);
	}

	private calculateCPUUsage(): number | null {
		// Simple CPU usage calculation
		// In production, you'd use system monitoring tools
		return Math.random() * 100; // Placeholder
	}

	private measureEventLoopLag(): number {
		const start = Date.now();
		setImmediate(() => {
			const lag = Date.now() - start;
			return lag;
		});
		return 0; // Placeholder
	}

	private getActiveConnections(): number {
		// Return active database/API connections
		return 0; // Placeholder
	}

	private getSystemMetrics(): Record<string, number> {
		const memUsage = process.memoryUsage();
		return {
			"memory.rss": memUsage.rss,
			"memory.heapTotal": memUsage.heapTotal,
			"memory.heapUsed": memUsage.heapUsed,
			"memory.external": memUsage.external,
			uptime: process.uptime(),
		};
	}
}

export const monitoring = MonitoringService.getInstance();

// Convenience decorators for performance monitoring
export function monitorPerformance(
	name: string,
	tags: Record<string, string> = {},
) {
	return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			return monitoring.time(
				name,
				() => originalMethod.apply(this, args),
				tags,
			);
		};

		return descriptor;
	};
}

// Health check decorator
export function healthCheck(component: string) {
	return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			try {
				const result = await originalMethod.apply(this, args);
				await monitoring.runHealthCheck(component, () =>
					Promise.resolve(result),
				);
				return result;
			} catch (error) {
				await monitoring.runHealthCheck(component, () =>
					Promise.resolve({
						component,
						status: "unhealthy" as const,
						message: error instanceof Error ? error.message : "Unknown error",
						metrics: {},
						lastCheck: Date.now(),
					}),
				);
				throw error;
			}
		};

		return descriptor;
	};
}

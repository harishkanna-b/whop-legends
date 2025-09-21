export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	metadata?: Record<string, any>;
	requestId?: string;
	userId?: string;
	component: string;
	operation: string;
	duration?: number;
	error?: any;
}

export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

export interface LoggerConfig {
	level: LogLevel;
	enableConsole: boolean;
	enableFile: boolean;
	enableStructured: boolean;
	includeMetadata: boolean;
	maxLogSize: number;
	retentionDays: number;
	sensitiveFields: string[];
}

export class Logger {
	private static instance: Logger;
	private config: LoggerConfig;
	private logBuffer: LogEntry[] = [];
	private flushInterval: NodeJS.Timeout | null = null;
	private isProduction: boolean;

	private constructor() {
		this.isProduction = process.env.NODE_ENV === "production";
		this.config = this.getDefaultConfig();
		this.startFlushInterval();
	}

	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	private getDefaultConfig(): LoggerConfig {
		return {
			level: (process.env.LOG_LEVEL as LogLevel) || "info",
			enableConsole: process.env.ENABLE_CONSOLE_LOGS !== "false",
			enableFile: process.env.ENABLE_FILE_LOGS !== "false",
			enableStructured: process.env.ENABLE_STRUCTURED_LOGS === "true",
			includeMetadata: process.env.INCLUDE_LOG_METADATA !== "false",
			maxLogSize: Number.parseInt(process.env.MAX_LOG_SIZE || "10485760"), // 10MB
			retentionDays: Number.parseInt(process.env.LOG_RETENTION_DAYS || "30"),
			sensitiveFields: ["password", "token", "secret", "key", "authorization"],
		};
	}

	// Public logging methods
	debug(message: string, metadata: Record<string, any> = {}): void {
		this.log("debug", message, metadata);
	}

	info(message: string, metadata: Record<string, any> = {}): void {
		this.log("info", message, metadata);
	}

	warn(message: string, metadata: Record<string, any> = {}): void {
		this.log("warn", message, metadata);
	}

	error(
		message: string,
		error?: any,
		metadata: Record<string, any> = {},
	): void {
		this.log("error", message, { ...metadata, error });
	}

	critical(
		message: string,
		error?: any,
		metadata: Record<string, any> = {},
	): void {
		this.log("critical", message, { ...metadata, error });
	}

	// Component-specific logging with automatic context
	component(component: string) {
		return {
			debug: (
				message: string,
				operation: string,
				metadata: Record<string, any> = {},
			) => {
				this.log("debug", message, { ...metadata, component, operation });
			},
			info: (
				message: string,
				operation: string,
				metadata: Record<string, any> = {},
			) => {
				this.log("info", message, { ...metadata, component, operation });
			},
			warn: (
				message: string,
				operation: string,
				metadata: Record<string, any> = {},
			) => {
				this.log("warn", message, { ...metadata, component, operation });
			},
			error: (
				message: string,
				operation: string,
				error?: any,
				metadata: Record<string, any> = {},
			) => {
				this.log("error", message, {
					...metadata,
					component,
					operation,
					error,
				});
			},
			critical: (
				message: string,
				operation: string,
				error?: any,
				metadata: Record<string, any> = {},
			) => {
				this.log("critical", message, {
					...metadata,
					component,
					operation,
					error,
				});
			},
		};
	}

	// Performance monitoring
	async trackPerformance<T>(
		operation: string,
		component: string,
		fn: () => Promise<T>,
		metadata: Record<string, any> = {},
	): Promise<T> {
		const startTime = Date.now();
		const requestId = this.generateRequestId();

		try {
			this.info(`Starting ${operation}`, {
				component,
				...metadata,
				requestId,
				operationStart: startTime,
			});

			const result = await fn();

			const duration = Date.now() - startTime;
			this.info(`Completed ${operation}`, {
				component,
				...metadata,
				requestId,
				duration,
				success: true,
			});

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.error(`Failed ${operation}`, error, {
				component,
				...metadata,
				requestId,
				duration,
				success: false,
			});
			throw error;
		}
	}

	// Audit logging for security-sensitive operations
	audit(
		action: string,
		userId: string,
		resource: string,
		details: Record<string, any> = {},
	): void {
		this.info(`AUDIT: ${action}`, {
			component: "Security",
			userId,
			resource,
			action,
			timestamp: new Date().toISOString(),
			...details,
		});
	}

	// Health check logging
	health(
		component: string,
		status: "healthy" | "degraded" | "unhealthy",
		metrics: Record<string, any> = {},
	): void {
		const level =
			status === "unhealthy"
				? "error"
				: status === "degraded"
					? "warn"
					: "info";
		this.log(level, `Health check: ${component}`, {
			component,
			healthStatus: status,
			metrics,
			timestamp: new Date().toISOString(),
		});
	}

	private log(
		level: LogLevel,
		message: string,
		metadata: Record<string, any> = {},
	): void {
		// Check if we should log at this level
		if (!this.shouldLogLevel(level)) {
			return;
		}

		// Sanitize metadata to remove sensitive information
		const sanitizedMetadata = this.sanitizeMetadata(metadata);

		const logEntry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			metadata: this.config.includeMetadata ? sanitizedMetadata : undefined,
			component: metadata.component || "System",
			operation: metadata.operation || "unknown",
			duration: metadata.duration,
			error: metadata.error,
			requestId: metadata.requestId || this.generateRequestId(),
			userId: metadata.userId,
		};

		// Add to buffer
		this.logBuffer.push(logEntry);

		// Console output if enabled
		if (this.config.enableConsole) {
			this.logToConsole(logEntry);
		}

		// Flush if buffer is full
		if (this.logBuffer.length >= 100) {
			this.flush();
		}
	}

	private shouldLogLevel(level: LogLevel): boolean {
		const levels: LogLevel[] = ["debug", "info", "warn", "error", "critical"];
		const configLevelIndex = levels.indexOf(this.config.level);
		const logLevelIndex = levels.indexOf(level);
		return logLevelIndex >= configLevelIndex;
	}

	private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
		const sanitized = { ...metadata };

		for (const field of this.config.sensitiveFields) {
			if (sanitized[field]) {
				sanitized[field] = "[REDACTED]";
			}
		}

		// Remove circular references and non-serializable data
		try {
			JSON.stringify(sanitized);
		} catch (error) {
			// If serialization fails, remove complex objects
			Object.keys(sanitized).forEach((key) => {
				if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
					sanitized[key] = "[OBJECT]";
				}
			});
		}

		return sanitized;
	}

	private logToConsole(entry: LogEntry): void {
		const {
			timestamp,
			level,
			message,
			component,
			operation,
			requestId,
			duration,
			error,
		} = entry;

		const prefix = `[${timestamp}] [${level.toUpperCase()}] [${component}:${operation}]`;
		const requestIdStr = requestId ? ` [${requestId}]` : "";
		const durationStr = duration ? ` (${duration}ms)` : "";

		const consoleMessage = `${prefix}${requestIdStr} ${message}${durationStr}`;

		switch (level) {
			case "debug":
				console.debug(consoleMessage, entry.metadata);
				break;
			case "info":
				console.info(consoleMessage, entry.metadata);
				break;
			case "warn":
				console.warn(consoleMessage, entry.metadata);
				break;
			case "error":
				console.error(consoleMessage, error);
				break;
			case "critical":
				console.error(`🚨 ${consoleMessage}`, error);
				break;
		}
	}

	private flush(): void {
		if (this.logBuffer.length === 0) {
			return;
		}

		const logsToFlush = [...this.logBuffer];
		this.logBuffer = [];

		// In production, send to logging service
		if (this.isProduction && this.config.enableFile) {
			this.sendToLoggingService(logsToFlush).catch((error) => {
				console.error("Failed to send logs to service:", error);
			});
		}

		// Trigger monitoring alerts for critical errors
		const criticalLogs = logsToFlush.filter((log) => log.level === "critical");
		if (criticalLogs.length > 0) {
			this.triggerAlerts(criticalLogs);
		}
	}

	private async sendToLoggingService(logs: LogEntry[]): Promise<void> {
		// In production, this would send to services like:
		// - AWS CloudWatch Logs
		// - Datadog
		// - Loggly
		// - Custom logging service

		if (this.config.enableStructured) {
			// Send structured logs
			const payload = {
				logs,
				source: "whop-legends",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version || "unknown",
			};

			// Here you would integrate with your logging service
			console.log("STRUCTURED_LOGS:", JSON.stringify(payload, null, 2));
		}
	}

	private triggerAlerts(criticalLogs: LogEntry[]): void {
		// Send alerts for critical errors
		criticalLogs.forEach((log) => {
			console.error(`🚨 CRITICAL ALERT: ${log.message}`, {
				component: log.component,
				operation: log.operation,
				timestamp: log.timestamp,
				error: log.error,
			});

			// In production, send to alerting services like:
			// - PagerDuty
			// - Slack
			// - Email alerts
			// - SMS alerts
		});
	}

	private startFlushInterval(): void {
		// Flush logs every 10 seconds
		this.flushInterval = setInterval(() => {
			this.flush();
		}, 10000);
	}

	private generateRequestId(): string {
		return Math.random().toString(36).substring(2) + Date.now().toString(36);
	}

	// Public methods for configuration
	updateConfig(newConfig: Partial<LoggerConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	getConfig(): LoggerConfig {
		return { ...this.config };
	}

	// Flush remaining logs and cleanup
	destroy(): void {
		if (this.flushInterval) {
			clearInterval(this.flushInterval);
			this.flushInterval = null;
		}
		this.flush();
	}

	// Get metrics for monitoring
	getMetrics(): {
		bufferSize: number;
		config: LoggerConfig;
		uptime: number;
	} {
		return {
			bufferSize: this.logBuffer.length,
			config: this.config,
			uptime: process.uptime(),
		};
	}
}

export const logger = Logger.getInstance();

// Convenience exports for common logging patterns
export const logComponent = (component: string) => logger.component(component);

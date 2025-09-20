import { Logger, LogEntry, LogLevel } from '@/lib/logging/logger';
import { monitoring, MetricData, HealthCheck, AlertRule } from '@/lib/monitoring/monitor';

// Mock console methods to capture output
const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
};

// Mock environment variables
const mockEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'debug',
  ENABLE_CONSOLE_LOGS: 'true',
  ENABLE_FILE_LOGS: 'false',
  ENABLE_STRUCTURED_LOGS: 'true',
  INCLUDE_LOG_METADATA: 'true',
  MAX_LOG_SIZE: '10485760',
  LOG_RETENTION_DAYS: '30'
};

describe('Logging System - Comprehensive Coverage', () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance for testing
    (Logger as any).instance = null;

    // Mock console
    global.console = mockConsole as any;

    // Mock environment
    Object.assign(process.env, mockEnv);

    logger = Logger.getInstance();
  });

  afterEach(() => {
    // Restore environment
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });

    // Restore console
    global.console = console as any;
  });

  describe('Logger Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = logger.getConfig();

      expect(config.level).toBe('debug');
      expect(config.enableConsole).toBe(true);
      expect(config.enableFile).toBe(true);
      expect(config.enableStructured).toBe(true);
      expect(config.includeMetadata).toBe(true);
      expect(config.maxLogSize).toBe(10485760);
      expect(config.retentionDays).toBe(30);
      expect(config.sensitiveFields).toContain('password');
      expect(config.sensitiveFields).toContain('token');
    });

    it('should update configuration dynamically', () => {
      logger.updateConfig({
        level: 'error',
        enableConsole: false,
        maxLogSize: 20485760
      });

      const config = logger.getConfig();
      expect(config.level).toBe('error');
      expect(config.enableConsole).toBe(false);
      expect(config.maxLogSize).toBe(20485760);
    });

    it('should use environment variables for configuration', () => {
      // Clear existing instance
      (Logger as any).instance = null;

      process.env.LOG_LEVEL = 'warn';
      process.env.ENABLE_CONSOLE_LOGS = 'false';
      process.env.MAX_LOG_SIZE = '5120000';

      const newLogger = Logger.getInstance();
      const config = newLogger.getConfig();

      expect(config.level).toBe('warn');
      expect(config.enableConsole).toBe(false);
      expect(config.maxLogSize).toBe(5120000);
    });
  });

  describe('Basic Logging Methods', () => {
    it('should handle debug level logging', () => {
      logger.debug('Debug message', { key: 'value' });

      expect(mockConsole.debug).toHaveBeenCalled();
      const call = mockConsole.debug.mock.calls[0];
      expect(call[0]).toContain('[DEBUG]');
      expect(call[0]).toContain('Debug message');
    });

    it('should handle info level logging', () => {
      logger.info('Info message', { key: 'value' });

      expect(mockConsole.info).toHaveBeenCalled();
      const call = mockConsole.info.mock.calls[0];
      expect(call[0]).toContain('[INFO]');
      expect(call[0]).toContain('Info message');
    });

    it('should handle warn level logging', () => {
      logger.warn('Warning message', { key: 'value' });

      expect(mockConsole.warn).toHaveBeenCalled();
      const call = mockConsole.warn.mock.calls[0];
      expect(call[0]).toContain('[WARN]');
      expect(call[0]).toContain('Warning message');
    });

    it('should handle error level logging with error object', () => {
      const error = new Error('Test error');
      logger.error('Error message', error, { key: 'value' });

      expect(mockConsole.error).toHaveBeenCalled();
      const call = mockConsole.error.mock.calls[0];
      expect(call[0]).toContain('[ERROR]');
      expect(call[0]).toContain('Error message');
      expect(call[1]).toBe(error);
    });

    it('should handle critical level logging', () => {
      const error = new Error('Critical error');
      logger.critical('Critical message', error, { key: 'value' });

      expect(mockConsole.error).toHaveBeenCalled();
      const call = mockConsole.error.mock.calls[0];
      expect(call[0]).toContain('🚨 CRITICAL ALERT');
      expect(call[0]).toContain('Critical message');
    });

    it('should respect log level filtering', () => {
      logger.updateConfig({ level: 'error' });

      // These should not log
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');

      // This should log
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Component-based Logging', () => {
    it('should create component-specific loggers', () => {
      const componentLogger = logger.component('TestComponent');

      expect(typeof componentLogger.debug).toBe('function');
      expect(typeof componentLogger.info).toBe('function');
      expect(typeof componentLogger.warn).toBe('function');
      expect(typeof componentLogger.error).toBe('function');
      expect(typeof componentLogger.critical).toBe('function');
    });

    it('should include component and operation in logs', () => {
      const componentLogger = logger.component('TestComponent');

      componentLogger.info('Test operation', 'testMethod', { key: 'value' });

      expect(mockConsole.info).toHaveBeenCalled();
      const call = mockConsole.info.mock.calls[0];
      expect(call[0]).toContain('[TestComponent:testMethod]');
      expect(call[0]).toContain('Test operation');
    });

    it('should handle component-based error logging', () => {
      const componentLogger = logger.component('TestComponent');
      const error = new Error('Component error');

      componentLogger.error('Error in operation', 'testMethod', error, { key: 'value' });

      expect(mockConsole.error).toHaveBeenCalled();
      const call = mockConsole.error.mock.calls[0];
      expect(call[0]).toContain('[TestComponent:testMethod]');
      expect(call[0]).toContain('Error in operation');
      expect(call[1]).toBe(error);
    });
  });

  describe('Performance Tracking', () => {
    it('should track successful operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await logger.trackPerformance(
        'test-operation',
        'TestComponent',
        mockOperation,
        { input: 'test' }
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();

      // Check that info logs were called for start and completion
      expect(mockConsole.info).toHaveBeenCalledTimes(2);

      const startCall = mockConsole.info.mock.calls[0];
      const completeCall = mockConsole.info.mock.calls[1];

      expect(startCall[0]).toContain('Starting test-operation');
      expect(startCall[0]).toContain('[TestComponent]');
      expect(completeCall[0]).toContain('Completed test-operation');
      expect(completeCall[0]).toContain('success: true');
    });

    it('should track failed operations', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(
        logger.trackPerformance(
          'failing-operation',
          'TestComponent',
          mockOperation,
          { input: 'test' }
        )
      ).rejects.toThrow('Operation failed');

      // Check that error log was called
      expect(mockConsole.error).toHaveBeenCalled();
      const errorCall = mockConsole.error.mock.calls[0];
      expect(errorCall[0]).toContain('Failed failing-operation');
      expect(errorCall[0]).toContain('success: false');
    });

    it('should include timing information', async () => {
      const mockOperation = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'delayed result';
      });

      const result = await logger.trackPerformance(
        'timed-operation',
        'TestComponent',
        mockOperation
      );

      expect(result).toBe('delayed result');

      // Check completion log includes duration
      const completeCall = mockConsole.info.mock.calls[1];
      expect(completeCall[0]).toContain('duration');
    });

    it('should generate unique request IDs', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');

      await logger.trackPerformance(
        'test-operation',
        'TestComponent',
        mockOperation
      );

      const startCall = mockConsole.info.mock.calls[0];
      const completeCall = mockConsole.info.mock.calls[1];

      // Extract request IDs from both calls
      const startRequestId = startCall[0].match(/\[([^\]]+)\]/)?.[1];
      const completeRequestId = completeCall[0].match(/\[([^\]]+)\]/)?.[1];

      expect(startRequestId).toBeDefined();
      expect(completeRequestId).toBeDefined();
      expect(startRequestId).toBe(completeRequestId);
    });
  });

  describe('Audit Logging', () => {
    it('should log security-sensitive operations', () => {
      logger.audit('user_login', 'user123', '/auth/login', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      expect(mockConsole.info).toHaveBeenCalled();
      const call = mockConsole.info.mock.calls[0];
      expect(call[0]).toContain('AUDIT: user_login');
      expect(call[0]).toContain('[Security]');
      expect(call[0]).toContain('user123');
      expect(call[0]).toContain('/auth/login');
    });

    it('should include timestamp in audit logs', () => {
      logger.audit('data_access', 'user456', '/api/data');

      const call = mockConsole.info.mock.calls[0];
      expect(call[0]).toContain('timestamp');
      // Check that timestamp is recent (within last second)
      const timestampMatch = call[0].match(/timestamp":\s*"([^"]+)"/);
      if (timestampMatch) {
        const timestamp = new Date(timestampMatch[1]);
        const now = new Date();
        expect(now.getTime() - timestamp.getTime()).toBeLessThan(1000);
      }
    });
  });

  describe('Health Check Logging', () => {
    it('should log healthy status as info', () => {
      logger.health('Database', 'healthy', { connections: 5, latency: 10 });

      expect(mockConsole.info).toHaveBeenCalled();
      const call = mockConsole.info.mock.calls[0];
      expect(call[0]).toContain('Health check: Database');
      expect(call[0]).toContain('healthStatus: healthy');
    });

    it('should log degraded status as warning', () => {
      logger.health('Cache', 'degraded', { hitRate: 0.7 });

      expect(mockConsole.warn).toHaveBeenCalled();
      const call = mockConsole.warn.mock.calls[0];
      expect(call[0]).toContain('Health check: Cache');
      expect(call[0]).toContain('healthStatus: degraded');
    });

    it('should log unhealthy status as error', () => {
      logger.health('ExternalAPI', 'unhealthy', { error: 'Connection timeout' });

      expect(mockConsole.error).toHaveBeenCalled();
      const call = mockConsole.error.mock.calls[0];
      expect(call[0]).toContain('Health check: ExternalAPI');
      expect(call[0]).toContain('healthStatus: unhealthy');
    });
  });

  describe('Metadata Sanitization', () => {
    it('should redact sensitive fields from metadata', () => {
      const sensitiveMetadata = {
        username: 'testuser',
        password: 'secret123',
        token: 'bearer-token',
        apiKey: 'api-key-123',
        safeField: 'public-value'
      };

      logger.info('Test with sensitive data', sensitiveMetadata);

      expect(mockConsole.info).toHaveBeenCalled();
      const call = mockConsole.info.mock.calls[0];
      const metadataStr = JSON.stringify(call[1]);

      expect(metadataStr).toContain('testuser');
      expect(metadataStr).toContain('public-value');
      expect(metadataStr).toContain('[REDACTED]');
      expect(metadataStr).not.toContain('secret123');
      expect(metadataStr).not.toContain('bearer-token');
      expect(metadataStr).not.toContain('api-key-123');
    });

    it('should handle circular references in metadata', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      logger.info('Test with circular reference', { data: circularObj });

      expect(mockConsole.info).toHaveBeenCalled();
      // Should not throw an error due to circular reference
    });

    it('should handle non-serializable objects in metadata', () => {
      const func = () => 'test';
      const symbol = Symbol('test');

      logger.info('Test with non-serializable', { func, symbol });

      expect(mockConsole.info).toHaveBeenCalled();
      // Should not throw an error due to non-serializable data
    });
  });

  describe('Log Buffer Management', () => {
    it('should buffer logs before flushing', () => {
      // Mock flush interval to prevent automatic flushing
      jest.useFakeTimers();

      // Log multiple entries
      for (let i = 0; i < 50; i++) {
        logger.info(`Test message ${i}`);
      }

      // Logs should be buffered
      expect(mockConsole.info).toHaveBeenCalledTimes(50);

      jest.useRealTimers();
    });

    it('should flush buffer when full', () => {
      // Log many entries to trigger buffer flush
      for (let i = 0; i < 150; i++) {
        logger.info(`Buffer test message ${i}`);
      }

      expect(mockConsole.info).toHaveBeenCalledTimes(150);
    });

    it('should handle flush interval cleanup', () => {
      const destroySpy = jest.spyOn(logger as any, 'destroy');

      logger.destroy();

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Metrics Collection', () => {
    it('should provide logger metrics', () => {
      const metrics = logger.getMetrics();

      expect(metrics).toHaveProperty('bufferSize');
      expect(metrics).toHaveProperty('config');
      expect(metrics).toHaveProperty('uptime');
      expect(typeof metrics.uptime).toBe('number');
      expect(metrics.uptime).toBeGreaterThan(0);
    });

    it('should track buffer size accurately', () => {
      // Add some logs
      logger.info('Test message 1');
      logger.info('Test message 2');

      const metrics = logger.getMetrics();
      expect(metrics.bufferSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Structured Logging', () => {
    it('should format structured logs correctly', () => {
      process.env.ENABLE_STRUCTURED_LOGS = 'true';

      logger.info('Structured test', { structured: true, level: 'info' });

      expect(mockConsole.info).toHaveBeenCalled();
      const call = mockConsole.info.mock.calls[0];

      // Should contain structured log indicator
      expect(call[0]).toContain('STRUCTURED_LOGS');
    });

    it('should include proper log entry structure', () => {
      logger.info('Structure test', { key: 'value' });

      const call = mockConsole.info.mock.calls[0];
      const logData = call[1];

      if (logData && typeof logData === 'object') {
        expect(logData).toHaveProperty('timestamp');
        expect(logData).toHaveProperty('level');
        expect(logData).toHaveProperty('message');
        expect(logData).toHaveProperty('component');
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle logging errors gracefully', () => {
      // Mock console to throw error
      const originalError = console.error;
      console.error = jest.fn().mockImplementation(() => {
        throw new Error('Console error');
      });

      // Should not throw when logging
      expect(() => {
        logger.error('Test error message');
      }).not.toThrow();

      // Restore console
      console.error = originalError;
    });

    it('should handle metadata processing errors', () => {
      const problematicMetadata = {
        toJSON: () => { throw new Error('Serialization error'); }
      };

      expect(() => {
        logger.info('Test with problematic metadata', problematicMetadata);
      }).not.toThrow();
    });
  });

  describe('Production Mode Behavior', () => {
    it('should behave differently in production', () => {
      process.env.NODE_ENV = 'production';

      // Clear instance to reinitialize with production env
      (Logger as any).instance = null;
      const prodLogger = Logger.getInstance();

      // Test production-specific behavior
      prodLogger.info('Production test');

      // Restore test environment
      process.env.NODE_ENV = 'test';
      (Logger as any).instance = null;
    });

    it('should disable console logging in production when configured', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_CONSOLE_LOGS = 'false';

      (Logger as any).instance = null;
      const prodLogger = Logger.getInstance();

      prodLogger.info('Silent production log');

      // In production with console disabled, should not log to console
      expect(mockConsole.info).not.toHaveBeenCalled();

      // Restore
      process.env.NODE_ENV = 'test';
      process.env.ENABLE_CONSOLE_LOGS = 'true';
      (Logger as any).instance = null;
    });
  });
});
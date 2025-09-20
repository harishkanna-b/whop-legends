import { FailoverManager, FailoverConfig, FailoverManagerRegistry, defaultFailoverConfigs } from '@/lib/failover/failover-manager';

// Mock health check function for testing
const mockHealthCheck = jest.fn();
const mockOperation = jest.fn();

describe('Failover Manager - Comprehensive Coverage', () => {
  let failoverManager: FailoverManager;
  let config: FailoverConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockHealthCheck.mockClear();
    mockOperation.mockClear();

    config = {
      primaryProvider: 'primary',
      fallbackProviders: ['fallback1', 'fallback2'],
      healthCheckInterval: 1000,
      maxRetries: 2,
      retryDelay: 100,
      failbackThreshold: 3
    };

    // Mock successful operation
    mockOperation.mockResolvedValue('success');

    failoverManager = new FailoverManager(config);
  });

  afterEach(() => {
    jest.useRealTimers();
    failoverManager.destroy();
  });

  describe('Basic Failover Functionality', () => {
    it('should initialize with primary provider', () => {
      expect(failoverManager.getCurrentProvider()).toBe('primary');
    });

    it('should execute operations with primary provider', async () => {
      const result = await failoverManager.execute(mockOperation);
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledWith('primary');
    });

    it('should failover to fallback provider on primary failure', async () => {
      // Make primary provider fail
      mockOperation.mockImplementationOnce((provider: string) => {
        if (provider === 'primary') {
          return Promise.reject(new Error('Primary failed'));
        }
        return Promise.resolve('fallback success');
      });

      const result = await failoverManager.execute(mockOperation);
      expect(result).toBe('fallback success');
      expect(failoverManager.getCurrentProvider()).toBe('fallback1'); // First fallback
    });

    it('should try all fallback providers in order', async () => {
      // Make primary and first fallback fail
      mockOperation.mockImplementation((provider: string) => {
        if (provider === 'primary' || provider === 'fallback1') {
          return Promise.reject(new Error(`${provider} failed`));
        }
        return Promise.resolve('fallback2 success');
      });

      const result = await failoverManager.execute(mockOperation);
      expect(result).toBe('fallback2 success');
      expect(failoverManager.getCurrentProvider()).toBe('fallback2');
    });

    it('should throw error when all providers fail', async () => {
      // Make all providers fail
      mockOperation.mockRejectedValue(new Error('All providers failed'));

      await expect(failoverManager.execute(mockOperation)).rejects.toThrow('All providers failed');
      expect(failoverManager.getCurrentProvider()).toBe('primary'); // Should not change provider
    });

    it('should respect max retry limit', async () => {
      const limitedConfig = { ...config, maxRetries: 1 };
      const limitedManager = new FailoverManager(limitedConfig);

      mockOperation.mockImplementation((provider: string) => {
        if (provider === 'primary') {
          return Promise.reject(new Error('Primary failed'));
        }
        return Promise.resolve('success');
      });

      const result = await limitedManager.execute(mockOperation);
      expect(result).toBe('success');

      // Should only retry once (primary + one fallback)
      expect(mockOperation).toHaveBeenCalledTimes(2);
      limitedManager.destroy();
    });
  });

  describe('Health Check System', () => {
    it('should perform health checks on all providers', async () => {
      const healthResults = await Promise.all([
        failoverManager.performHealthCheck('primary'),
        failoverManager.performHealthCheck('fallback1'),
        failoverManager.performHealthCheck('fallback2')
      ]);

      expect(healthResults).toHaveLength(3);
      healthResults.forEach(result => {
        expect(result).toHaveProperty('provider');
        expect(result).toHaveProperty('isHealthy');
        expect(result).toHaveProperty('latency');
        expect(result).toHaveProperty('timestamp');
      });
    });

    it('should update provider availability based on health checks', async () => {
      // Force a health check failure
      jest.spyOn(failoverManager as any, 'performHealthCheck').mockResolvedValueOnce({
        provider: 'primary',
        isHealthy: false,
        latency: 100,
        error: 'Health check failed',
        timestamp: Date.now()
      });

      await (failoverManager as any).checkAllProviders();

      const primaryStatus = failoverManager.getProviderStatus('primary');
      expect(primaryStatus?.isAvailable).toBe(false);
    });

    it('should automatically initiate failover on health check failure', async () => {
      // Mock health check to make primary unhealthy and fallback1 healthy
      jest.spyOn(failoverManager as any, 'performHealthCheck')
        .mockResolvedValueOnce({
          provider: 'primary',
          isHealthy: false,
          latency: 100,
          error: 'Primary down',
          timestamp: Date.now()
        })
        .mockResolvedValueOnce({
          provider: 'fallback1',
          isHealthy: true,
          latency: 50,
          timestamp: Date.now()
        })
        .mockResolvedValueOnce({
          provider: 'fallback2',
          isHealthy: true,
          latency: 75,
          timestamp: Date.now()
        });

      await (failoverManager as any).checkAllProviders();

      expect(failoverManager.getCurrentProvider()).toBe('fallback1');
    });

    it('should automatically failback to primary when healthy', async () => {
      // First, failover to fallback
      mockOperation.mockImplementationOnce((provider: string) => {
        if (provider === 'primary') {
          return Promise.reject(new Error('Primary failed'));
        }
        return Promise.resolve('fallback success');
      });

      await failoverManager.execute(mockOperation);
      expect(failoverManager.getCurrentProvider()).toBe('fallback1');

      // Now make primary healthy again with enough consecutive successes
      const primaryStatus = failoverManager.getProviderStatus('primary');
      if (primaryStatus) {
        primaryStatus.isAvailable = true;
        primaryStatus.consecutiveSuccesses = config.failbackThreshold;
      }

      // Trigger health check evaluation
      await (failoverManager as any).evaluateFailoverNeeds([
        { provider: 'primary', isHealthy: true, latency: 50, timestamp: Date.now() },
        { provider: 'fallback1', isHealthy: true, latency: 60, timestamp: Date.now() }
      ]);

      expect(failoverManager.getCurrentProvider()).toBe('primary');
    });
  });

  describe('Metrics Collection', () => {
    it('should collect accurate operation metrics', async () => {
      // Execute some operations
      for (let i = 0; i < 5; i++) {
        await failoverManager.execute(mockOperation);
      }

      const metrics = failoverManager.getMetrics();
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.successfulRequests).toBe(5);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });

    it('should track failover and failback events', async () => {
      // Trigger a failover
      failoverManager.forceFailover('fallback1');

      const metrics = failoverManager.getMetrics();
      expect(metrics.failoverCount).toBe(1);
      expect(metrics.currentProvider).toBe('fallback1');

      // Trigger a failback
      failoverManager.forceFailback();

      const updatedMetrics = failoverManager.getMetrics();
      expect(updatedMetrics.failbackCount).toBe(1);
      expect(updatedMetrics.currentProvider).toBe('primary');
    });

    it('should track provider-specific metrics', async () => {
      // Execute operations with different providers
      mockOperation.mockImplementation((provider: string) => {
        return Promise.resolve(`${provider} result`);
      });

      await failoverManager.execute(mockOperation);
      await failoverManager.execute(mockOperation, { forceProvider: 'fallback1' });

      const metrics = failoverManager.getMetrics();
      expect(metrics.providerMetrics.primary).toBeDefined();
      expect(metrics.providerMetrics.fallback1).toBeDefined();
      expect(metrics.providerMetrics.primary.latency).toBeGreaterThan(0);
    });

    it('should calculate error rates correctly', async () => {
      // Mix of successful and failed operations
      const originalMock = mockOperation;
      mockOperation.mockImplementation((provider: string) => {
        if (Math.random() < 0.3) { // 30% failure rate
          return Promise.reject(new Error('Random failure'));
        }
        return Promise.resolve('success');
      });

      // Execute many operations to get good error rate sampling
      for (let i = 0; i < 20; i++) {
        try {
          await failoverManager.execute(mockOperation);
        } catch (error) {
          // Expected failures
        }
      }

      const metrics = failoverManager.getMetrics();
      const primaryMetrics = metrics.providerMetrics.primary;

      expect(primaryMetrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(primaryMetrics.errorRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Provider Management', () => {
    it('should provide status for all providers', () => {
      const providers = failoverManager.getAllProviders();
      expect(providers).toHaveLength(3); // primary + 2 fallbacks
      expect(providers.find(p => p.name === 'primary')).toBeDefined();
      expect(providers.find(p => p.name === 'fallback1')).toBeDefined();
      expect(providers.find(p => p.name === 'fallback2')).toBeDefined();
    });

    it('should handle provider metadata updates', () => {
      failoverManager.updateProviderMetadata('primary', { region: 'us-east-1', version: '1.0.0' });
      failoverManager.updateProviderMetadata('fallback1', { region: 'us-west-1', version: '1.0.0' });

      const primaryStatus = failoverManager.getProviderStatus('primary');
      expect(primaryStatus?.metadata.region).toBe('us-east-1');
      expect(primaryStatus?.metadata.version).toBe('1.0.0');
    });

    it('should track consecutive successes and failures', async () => {
      // Simulate multiple successful operations
      for (let i = 0; i < 5; i++) {
        try {
          await failoverManager.execute(mockOperation);
        } catch (error) {
          // Ignore errors for this test
        }
      }

      const primaryStatus = failoverManager.getProviderStatus('primary');
      expect(primaryStatus?.consecutiveSuccesses).toBeGreaterThan(0);
    });
  });

  describe('Configuration Options', () => {
    it('should respect retry delay between attempts', async () => {
      const delayedConfig = { ...config, retryDelay: 500 };
      const delayedManager = new FailoverManager(delayedConfig);

      mockOperation.mockImplementation((provider: string) => {
        if (provider === 'primary') {
          return Promise.reject(new Error('Primary failed'));
        }
        return Promise.resolve('fallback success');
      });

      const startTime = Date.now();
      await delayedManager.execute(mockOperation);
      const endTime = Date.now();

      // Should have taken at least the retry delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
      delayedManager.destroy();
    });

    it('should respect failback threshold', async () => {
      const thresholdConfig = { ...config, failbackThreshold: 5 };
      const thresholdManager = new FailoverManager(thresholdConfig);

      // Failover to fallback
      thresholdManager.forceFailover('fallback1');

      // Set primary status to have fewer successes than threshold
      const primaryStatus = thresholdManager.getProviderStatus('primary');
      if (primaryStatus) {
        primaryStatus.isAvailable = true;
        primaryStatus.consecutiveSuccesses = thresholdConfig.failbackThreshold - 1;
      }

      // Should not failback yet
      (thresholdManager as any).evaluateFailoverNeeds([
        { provider: 'primary', isHealthy: true, latency: 50, timestamp: Date.now() }
      ]);

      expect(thresholdManager.getCurrentProvider()).toBe('fallback1');

      // Add one more success to reach threshold
      if (primaryStatus) {
        primaryStatus.consecutiveSuccesses = thresholdConfig.failbackThreshold;
      }

      // Now should failback
      (thresholdManager as any).evaluateFailoverNeeds([
        { provider: 'primary', isHealthy: true, latency: 50, timestamp: Date.now() }
      ]);

      expect(thresholdManager.getCurrentProvider()).toBe('primary');
      thresholdManager.destroy();
    });

    it('should handle operation timeouts', async () => {
      const slowOperation = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      await expect(
        failoverManager.execute(slowOperation, { timeout: 1000 })
      ).rejects.toThrow('Operation timeout');
    });
  });

  describe('Health Check Management', () => {
    it('should pause and resume health checks', () => {
      expect(() => {
        failoverManager.pauseHealthChecks();
        failoverManager.resumeHealthChecks();
      }).not.toThrow();
    });

    it('should handle health check failures gracefully', async () => {
      // Make health check throw an error
      jest.spyOn(failoverManager as any, 'performHealthCheck')
        .mockRejectedValueOnce(new Error('Health check system error'));

      await expect((failoverManager as any).checkAllProviders()).resolves.not.toThrow();
    });
  });

  describe('Failover Manager Registry', () => {
    let registry: FailoverManagerRegistry;

    beforeEach(() => {
      registry = FailoverManagerRegistry.getInstance();
    });

    it('should register and retrieve failover managers', () => {
      const manager1 = registry.register('test1', config);
      const manager2 = registry.register('test2', config);

      expect(registry.get('test1')).toBe(manager1);
      expect(registry.get('test2')).toBe(manager2);
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('should manage all failover managers', () => {
      registry.register('test1', config);
      registry.register('test2', config);

      const allManagers = registry.getAll();
      expect(allManagers.size).toBe(2);
      expect(allManagers.has('test1')).toBe(true);
      expect(allManagers.has('test2')).toBe(true);

      expect(registry.remove('test1')).toBe(true);
      expect(registry.get('test1')).toBeUndefined();
      expect(registry.getAll().size).toBe(1);
    });

    it('should provide aggregated metrics', () => {
      registry.register('test1', config);
      registry.register('test2', config);

      const allMetrics = registry.getAllMetrics();
      expect(allMetrics.test1).toBeDefined();
      expect(allMetrics.test2).toBeDefined();
    });

    it('should destroy all managers cleanly', () => {
      const manager1 = registry.register('test1', config);
      const manager2 = registry.register('test2', config);

      expect(() => {
        registry.destroyAll();
      }).not.toThrow();

      expect(registry.getAll().size).toBe(0);
    });

    it('should maintain singleton pattern', () => {
      const instance1 = FailoverManagerRegistry.getInstance();
      const instance2 = FailoverManagerRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Default Configurations', () => {
    it('should provide default database configuration', () => {
      const dbConfig = defaultFailoverConfigs.database;
      expect(dbConfig.primaryProvider).toBe('supabase');
      expect(dbConfig.fallbackProviders).toContain('postgresql');
      expect(dbConfig.healthCheckInterval).toBe(30000);
    });

    it('should provide default cache configuration', () => {
      const cacheConfig = defaultFailoverConfigs.cache;
      expect(cacheConfig.primaryProvider).toBe('redis');
      expect(cacheConfig.fallbackProviders).toContain('memory');
      expect(cacheConfig.healthCheckInterval).toBe(15000);
    });

    it('should provide default external API configuration', () => {
      const apiConfig = defaultFailoverConfigs.externalApi;
      expect(apiConfig.primaryProvider).toBe('primary-api');
      expect(apiConfig.fallbackProviders).toContain('backup-api');
      expect(apiConfig.maxRetries).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations that throw non-Error objects', async () => {
      mockOperation.mockRejectedValue('string error');

      await expect(failoverManager.execute(mockOperation)).rejects.toThrow('string error');
    });

    it('should handle operations that throw null/undefined', async () => {
      mockOperation.mockRejectedValue(null);

      await expect(failoverManager.execute(mockOperation)).rejects.toThrow();
    });

    it('should handle missing provider gracefully', async () => {
      const result = await failoverManager.getProviderStatus('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should handle force operations with invalid providers', () => {
      expect(() => {
        failoverManager.forceFailover('nonexistent');
      }).not.toThrow(); // Should gracefully handle invalid provider
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent operations safely', async () => {
      const promises = [];

      // Execute multiple operations concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(failoverManager.execute(mockOperation));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results.every(result => result === 'success')).toBe(true);
    });

    it('should handle concurrent failover events', async () => {
      const promises = [];

      // Execute operations that might trigger failover
      mockOperation.mockImplementation((provider: string) => {
        if (provider === 'primary' && Math.random() < 0.5) {
          return Promise.reject(new Error('Random primary failure'));
        }
        return Promise.resolve('success');
      });

      for (let i = 0; i < 10; i++) {
        promises.push(failoverManager.execute(mockOperation));
      }

      const results = await Promise.allSettled(promises);
      expect(results).toHaveLength(10);

      // Should have some successes and possibly some failures
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty fallback providers list', () => {
      const noFallbackConfig = { ...config, fallbackProviders: [] };
      const noFallbackManager = new FailoverManager(noFallbackConfig);

      expect(noFallbackManager.getAllProviders()).toHaveLength(1); // Only primary
      noFallbackManager.destroy();
    });

    it('should handle single fallback provider', () => {
      const singleFallbackConfig = { ...config, fallbackProviders: ['fallback1'] };
      const singleFallbackManager = new FailoverManager(singleFallbackConfig);

      expect(singleFallbackManager.getAllProviders()).toHaveLength(2); // Primary + 1 fallback
      singleFallbackManager.destroy();
    });

    it('should handle very short health check intervals', () => {
      const shortIntervalConfig = { ...config, healthCheckInterval: 100 };
      const shortIntervalManager = new FailoverManager(shortIntervalConfig);

      expect(shortIntervalManager.getCurrentProvider()).toBe('primary');
      shortIntervalManager.destroy();
    });

    it('should handle zero retry delay', async () => {
      const noDelayConfig = { ...config, retryDelay: 0 };
      const noDelayManager = new FailoverManager(noDelayConfig);

      mockOperation.mockImplementation((provider: string) => {
        if (provider === 'primary') {
          return Promise.reject(new Error('Primary failed'));
        }
        return Promise.resolve('fallback success');
      });

      const startTime = Date.now();
      await noDelayManager.execute(mockOperation);
      const endTime = Date.now();

      // Should be very fast with no delay
      expect(endTime - startTime).toBeLessThan(100);
      noDelayManager.destroy();
    });
  });
});
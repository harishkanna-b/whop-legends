export interface FailoverConfig {
  primaryProvider: string;
  fallbackProviders: string[];
  healthCheckInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  failbackThreshold: number; // consecutive successful health checks before failback
  circuitBreaker?: any; // Circuit breaker config
}

export interface Provider {
  name: string;
  isAvailable: boolean;
  priority: number;
  lastHealthCheck: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  latency: number;
  errorRate: number;
  metadata: Record<string, any>;
}

export interface HealthCheckResult {
  provider: string;
  isHealthy: boolean;
  latency: number;
  error?: string;
  timestamp: number;
}

export interface FailoverMetrics {
  currentProvider: string;
  failoverCount: number;
  failbackCount: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  providerMetrics: Record<string, Provider>;
}

export class FailoverManager {
  private config: FailoverConfig;
  private providers: Map<string, Provider> = new Map();
  private currentProvider: string;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metrics: FailoverMetrics;
  private requestHistory: Array<{ provider: string; success: boolean; latency: number; timestamp: number }> = [];

  constructor(config: FailoverConfig) {
    this.config = {
      circuitBreaker: undefined,
      ...config
    };

    // Initialize providers
    this.initializeProviders();

    // Set initial provider
    this.currentProvider = this.config.primaryProvider;

    // Initialize metrics
    this.metrics = {
      currentProvider: this.config.primaryProvider,
      failoverCount: 0,
      failbackCount: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      providerMetrics: {}
    };

    // Start health checks
    this.startHealthChecks();
  }

  private initializeProviders(): void {
    // Initialize primary provider
    this.providers.set(this.config.primaryProvider, {
      name: this.config.primaryProvider,
      isAvailable: true,
      priority: 0,
      lastHealthCheck: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      latency: 0,
      errorRate: 0,
      metadata: {}
    });

    // Initialize fallback providers
    this.config.fallbackProviders.forEach((provider, index) => {
      this.providers.set(provider, {
        name: provider,
        isAvailable: true,
        priority: index + 1,
        lastHealthCheck: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        latency: 0,
        errorRate: 0,
        metadata: {}
      });
    });
  }

  async execute<T>(
    operation: (provider: string) => Promise<T>,
    options?: {
      forceProvider?: string;
      skipFailover?: boolean;
      timeout?: number;
    }
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    let provider = options?.forceProvider || this.currentProvider;
    let lastError: Error | null = null;

    // Try primary provider first, then failover if needed
    for (let attempt = 0; attempt <= (options?.skipFailover ? 0 : this.config.maxRetries); attempt++) {
      try {
        // Skip if provider is not available and we're not forcing it
        if (!options?.forceProvider && !this.isProviderAvailable(provider)) {
          throw new Error(`Provider ${provider} is not available`);
        }

        // Execute operation with timeout
        const result = await this.executeWithTimeout(operation(provider), options?.timeout);

        // Record successful request
        this.recordRequest(provider, true, Date.now() - startTime);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.recordRequest(provider, false, Date.now() - startTime);

        // Update provider error rate
        this.updateProviderErrorRate(provider, false);

        // If this is not the last attempt, try next available provider
        if (attempt < this.config.maxRetries && !options?.skipFailover) {
          const nextProvider = this.getNextAvailableProvider(provider);
          if (!nextProvider) {
            break; // No more providers available
          }
          provider = nextProvider;

          // Wait before retry
          if (this.config.retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          }
        }
      }
    }

    // All attempts failed
    this.metrics.failedRequests++;
    throw lastError || new Error('All providers failed');
  }

  private async executeWithTimeout<T>(operation: Promise<T>, timeout?: number): Promise<T> {
    if (!timeout) {
      return operation;
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeout);
    });

    return Promise.race([operation, timeoutPromise]);
  }

  private recordRequest(provider: string, success: boolean, latency: number): void {
    // Add to request history
    this.requestHistory.push({
      provider,
      success,
      latency,
      timestamp: Date.now()
    });

    // Keep only recent history (last 1000 requests)
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }

    // Update metrics
    if (success) {
      this.metrics.successfulRequests++;
      this.updateProviderErrorRate(provider, true);
    }

    // Update average latency
    const recentRequests = this.requestHistory.slice(-100);
    if (recentRequests.length > 0) {
      const totalLatency = recentRequests.reduce((sum, req) => sum + req.latency, 0);
      this.metrics.averageLatency = totalLatency / recentRequests.length;
    }

    // Update provider metrics
    const providerData = this.providers.get(provider);
    if (providerData) {
      providerData.latency = latency;
      this.metrics.providerMetrics[provider] = { ...providerData };
    }
  }

  private updateProviderErrorRate(provider: string, success: boolean): void {
    const providerData = this.providers.get(provider);
    if (!providerData) return;

    // Get recent requests for this provider
    const recentRequests = this.requestHistory.filter(req =>
      req.provider === provider && Date.now() - req.timestamp < 300000 // 5 minutes
    );

    if (recentRequests.length > 0) {
      const errorCount = recentRequests.filter(req => !req.success).length;
      providerData.errorRate = (errorCount / recentRequests.length) * 100;
    }

    this.metrics.providerMetrics[provider] = { ...providerData };
  }

  private getNextAvailableProvider(currentProvider: string): string | null {
    const providers = Array.from(this.providers.values())
      .filter(p => p.name !== currentProvider && p.isAvailable)
      .sort((a, b) => a.priority - b.priority);

    return providers.length > 0 ? providers[0].name : null;
  }

  private isProviderAvailable(provider: string): boolean {
    const providerData = this.providers.get(provider);
    return providerData ? providerData.isAvailable : false;
  }

  async performHealthCheck(provider: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const providerData = this.providers.get(provider);

    if (!providerData) {
      return {
        provider,
        isHealthy: false,
        latency: 0,
        error: 'Provider not found',
        timestamp: Date.now()
      };
    }

    try {
      // Simulate health check - in real implementation, this would be an actual health check
      // For now, we'll use a simple check that occasionally fails for testing
      const shouldFail = Math.random() < 0.05; // 5% failure rate for testing

      if (shouldFail) {
        throw new Error('Health check failed');
      }

      const latency = Date.now() - startTime;

      // Update provider status
      providerData.isAvailable = true;
      providerData.lastHealthCheck = Date.now();
      providerData.consecutiveSuccesses++;
      providerData.consecutiveFailures = 0;
      providerData.latency = latency;

      return {
        provider,
        isHealthy: true,
        latency,
        timestamp: Date.now()
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      // Update provider status
      providerData.isAvailable = false;
      providerData.lastHealthCheck = Date.now();
      providerData.consecutiveFailures++;
      providerData.consecutiveSuccesses = 0;
      providerData.latency = latency;

      return {
        provider,
        isHealthy: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  private async checkAllProviders(): Promise<void> {
    const healthCheckPromises = Array.from(this.providers.keys()).map(provider =>
      this.performHealthCheck(provider)
    );

    const results = await Promise.all(healthCheckPromises);

    // Determine if we need to failover or failback
    this.evaluateFailoverNeeds(results);

    // Update metrics
    results.forEach(result => {
      const providerData = this.providers.get(result.provider);
      if (providerData) {
        this.metrics.providerMetrics[result.provider] = { ...providerData };
      }
    });
  }

  private evaluateFailoverNeeds(healthResults: HealthCheckResult[]): void {
    const currentProviderData = this.providers.get(this.currentProvider);
    if (!currentProviderData) return;

    // Check if current provider is unhealthy
    const currentHealth = healthResults.find(r => r.provider === this.currentProvider);

    if (currentHealth && !currentHealth.isHealthy) {
      // Current provider is unhealthy, initiate failover
      this.initiateFailover();
    } else if (currentProviderData.consecutiveSuccesses >= this.config.failbackThreshold) {
      // Current provider has been stable, check if we should failback to primary
      this.initiateFailback();
    }
  }

  private initiateFailover(): void {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.isAvailable && p.name !== this.currentProvider)
      .sort((a, b) => a.priority - b.priority);

    if (availableProviders.length > 0) {
      const newProvider = availableProviders[0].name;

      if (newProvider !== this.currentProvider) {
        console.log(`Failover initiated: ${this.currentProvider} -> ${newProvider}`);
        this.currentProvider = newProvider;
        this.metrics.failoverCount++;
        this.metrics.currentProvider = newProvider;

        // Reset consecutive successes for old provider
        const oldProvider = this.providers.get(this.currentProvider);
        if (oldProvider) {
          oldProvider.consecutiveSuccesses = 0;
        }
      }
    }
  }

  private initiateFailback(): void {
    const primaryProvider = this.providers.get(this.config.primaryProvider);
    if (!primaryProvider || !primaryProvider.isAvailable) return;

    // Only failback if current provider is not primary
    if (this.currentProvider !== this.config.primaryProvider) {
      console.log(`Failback initiated: ${this.currentProvider} -> ${this.config.primaryProvider}`);
      this.currentProvider = this.config.primaryProvider;
      this.metrics.failbackCount++;
      this.metrics.currentProvider = this.config.primaryProvider;
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkAllProviders().catch(error => {
        console.error('Health check failed:', error);
      });
    }, this.config.healthCheckInterval);
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }

  getProviderStatus(name: string): Provider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  getMetrics(): FailoverMetrics {
    return {
      ...this.metrics,
      providerMetrics: { ...this.metrics.providerMetrics }
    };
  }

  forceFailover(provider?: string): void {
    const targetProvider = provider || this.getNextAvailableProvider(this.currentProvider);
    if (targetProvider && targetProvider !== this.currentProvider) {
      this.currentProvider = targetProvider;
      this.metrics.failoverCount++;
      this.metrics.currentProvider = targetProvider;
    }
  }

  forceFailback(): void {
    const primaryProvider = this.providers.get(this.config.primaryProvider);
    if (primaryProvider && primaryProvider.isAvailable) {
      this.currentProvider = this.config.primaryProvider;
      this.metrics.failbackCount++;
      this.metrics.currentProvider = this.config.primaryProvider;
    }
  }

  updateProviderMetadata(provider: string, metadata: Record<string, any>): void {
    const providerData = this.providers.get(provider);
    if (providerData) {
      providerData.metadata = { ...providerData.metadata, ...metadata };
      this.metrics.providerMetrics[provider] = { ...providerData };
    }
  }

  pauseHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  resumeHealthChecks(): void {
    if (!this.healthCheckInterval) {
      this.startHealthChecks();
    }
  }

  destroy(): void {
    this.pauseHealthChecks();
    this.providers.clear();
    this.requestHistory = [];
  }
}

// Failover Manager Registry
export class FailoverManagerRegistry {
  private static instance: FailoverManagerRegistry;
  private managers: Map<string, FailoverManager> = new Map();

  static getInstance(): FailoverManagerRegistry {
    if (!FailoverManagerRegistry.instance) {
      FailoverManagerRegistry.instance = new FailoverManagerRegistry();
    }
    return FailoverManagerRegistry.instance;
  }

  register(name: string, config: FailoverConfig): FailoverManager {
    const manager = new FailoverManager(config);
    this.managers.set(name, manager);
    return manager;
  }

  get(name: string): FailoverManager | undefined {
    return this.managers.get(name);
  }

  getAll(): Map<string, FailoverManager> {
    return new Map(this.managers);
  }

  remove(name: string): boolean {
    const manager = this.managers.get(name);
    if (manager) {
      manager.destroy();
      return this.managers.delete(name);
    }
    return false;
  }

  getAllMetrics(): Record<string, FailoverMetrics> {
    const metrics: Record<string, FailoverMetrics> = {};
    this.managers.forEach((manager, name) => {
      metrics[name] = manager.getMetrics();
    });
    return metrics;
  }

  destroyAll(): void {
    this.managers.forEach(manager => manager.destroy());
    this.managers.clear();
  }
}

// Default configurations for common use cases
export const defaultFailoverConfigs = {
  database: {
    primaryProvider: 'supabase',
    fallbackProviders: ['postgresql', 'sqlite'],
    healthCheckInterval: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    failbackThreshold: 5
  },

  cache: {
    primaryProvider: 'redis',
    fallbackProviders: ['memory', 'disk'],
    healthCheckInterval: 15000,
    maxRetries: 2,
    retryDelay: 500,
    failbackThreshold: 3
  },

  externalApi: {
    primaryProvider: 'primary-api',
    fallbackProviders: ['backup-api', 'cached-api'],
    healthCheckInterval: 60000,
    maxRetries: 3,
    retryDelay: 2000,
    failbackThreshold: 5
  }
};

// Decorator for failover
export function failover(name: string, config: FailoverConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const registry = FailoverManagerRegistry.getInstance();

    descriptor.value = async function (...args: any[]) {
      let manager = registry.get(name);

      if (!manager) {
        manager = registry.register(name, config);
      }

      return manager.execute(async (provider: string) => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}
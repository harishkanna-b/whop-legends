export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeout: number; // Time in milliseconds before attempting to reset
  monitoringPeriod: number; // Time window for failure counting
  expectedException?: (error: any) => boolean; // Function to determine if error should count
  timeout?: number; // Operation timeout in milliseconds
  fallback?: () => any; // Fallback function when circuit is open
  halfOpenAttempts?: number; // Number of successful attempts to close circuit
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  successfulAttempts: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  lastStateChange: number;
}

export interface CircuitBreakerMetrics {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureRate: number;
  successRate: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  timeInCurrentState: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private callTimes: number[] = [];
  private readonly maxResponseTimeSamples = 100;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      expectedException: undefined,
      fallback: undefined,
      halfOpenAttempts: 3,
      timeout: 5000, // 5 seconds
      ...config
    };

    this.state = {
      state: 'CLOSED',
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      successfulAttempts: 0,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      lastStateChange: Date.now()
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.state.totalCalls++;

    try {
      // Check if circuit is open and if we should attempt a reset
      if (this.state.state === 'OPEN' && Date.now() < this.state.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - blocking calls');
      }

      // If circuit is open but it's time to attempt a reset, transition to HALF_OPEN
      if (this.state.state === 'OPEN' && Date.now() >= this.state.nextAttemptTime) {
        this.transitionToHalfOpen();
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(operation);

      // Handle successful call
      this.handleSuccess(startTime);
      return result;
    } catch (error) {
      // Handle failed call
      this.handleFailure(error, startTime);
      throw error;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.config.timeout) {
      return operation();
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  private handleSuccess(startTime: number): void {
    this.state.successfulCalls++;
    const responseTime = Date.now() - startTime;
    this.recordResponseTime(responseTime);

    switch (this.state.state) {
      case 'CLOSED':
        // Reset failure count on success in closed state
        this.state.failures = 0;
        break;
      case 'HALF_OPEN':
        this.state.successfulAttempts++;
        if (this.state.successfulAttempts >= this.config.halfOpenAttempts!) {
          this.transitionToClosed();
        }
        break;
    }
  }

  private handleFailure(error: any, startTime: number): void {
    this.state.failedCalls++;
    const responseTime = Date.now() - startTime;
    this.recordResponseTime(responseTime);

    // Check if this error should count towards circuit breaker
    const shouldCount = this.config.expectedException
      ? this.config.expectedException(error)
      : true;

    if (!shouldCount) {
      return;
    }

    this.state.lastFailureTime = Date.now();

    switch (this.state.state) {
      case 'CLOSED':
        this.state.failures++;
        if (this.state.failures >= this.config.failureThreshold) {
          this.transitionToOpen();
        }
        break;
      case 'HALF_OPEN':
        // Any failure in HALF_OPEN state immediately opens the circuit
        this.transitionToOpen();
        break;
    }
  }

  private transitionToOpen(): void {
    this.state.state = 'OPEN';
    this.state.nextAttemptTime = Date.now() + this.config.resetTimeout;
    this.state.successfulAttempts = 0;
    this.state.lastStateChange = Date.now();
  }

  private transitionToClosed(): void {
    this.state.state = 'CLOSED';
    this.state.failures = 0;
    this.state.successfulAttempts = 0;
    this.state.lastStateChange = Date.now();
  }

  private transitionToHalfOpen(): void {
    this.state.state = 'HALF_OPEN';
    this.state.successfulAttempts = 0;
    this.state.lastStateChange = Date.now();
  }

  private recordResponseTime(responseTime: number): void {
    this.callTimes.push(responseTime);
    if (this.callTimes.length > this.maxResponseTimeSamples) {
      this.callTimes.shift();
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  getMetrics(): CircuitBreakerMetrics {
    const failureRate = this.state.totalCalls > 0
      ? (this.state.failedCalls / this.state.totalCalls) * 100
      : 0;

    const successRate = this.state.totalCalls > 0
      ? (this.state.successfulCalls / this.state.totalCalls) * 100
      : 0;

    const averageResponseTime = this.callTimes.length > 0
      ? this.callTimes.reduce((sum, time) => sum + time, 0) / this.callTimes.length
      : 0;

    return {
      state: this.state.state,
      failureRate,
      successRate,
      totalCalls: this.state.totalCalls,
      successfulCalls: this.state.successfulCalls,
      failedCalls: this.state.failedCalls,
      averageResponseTime,
      timeInCurrentState: Date.now() - this.state.lastStateChange
    };
  }

  forceOpen(): void {
    this.transitionToOpen();
  }

  forceClosed(): void {
    this.transitionToClosed();
  }

  reset(): void {
    this.state = {
      state: 'CLOSED',
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      successfulAttempts: 0,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      lastStateChange: Date.now()
    };
    this.callTimes = [];
  }

  isAvailable(): boolean {
    return this.state.state !== 'OPEN';
  }

  getRemainingTimeout(): number {
    if (this.state.state !== 'OPEN') {
      return 0;
    }
    return Math.max(0, this.state.nextAttemptTime - Date.now());
  }
}

// Circuit Breaker Registry for managing multiple circuit breakers
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  register(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    const circuitBreaker = new CircuitBreaker(config);
    this.circuitBreakers.set(name, circuitBreaker);
    return circuitBreaker;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  remove(name: string): boolean {
    return this.circuitBreakers.delete(name);
  }

  getAllStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    this.circuitBreakers.forEach((breaker, name) => {
      states[name] = breaker.getState();
    });
    return states;
  }

  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    this.circuitBreakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });
    return metrics;
  }

  resetAll(): void {
    this.circuitBreakers.forEach(breaker => breaker.reset());
  }

  forceOpenAll(): void {
    this.circuitBreakers.forEach(breaker => breaker.forceOpen());
  }

  forceClosedAll(): void {
    this.circuitBreakers.forEach(breaker => breaker.forceClosed());
  }
}

// Decorator for circuit breaker
export function circuitBreaker(name: string, config: CircuitBreakerConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const registry = CircuitBreakerRegistry.getInstance();

    descriptor.value = async function (...args: any[]) {
      let breaker = registry.get(name);

      if (!breaker) {
        breaker = registry.register(name, config);
      }

      return breaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Convenience function for creating circuit breakers
export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  return new CircuitBreaker(config);
}

// Default configurations for common use cases
export const defaultCircuitBreakerConfigs = {
  database: {
    failureThreshold: 3,
    resetTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000,
    timeout: 10000, // 10 seconds
    expectedException: (error: any) => {
      // Count connection errors, timeouts, and query errors
      return error.code === 'ECONNREFUSED' ||
             error.code === 'ETIMEDOUT' ||
             error.message.includes('timeout') ||
             error.message.includes('connection');
    }
  },

  externalApi: {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 120000, // 2 minutes
    timeout: 15000, // 15 seconds
    expectedException: (error: any) => {
      // Count HTTP errors, timeouts, and network errors
      return error.statusCode >= 500 ||
             error.code === 'ECONNREFUSED' ||
             error.code === 'ETIMEDOUT' ||
             error.message.includes('timeout');
    }
  },

  cache: {
    failureThreshold: 10,
    resetTimeout: 15000, // 15 seconds
    monitoringPeriod: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    expectedException: (error: any) => {
      // Count cache connection and timeout errors
      return error.code === 'ECONNREFUSED' ||
             error.message.includes('timeout') ||
             error.message.includes('cache');
    }
  }
};
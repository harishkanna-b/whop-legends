#!/usr/bin/env node

import { performance } from 'perf_hooks'
import { createServer } from 'http'
import { apiRateLimit, webhookRateLimit, authRateLimit, getRateLimitStatus } from '../lib/rate-limit'

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  blockedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  requestsPerSecond: number
  errorRate: number
}

interface LoadTestConfig {
  concurrentUsers: number
  duration: number // in seconds
  rampUpTime: number // in seconds
  endpointType: 'api' | 'webhook' | 'auth'
  useRedis: boolean
}

class RateLimitLoadTester {
  private config: LoadTestConfig
  private results: LoadTestResult
  private responseTimes: number[] = []
  private startTime: number = Date.now()
  private activeConnections: number = 0

  constructor(config: LoadTestConfig) {
    this.config = config
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async makeRequest(userId: string): Promise<{ success: boolean; responseTime: number; blocked: boolean }> {
    const requestStart = performance.now()

    try {
      const mockRequest = {
        headers: {
          'x-forwarded-for': `192.168.1.${Math.floor(Math.random() * 255)}`,
          'x-real-ip': `192.168.1.${Math.floor(Math.random() * 255)}`
        },
        connection: {
          remoteAddress: `192.168.1.${Math.floor(Math.random() * 255)}`
        },
        body: {
          email: `user${userId}@example.com`
        }
      }

      let result
      switch (this.config.endpointType) {
        case 'api':
          result = await apiRateLimit(mockRequest as any)
          break
        case 'webhook':
          result = await webhookRateLimit(mockRequest as any)
          break
        case 'auth':
          result = await authRateLimit(mockRequest as any)
          break
      }

      const responseTime = performance.now() - requestStart

      return {
        success: true,
        responseTime,
        blocked: !result.allowed
      }
    } catch (error) {
      const responseTime = performance.now() - requestStart
      return {
        success: false,
        responseTime,
        blocked: true
      }
    }
  }

  private async simulateUser(userId: number): Promise<void> {
    const rampUpDelay = (this.config.rampUpTime / this.config.concurrentUsers) * userId * 1000
    await new Promise(resolve => setTimeout(resolve, rampUpDelay))

    const endTime = this.startTime + (this.config.duration * 1000)

    while (performance.now() < endTime) {
      const result = await this.makeRequest(`user_${userId}`)

      this.results.totalRequests++
      this.responseTimes.push(result.responseTime)

      if (result.success) {
        if (result.blocked) {
          this.results.blockedRequests++
        } else {
          this.results.successfulRequests++
        }
      } else {
        this.results.blockedRequests++
      }

      // Add some randomness to request timing
      const delay = Math.random() * 100 + 50 // 50-150ms between requests
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    this.activeConnections--
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index] || 0
  }

  private calculateResults(): void {
    this.results.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
    this.results.minResponseTime = Math.min(...this.responseTimes)
    this.results.maxResponseTime = Math.max(...this.responseTimes)
    this.results.p95ResponseTime = this.calculatePercentile(this.responseTimes, 95)
    this.results.p99ResponseTime = this.calculatePercentile(this.responseTimes, 99)
    this.results.requestsPerSecond = this.results.totalRequests / this.config.duration
    this.results.errorRate = (this.results.blockedRequests / this.results.totalRequests) * 100
  }

  async runTest(): Promise<LoadTestResult> {
    console.log(`🚀 Starting load test for ${this.config.endpointType} endpoint`)
    console.log(`📊 Configuration:`)
    console.log(`   Concurrent users: ${this.config.concurrentUsers}`)
    console.log(`   Duration: ${this.config.duration}s`)
    console.log(`   Ramp-up time: ${this.config.rampUpTime}s`)
    console.log(`   Use Redis: ${this.config.useRedis}`)
    console.log()

    this.startTime = performance.now()

    // Start all user simulations
    const userPromises = []
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      this.activeConnections++
      userPromises.push(this.simulateUser(i))
    }

    // Wait for all users to complete
    await Promise.all(userPromises)

    // Calculate final results
    this.calculateResults()

    return this.results
  }

  printResults(): void {
    console.log('📈 Load Test Results:')
    console.log('═════════════════════════════════════════════════════════════════')
    console.log(`Total Requests: ${this.results.totalRequests.toLocaleString()}`)
    console.log(`Successful Requests: ${this.results.successfulRequests.toLocaleString()}`)
    console.log(`Blocked Requests: ${this.results.blockedRequests.toLocaleString()}`)
    console.log(`Requests per Second: ${this.results.requestsPerSecond.toFixed(2)}`)
    console.log(`Error Rate: ${this.results.errorRate.toFixed(2)}%`)
    console.log()
    console.log('Response Times (ms):')
    console.log(`   Average: ${this.results.averageResponseTime.toFixed(2)}ms`)
    console.log(`   Min: ${this.results.minResponseTime.toFixed(2)}ms`)
    console.log(`   Max: ${this.results.maxResponseTime.toFixed(2)}ms`)
    console.log(`   95th percentile: ${this.results.p95ResponseTime.toFixed(2)}ms`)
    console.log(`   99th percentile: ${this.results.p99ResponseTime.toFixed(2)}ms`)
    console.log('═════════════════════════════════════════════════════════════════')
  }
}

// Stress test scenarios
const stressTestScenarios = [
  {
    name: 'API - Normal Load',
    config: {
      concurrentUsers: 50,
      duration: 60,
      rampUpTime: 10,
      endpointType: 'api' as const,
      useRedis: true
    }
  },
  {
    name: 'API - High Load',
    config: {
      concurrentUsers: 200,
      duration: 120,
      rampUpTime: 30,
      endpointType: 'api' as const,
      useRedis: true
    }
  },
  {
    name: 'Webhook - Burst Load',
    config: {
      concurrentUsers: 100,
      duration: 30,
      rampUpTime: 5,
      endpointType: 'webhook' as const,
      useRedis: true
    }
  },
  {
    name: 'Auth - Security Load',
    config: {
      concurrentUsers: 20,
      duration: 300,
      rampUpTime: 60,
      endpointType: 'auth' as const,
      useRedis: true
    }
  }
]

// Memory and CPU monitoring
class SystemMonitor {
  private samples: any[] = []
  private interval: NodeJS.Timeout | null = null

  start(intervalMs: number = 1000): void {
    this.interval = setInterval(() => {
      const memUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()

      this.samples.push({
        timestamp: Date.now(),
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      })

      // Keep only last 1000 samples
      if (this.samples.length > 1000) {
        this.samples = this.samples.slice(-1000)
      }
    }, intervalMs)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  getStats(): any {
    if (this.samples.length === 0) return null

    const memoryStats = {
      rss: {
        min: Math.min(...this.samples.map(s => s.memory.rss)),
        max: Math.max(...this.samples.map(s => s.memory.rss)),
        avg: this.samples.reduce((sum, s) => sum + s.memory.rss, 0) / this.samples.length
      },
      heapUsed: {
        min: Math.min(...this.samples.map(s => s.memory.heapUsed)),
        max: Math.max(...this.samples.map(s => s.memory.heapUsed)),
        avg: this.samples.reduce((sum, s) => sum + s.memory.heapUsed, 0) / this.samples.length
      }
    }

    return {
      memory: memoryStats,
      sampleCount: this.samples.length,
      duration: this.samples.length > 1 ?
        (this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp) / 1000 : 0
    }
  }

  printStats(): void {
    const stats = this.getStats()
    if (!stats) return

    console.log('💻 System Resource Usage:')
    console.log('═════════════════════════════════════════════════════════════════')
    console.log('Memory Usage (RSS):')
    console.log(`   Min: ${(stats.memory.rss.min / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Max: ${(stats.memory.rss.max / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Avg: ${(stats.memory.rss.avg / 1024 / 1024).toFixed(2)}MB`)
    console.log()
    console.log('Heap Usage:')
    console.log(`   Min: ${(stats.memory.heapUsed.min / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Max: ${(stats.memory.heapUsed.max / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Avg: ${(stats.memory.heapUsed.avg / 1024 / 1024).toFixed(2)}MB`)
    console.log('═════════════════════════════════════════════════════════════════')
  }
}

// Main execution
async function runLoadTests() {
  console.log('🔥 Rate Limiting Load Test Suite')
  console.log('==================================')
  console.log()

  const monitor = new SystemMonitor()
  monitor.start()

  const allResults: any[] = []

  for (const scenario of stressTestScenarios) {
    console.log(`🎯 Running: ${scenario.name}`)
    console.log()

    const tester = new RateLimitLoadTester(scenario.config)
    const result = await tester.runTest()

    tester.printResults()
    console.log()

    allResults.push({
      scenario: scenario.name,
      result,
      systemStats: monitor.getStats()
    })

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  monitor.stop()
  monitor.printStats()

  // Summary report
  console.log('📊 Test Summary:')
  console.log('═════════════════════════════════════════════════════════════════')

  allResults.forEach(({ scenario, result }) => {
    console.log(`${scenario}:`)
    console.log(`   RPS: ${result.requestsPerSecond.toFixed(2)}`)
    console.log(`   Error Rate: ${result.errorRate.toFixed(2)}%`)
    console.log(`   P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms`)
    console.log()
  })

  // Generate recommendations
  console.log('💡 Recommendations:')
  console.log('═════════════════════════════════════════════════════════════════')

  allResults.forEach(({ scenario, result }) => {
    if (result.errorRate > 20) {
      console.log(`⚠️  High error rate in ${scenario}. Consider increasing rate limits.`)
    }
    if (result.p95ResponseTime > 100) {
      console.log(`⚠️  High response time in ${scenario}. Consider optimizing Redis usage.`)
    }
    if (result.requestsPerSecond < 100) {
      console.log(`⚠️  Low throughput in ${scenario}. Check rate limiting configuration.`)
    }
  })

  console.log()
  console.log('✅ Load testing completed!')
}

// Run if this script is executed directly
if (require.main === module) {
  runLoadTests().catch(console.error)
}

export { RateLimitLoadTester, SystemMonitor, type LoadTestConfig, type LoadTestResult }
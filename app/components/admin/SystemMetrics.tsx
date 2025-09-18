'use client'

import { useState, useEffect } from 'react'

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature: number
  }
  memory: {
    total: number
    used: number
    free: number
    usage: number
  }
  disk: {
    total: number
    used: number
    free: number
    usage: number
  }
  network: {
    incoming: number
    outgoing: number
    totalConnections: number
  }
  uptime: number
  timestamp: string
}

export default function SystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadMetrics()

    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(loadMetrics, 5000) // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getUsageColor = (usage: number): string => {
    if (usage > 80) return 'text-red-600'
    if (usage > 60) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getUsageBgColor = (usage: number): string => {
    if (usage > 80) return 'bg-red-600'
    if (usage > 60) return 'bg-yellow-600'
    return 'bg-green-600'
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading system metrics...</div>
  }

  if (!metrics) {
    return <div className="flex items-center justify-center h-64">No metrics data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">System Metrics</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Auto refresh (5s)</span>
          </label>
          <button
            onClick={loadMetrics}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getUsageColor(metrics.cpu.usage)}`}>
              {metrics.cpu.usage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">CPU Usage</div>
            <div className="text-xs text-gray-500">{metrics.cpu.cores} cores</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getUsageColor(metrics.memory.usage)}`}>
              {metrics.memory.usage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Memory Usage</div>
            <div className="text-xs text-gray-500">{formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getUsageColor(metrics.disk.usage)}`}>
              {metrics.disk.usage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Disk Usage</div>
            <div className="text-xs text-gray-500">{formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {metrics.network.totalConnections}
            </div>
            <div className="text-sm text-gray-600">Active Connections</div>
            <div className="text-xs text-gray-500">
              ↓{formatBytes(metrics.network.incoming)}/s ↑{formatBytes(metrics.network.outgoing)}/s
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Details</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">CPU Usage</span>
                <span className={`font-medium ${getUsageColor(metrics.cpu.usage)}`}>
                  {metrics.cpu.usage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBgColor(metrics.cpu.usage)}`}
                  style={{ width: `${metrics.cpu.usage}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Cores:</span>
                <span className="ml-2 font-medium">{metrics.cpu.cores}</span>
              </div>
              <div>
                <span className="text-gray-600">Temperature:</span>
                <span className="ml-2 font-medium">{metrics.cpu.temperature}°C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Details</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Memory Usage</span>
                <span className={`font-medium ${getUsageColor(metrics.memory.usage)}`}>
                  {metrics.memory.usage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBgColor(metrics.memory.usage)}`}
                  style={{ width: `${metrics.memory.usage}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total:</span>
                <div className="font-medium">{formatBytes(metrics.memory.total)}</div>
              </div>
              <div>
                <span className="text-gray-600">Used:</span>
                <div className="font-medium">{formatBytes(metrics.memory.used)}</div>
              </div>
              <div>
                <span className="text-gray-600">Free:</span>
                <div className="font-medium">{formatBytes(metrics.memory.free)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Disk Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Disk Details</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Disk Usage</span>
                <span className={`font-medium ${getUsageColor(metrics.disk.usage)}`}>
                  {metrics.disk.usage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBgColor(metrics.disk.usage)}`}
                  style={{ width: `${metrics.disk.usage}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total:</span>
                <div className="font-medium">{formatBytes(metrics.disk.total)}</div>
              </div>
              <div>
                <span className="text-gray-600">Used:</span>
                <div className="font-medium">{formatBytes(metrics.disk.used)}</div>
              </div>
              <div>
                <span className="text-gray-600">Free:</span>
                <div className="font-medium">{formatBytes(metrics.disk.free)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Network Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Incoming:</span>
                <div className="font-medium">{formatBytes(metrics.network.incoming)}/s</div>
              </div>
              <div>
                <span className="text-gray-600">Outgoing:</span>
                <div className="font-medium">{formatBytes(metrics.network.outgoing)}/s</div>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="text-sm">
                <span className="text-gray-600">Total Connections:</span>
                <span className="ml-2 font-medium">{metrics.network.totalConnections}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">System Uptime:</span>
            <span className="ml-2 font-medium">{formatUptime(metrics.uptime)}</span>
          </div>
          <div>
            <span className="text-gray-600">Last Updated:</span>
            <span className="ml-2 font-medium">
              {new Date(metrics.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
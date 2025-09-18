'use client'

import { useState, useEffect } from 'react'
import AdminOverview from './AdminOverview'
import UserManagement from './UserManagement'
import SystemMetrics from './SystemMetrics'
import ReferralAnalytics from './ReferralAnalytics'
import SocialAnalytics from './SocialAnalytics'
import AchievementAnalytics from './AchievementAnalytics'
import SystemSettings from './SystemSettings'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'metrics' | 'referrals' | 'social' | 'achievements' | 'settings'>('overview')
  const [loading, setLoading] = useState(true)
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalReferrals: 0,
    totalRevenue: 0,
    systemLoad: 0,
    uptime: '0d 0h'
  })

  useEffect(() => {
    loadSystemStats()
  }, [])

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setSystemStats(data)
      }
    } catch (error) {
      console.error('Error loading system stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'metrics', label: 'Metrics', icon: '📈' },
    { id: 'referrals', label: 'Referrals', icon: '🎯' },
    { id: 'social', label: 'Social', icon: '🤝' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ] as const

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">System management and monitoring</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Uptime:</span> {systemStats.uptime}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Load:</span> {systemStats.systemLoad.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <AdminOverview stats={systemStats} />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'metrics' && <SystemMetrics />}
        {activeTab === 'referrals' && <ReferralAnalytics />}
        {activeTab === 'social' && <SocialAnalytics />}
        {activeTab === 'achievements' && <AchievementAnalytics />}
        {activeTab === 'settings' && <SystemSettings />}
      </div>
    </div>
  )
}
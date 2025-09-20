'use client'

import { useState, useEffect } from 'react'
import { referralManager } from '@/lib/referral-tracking'

interface ReferralTrackingProps {
  userId: string
  compact?: boolean
}

interface Referral {
  id: string
  referrerId: string
  referredUserId: string
  referredUsername: string
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
  value: number
  commission: number
  commissionRate: number
  createdAt: string
  completedAt?: string
  expiresAt?: string
  source: string
  metadata?: {
    product?: string
    campaign?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  }
}

interface ReferralStats {
  totalReferrals: number
  completedReferrals: number
  pendingReferrals: number
  expiredReferrals: number
  totalValue: number
  totalCommission: number
  averageCommission: number
  conversionRate: number
  topSources: Array<{
    source: string
    count: number
    value: number
  }>
  monthlyTrend: Array<{
    month: string
    referrals: number
    value: number
  }>
}

interface Campaign {
  id: string
  name: string
  description: string
  commissionRate: number
  isActive: boolean
  referralCode: string
  createdAt: string
  expiresAt?: string
  maxReferrals?: number
  currentValue: number
}

export default function ReferralTracking({ userId, compact = false }: ReferralTrackingProps) {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'campaigns' | 'analytics'>('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d')

  useEffect(() => {
    loadReferralData()
  }, [userId, selectedTimeframe])

  const loadReferralData = async () => {
    try {
      setLoading(true)

      // Load referrals with timeframe filter
      const referralsData = await referralManager.getUserReferrals(userId, selectedTimeframe)
      setReferrals(referralsData)

      // Load referral statistics
      const statsData = await referralManager.getReferralStats(userId, selectedTimeframe)
      setStats(statsData)

      // Load user campaigns
      const campaignsData = await referralManager.getUserCampaigns(userId)
      setCampaigns(campaignsData)
    } catch (error) {
      console.error('Error loading referral data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'pending': return '⏳'
      case 'expired': return '❌'
      default: return '❓'
    }
  }

  const generateReferralLink = async (campaignId?: string) => {
    try {
      const link = await referralManager.generateReferralLink(userId, campaignId)
      // Copy to clipboard
      navigator.clipboard.writeText(link)
      alert('Referral link copied to clipboard!')
    } catch (error) {
      console.error('Error generating referral link:', error)
      alert('Failed to generate referral link')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading referral data...</div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Referral Tracking</h3>
          <button
            onClick={() => generateReferralLink()}
            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700"
          >
            Copy Link
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedReferrals}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">${stats.totalValue.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">${stats.totalCommission.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Commission</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Referral Tracking</h1>
            <p className="text-gray-600 mt-2">Track your referrals and earnings</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={() => generateReferralLink()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Generate Referral Link
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg">
                    🎯
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Referrals</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalReferrals}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-lg">
                    ✅
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{(stats.conversionRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-lg">
                    💰
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.totalValue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-white text-lg">
                    💵
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Commission</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.totalCommission.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {(['overview', 'referrals', 'campaigns', 'analytics'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Top Sources */}
                {stats && stats.topSources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stats.topSources.slice(0, 6).map((source, index) => (
                        <div key={source.source} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{source.source}</span>
                            <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            <div>{source.count} referrals</div>
                            <div>${source.value.toLocaleString()} value</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Referrals */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Referrals</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {referrals.slice(0, 5).map(referral => (
                          <tr key={referral.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {referral.referredUsername}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                                {getStatusIcon(referral.status)} {referral.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${referral.value.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(referral.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'referrals' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Referrals</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {referrals.map(referral => (
                        <tr key={referral.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {referral.referredUsername}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                              {getStatusIcon(referral.status)} {referral.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${referral.value.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${referral.commission.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {referral.source}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(referral.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'campaigns' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Campaigns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.map(campaign => (
                    <div key={campaign.id} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900">{campaign.name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {campaign.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{campaign.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Commission Rate:</span>
                          <span className="font-medium">{campaign.commissionRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Value:</span>
                          <span className="font-medium">${campaign.currentValue.toLocaleString()}</span>
                        </div>
                        {campaign.maxReferrals && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Max Referrals:</span>
                            <span className="font-medium">{campaign.maxReferrals}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => generateReferralLink(campaign.id)}
                        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Copy Campaign Link
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && stats && (
              <div className="space-y-6">
                {/* Monthly Trend */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="space-y-4">
                      {stats.monthlyTrend.map(month => (
                        <div key={month.month}>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>{month.month}</span>
                            <span>{month.referrals} referrals • ${month.value.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(month.referrals / Math.max(...stats.monthlyTrend.map(m => m.referrals))) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Conversion Metrics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Conversion Rate:</span>
                          <span className="font-medium">{(stats.conversionRate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Average Commission:</span>
                          <span className="font-medium">${stats.averageCommission.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending Referrals:</span>
                          <span className="font-medium">{stats.pendingReferrals}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Value Distribution</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Value:</span>
                          <span className="font-medium">${stats.totalValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Commission:</span>
                          <span className="font-medium">${stats.totalCommission.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completed Value:</span>
                          <span className="font-medium">
                            ${(referrals.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.value, 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'

interface SocialStats {
  totalFriends: number
  totalTeams: number
  totalTeamMembers: number
  activeConnections: number
  pendingRequests: number
  recentActivities: Array<{
    id: string
    type: string
    userId: string
    targetUserId?: string
    teamId?: string
    username: string
    targetUsername?: string
    teamName?: string
    action: string
    timestamp: string
  }>
}

export default function SocialAnalytics() {
  const [stats, setStats] = useState<SocialStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/social')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading social stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading social analytics...</div>
  }

  if (!stats) {
    return <div className="flex items-center justify-center h-64">No social data available</div>
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{formatNumber(stats.totalFriends)}</div>
          <div className="text-sm text-gray-600">Total Friends</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">{formatNumber(stats.totalTeams)}</div>
          <div className="text-sm text-gray-600">Teams</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600">{formatNumber(stats.totalTeamMembers)}</div>
          <div className="text-sm text-gray-600">Team Members</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-yellow-600">{formatNumber(stats.activeConnections)}</div>
          <div className="text-sm text-gray-600">Active Connections</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-red-600">{formatNumber(stats.pendingRequests)}</div>
          <div className="text-sm text-gray-600">Pending Requests</div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
        <div className="space-y-3">
          {stats.recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  activity.type === 'friend_request' ? 'bg-blue-600 text-white' :
                  activity.type === 'team_creation' ? 'bg-green-600 text-white' :
                  'bg-purple-600 text-white'
                }`}>
                  {activity.type === 'friend_request' ? '👥' :
                   activity.type === 'team_creation' ? '🏆' : '🎯'}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {activity.username}
                    <span className="text-gray-600 ml-2">
                      {activity.action === 'sent' ? 'sent friend request to' :
                       activity.action === 'created' ? 'created team' :
                       activity.action}
                    </span>
                    {activity.targetUsername && (
                      <span className="font-medium ml-2">{activity.targetUsername}</span>
                    )}
                    {activity.teamName && (
                      <span className="font-medium ml-2 text-green-600">"{activity.teamName}"</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {(stats.activeConnections / stats.totalFriends * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Active Friend Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {(stats.totalTeamMembers / stats.totalTeams).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Avg Team Size</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Indicators</h3>
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalTeams > 0 ? formatNumber(Math.round(stats.totalTeamMembers / stats.totalTeams)) : 0}
              </div>
              <div className="text-sm text-gray-600">Avg Team Size</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {(stats.pendingRequests / stats.totalFriends * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Pending Request Rate</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Dynamics</h3>
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-bold text-indigo-600">
                {stats.totalTeams > 0 ? ((stats.totalTeamMembers / stats.totalTeams) * 100).toFixed(1) : '0.0'}%
              </div>
              <div className="text-sm text-gray-600">Team Participation Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(stats.totalTeams)}
              </div>
              <div className="text-sm text-gray-600">Total Teams</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
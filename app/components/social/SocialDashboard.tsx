'use client'

import { useState, useEffect } from 'react'
import FriendsList from './FriendsList'
import TeamsList from './TeamsList'
import SocialProfile from './SocialProfile'
import { SocialStats } from '@/lib/social'

interface SocialDashboardProps {
  userId: string
}

export default function SocialDashboard({ userId }: SocialDashboardProps) {
  const [stats, setStats] = useState<SocialStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'profile' | 'friends' | 'teams'>('profile')

  useEffect(() => {
    loadStats()
  }, [userId])

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/social/friends?userId=${userId}&action=stats`)
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderNavigation = () => (
    <nav className="bg-white shadow-sm rounded-lg p-4 mb-6">
      <div className="flex space-x-4">
        <button
          onClick={() => setActiveSection('profile')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSection === 'profile'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveSection('friends')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSection === 'friends'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Friends
          {stats && stats.pendingFriendRequests > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {stats.pendingFriendRequests}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSection('teams')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSection === 'teams'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Teams
          {stats && stats.pendingTeamInvites > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {stats.pendingTeamInvites}
            </span>
          )}
        </button>
      </div>
    </nav>
  )

  const renderStatsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-3xl font-bold text-blue-600">{stats?.friendsCount || 0}</div>
        <div className="text-sm text-gray-500 mt-1">Friends</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-3xl font-bold text-purple-600">{stats?.teamsCount || 0}</div>
        <div className="text-sm text-gray-500 mt-1">Teams</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-3xl font-bold text-yellow-600">{stats?.pendingFriendRequests || 0}</div>
        <div className="text-sm text-gray-500 mt-1">Pending Requests</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-3xl font-bold text-green-600">{stats?.totalActivity || 0}</div>
        <div className="text-sm text-gray-500 mt-1">Activity Points</div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Social Hub</h1>
        <p className="text-gray-600 mt-2">Connect with friends, join teams, and build your community</p>
      </div>

      {/* Stats Overview */}
      {renderStatsOverview()}

      {/* Navigation */}
      {renderNavigation()}

      {/* Content */}
      <div className="min-h-screen">
        {activeSection === 'profile' && (
          <SocialProfile userId={userId} isOwnProfile={true} />
        )}
        {activeSection === 'friends' && (
          <FriendsList userId={userId} />
        )}
        {activeSection === 'teams' && (
          <TeamsList userId={userId} />
        )}
      </div>

      {/* Quick Actions */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
        <button
          onClick={() => setActiveSection('friends')}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Find Friends"
        >
          👥
        </button>
        <button
          onClick={() => setActiveSection('teams')}
          className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
          title="Join Teams"
        >
          🏆
        </button>
      </div>
    </div>
  )
}
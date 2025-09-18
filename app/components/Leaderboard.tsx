'use client'

import { useState, useEffect } from 'react'
import { LevelingManager } from '@/lib/leveling'
import { CharacterClassManager } from '@/lib/character-classes'

interface LeaderboardProps {
  userId?: string
  limit?: number
  showFilters?: boolean
}

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  level: number
  totalXP: number
  characterClass: any
  stats: {
    totalReferrals: number
    completedReferrals: number
    totalValue: number
  }
  isCurrentUser: boolean
}

interface FilterOptions {
  timeFrame: 'all' | 'weekly' | 'monthly'
  classFilter: string | null
  metric: 'level' | 'xp' | 'referrals' | 'value'
}

export default function Leaderboard({ userId, limit = 10, showFilters = true }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterOptions>({
    timeFrame: 'all',
    classFilter: null,
    metric: 'level'
  })

  useEffect(() => {
    loadLeaderboard()
  }, [filters, limit])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)

      // Load leaderboard data
      const data = await LevelingManager.getLeaderboard(limit, filters.classFilter)

      // Transform data and add current user highlighting
      const processedData = data.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        username: entry.username || `User ${entry.userId.slice(0, 8)}`,
        level: entry.level,
        totalXP: entry.totalXP,
        characterClass: entry.characterClass,
        stats: entry.stats,
        isCurrentUser: entry.userId === userId
      }))

      setLeaderboard(processedData)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600'
      case 2: return 'from-gray-300 to-gray-500'
      case 3: return 'from-orange-600 to-orange-800'
      default: return 'from-blue-500 to-blue-600'
    }
  }

  const getMedalClass = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 2: return 'bg-gray-100 text-gray-800 border-gray-300'
      case 3: return 'bg-orange-100 text-orange-800 border-orange-300'
      default: return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const formatMetric = (value: number, metric: string) => {
    switch (metric) {
      case 'xp':
        return `${(value / 1000).toFixed(1)}k XP`
      case 'value':
        return `$${value.toLocaleString()}`
      default:
        return value.toLocaleString()
    }
  }

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    switch (filters.metric) {
      case 'level':
        return b.level - a.level
      case 'xp':
        return b.totalXP - a.totalXP
      case 'referrals':
        return b.stats.totalReferrals - a.stats.totalReferrals
      case 'value':
        return b.stats.totalValue - a.stats.totalValue
      default:
        return b.level - a.level
    }
  })

  // Re-rank after sorting
  sortedLeaderboard.forEach((entry, index) => {
    entry.rank = index + 1
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading leaderboard...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">Leaderboard</h3>
          <div className="text-blue-100">
            {sortedLeaderboard.length} Legends
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Frame</label>
              <select
                value={filters.timeFrame}
                onChange={(e) => setFilters({ ...filters, timeFrame: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Character Class</label>
              <select
                value={filters.classFilter || ''}
                onChange={(e) => setFilters({ ...filters, classFilter: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Classes</option>
                <option value="scout">Scout</option>
                <option value="sage">Sage</option>
                <option value="champion">Champion</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.metric}
                onChange={(e) => setFilters({ ...filters, metric: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="level">Level</option>
                <option value="xp">Total XP</option>
                <option value="referrals">Total Referrals</option>
                <option value="value">Total Value</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Content */}
      <div className="p-6">
        {sortedLeaderboard.length > 0 ? (
          <div className="space-y-3">
            {sortedLeaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center p-4 rounded-lg transition-all duration-200 ${
                  entry.isCurrentUser
                    ? 'bg-blue-50 border-2 border-blue-300 shadow-md'
                    : entry.rank <= 3
                    ? 'bg-gradient-to-r ' + getRankColor(entry.rank) + ' text-white'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                  {entry.rank <= 3 ? (
                    <span className="text-2xl">{getRankIcon(entry.rank)}</span>
                  ) : (
                    <span className={`text-lg font-bold ${entry.isCurrentUser ? 'text-blue-600' : 'text-gray-600'}`}>
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Character Info */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl ml-4"
                     style={{
                       backgroundColor: entry.characterClass?.color + '20',
                       color: entry.rank <= 3 ? 'white' : 'inherit'
                     }}>
                  {entry.characterClass?.emoji || '⭐'}
                </div>

                {/* User Info */}
                <div className="flex-1 ml-4">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-bold ${entry.isCurrentUser ? 'text-blue-900' : entry.rank <= 3 ? 'text-white' : 'text-gray-900'}`}>
                      {entry.username}
                    </h4>
                    {entry.isCurrentUser && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.rank <= 3 ? 'bg-white bg-opacity-20 text-white' : 'bg-blue-100 text-blue-800'
                      }`}>
                        You
                      </span>
                    )}
                    {entry.characterClass && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.rank <= 3 ? 'bg-white bg-opacity-20 text-white' : getMedalClass(entry.rank)
                      }`}>
                        {entry.characterClass.name}
                      </span>
                    )}
                  </div>
                  <div className={`text-sm ${entry.rank <= 3 ? 'text-blue-100' : 'text-gray-500'}`}>
                    Level {entry.level} • {entry.stats.totalReferrals} referrals • ${entry.stats.totalValue.toLocaleString()} value
                  </div>
                </div>

                {/* Metric Value */}
                <div className="flex-shrink-0 text-right ml-4">
                  <div className={`text-lg font-bold ${entry.isCurrentUser ? 'text-blue-600' : entry.rank <= 3 ? 'text-white' : 'text-gray-900'}`}>
                    {formatMetric(
                      filters.metric === 'level' ? entry.level :
                      filters.metric === 'xp' ? entry.totalXP :
                      filters.metric === 'referrals' ? entry.stats.totalReferrals :
                      entry.stats.totalValue,
                      filters.metric
                    )}
                  </div>
                  <div className={`text-xs ${entry.rank <= 3 ? 'text-blue-100' : 'text-gray-500'}`}>
                    {filters.metric === 'level' ? 'Level' :
                     filters.metric === 'xp' ? 'Total XP' :
                     filters.metric === 'referrals' ? 'Referrals' :
                     'Value'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏆</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No leaderboard data available</h4>
            <p className="text-gray-500">Be the first to start climbing the ranks!</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing top {Math.min(sortedLeaderboard.length, limit)} of {sortedLeaderboard.length} legends
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Your position</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span>Top 3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
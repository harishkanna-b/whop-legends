'use client'

import { useState, useEffect } from 'react'

interface AchievementStats {
  totalAchievements: number
  unlockedAchievements: number
  unlockRate: number
  topAchievements: Array<{
    id: string
    name: string
    category: string
    rarity: string
    unlocks: number
  }>
  categoryStats: Array<{
    category: string
    total: number
    unlocks: number
    unlockRate: number
  }>
}

export default function AchievementAnalytics() {
  const [stats, setStats] = useState<AchievementStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/achievements')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading achievement stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common': return 'text-gray-600'
      case 'uncommon': return 'text-green-600'
      case 'rare': return 'text-blue-600'
      case 'epic': return 'text-purple-600'
      case 'legendary': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'progression': return '📈'
      case 'social': return '👥'
      case 'referral': return '🎯'
      case 'milestone': return '🏆'
      case 'special': return '⭐'
      default: return '🎖️'
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading achievement analytics...</div>
  }

  if (!stats) {
    return <div className="flex items-center justify-center h-64">No achievement data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{stats.totalAchievements}</div>
          <div className="text-sm text-gray-600">Total Achievements</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">{stats.unlockedAchievements.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Unlocked</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600">{stats.unlockRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Unlock Rate</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-yellow-600">
            {(stats.unlockedAchievements / stats.totalAchievements).toFixed(0)}
          </div>
          <div className="text-sm text-gray-600">Avg Unlocks per Achievement</div>
        </div>
      </div>

      {/* Top Achievements */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Achievements</h3>
        <div className="space-y-4">
          {stats.topAchievements.map((achievement, index) => (
            <div key={achievement.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{achievement.name}</div>
                  <div className="text-sm text-gray-600">
                    {getCategoryIcon(achievement.category)} {achievement.category} •
                    <span className={`ml-1 ${getRarityColor(achievement.rarity)}`}>
                      {achievement.rarity}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">{achievement.unlocks.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Unlocks</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.categoryStats.map((category) => (
            <div key={category.category} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900">
                  {getCategoryIcon(category.category)} {category.category}
                </div>
                <div className={`text-sm font-semibold ${
                  category.unlockRate > 80 ? 'text-green-600' :
                  category.unlockRate > 60 ? 'text-yellow-600' :
                  category.unlockRate > 40 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {category.unlockRate.toFixed(1)}%
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">{category.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Unlocks:</span>
                  <span className="font-medium">{category.unlocks.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      category.unlockRate > 80 ? 'bg-green-600' :
                      category.unlockRate > 60 ? 'bg-yellow-600' :
                      category.unlockRate > 40 ? 'bg-orange-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${category.unlockRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Rarity Distribution</h4>
            <div className="space-y-2">
              {['common', 'uncommon', 'rare', 'epic', 'legendary'].map((rarity) => {
                const rarityCount = stats.topAchievements.filter(a => a.rarity === rarity).length
                const percentage = (rarityCount / stats.topAchievements.length) * 100
                return (
                  <div key={rarity} className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${getRarityColor(rarity)}`}>
                      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getRarityColor(rarity).replace('text', 'bg')}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Engagement Insights</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">High Engagement Categories:</span>
                <span className="font-medium text-green-600">
                  {stats.categoryStats
                    .filter(c => c.unlockRate > 70)
                    .map(c => c.category)
                    .join(', ')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Needs Improvement:</span>
                <span className="font-medium text-red-600">
                  {stats.categoryStats
                    .filter(c => c.unlockRate < 50)
                    .map(c => c.category)
                    .join(', ')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Most Popular:</span>
                <span className="font-medium text-blue-600">
                  {stats.categoryStats.reduce((prev, current) =>
                    prev.unlocks > current.unlocks ? prev : current
                  ).category}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { achievementManager } from '@/lib/achievements'

interface AchievementsDisplayProps {
  userId: string
  compact?: boolean
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
  unlockedAt?: string
  progress?: number
  maxProgress?: number
}

interface AchievementCategory {
  id: string
  name: string
  description: string
  achievements: Achievement[]
}

export default function AchievementsDisplay({ userId, compact = false }: AchievementsDisplayProps) {
  const [categories, setCategories] = useState<AchievementCategory[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [unlockedCount, setUnlockedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadAchievements()
  }, [userId])

  const loadAchievements = async () => {
    try {
      setLoading(true)

      // Load all achievements and user progress
      const allAchievements = await achievementManager.getAllAchievements()
      const userProgress = await achievementManager.getUserAchievements(userId)

      // Group achievements by category
      const categoriesMap = new Map<string, AchievementCategory>()
      let unlocked = 0
      let points = 0

      allAchievements.forEach(achievement => {
        const userAchievement = userProgress.find(ua => ua.id === achievement.id)
        const isUnlocked = !!userAchievement?.unlockedAt

        if (isUnlocked) {
          unlocked++
          points += achievement.points
        }

        const categoryId = typeof achievement.category === 'string' ? achievement.category : achievement.category.id
        if (!categoriesMap.has(categoryId)) {
          const categoryName = typeof achievement.category === 'string'
            ? achievement.category
            : achievement.category.name
          categoriesMap.set(categoryId, {
            id: categoryId,
            name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
            description: `${categoryName} related achievements`,
            achievements: []
          })
        }

        const category = categoriesMap.get(categoryId)!
        category.achievements.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          category: categoryId, // Convert to string for the component interface
          rarity: achievement.rarity.name as 'common' | 'rare' | 'epic' | 'legendary', // Convert rarity
          points: achievement.points,
          unlockedAt: userAchievement?.unlockedAt,
          progress: userAchievement?.progress || 0,
          maxProgress: userAchievement?.maxProgress || achievement.maxProgress || 1
        })
      })

      setCategories(Array.from(categoriesMap.values()))
      setTotalPoints(points)
      setUnlockedCount(unlocked)
      setTotalCount(allAchievements.length)
    } catch (error) {
      console.error('Error loading achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return '⭐'
      case 'rare': return '💎'
      case 'epic': return '🌟'
      case 'legendary': return '👑'
      default: return '⭐'
    }
  }

  const getCategoryProgress = (category: AchievementCategory) => {
    const unlocked = category.achievements.filter(a => a.unlockedAt).length
    return {
      unlocked,
      total: category.achievements.length,
      percentage: (unlocked / category.achievements.length) * 100
    }
  }

  const filteredCategories = selectedCategory
    ? categories.filter(cat => cat.id === selectedCategory)
    : categories

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading achievements...</div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Achievements</h3>
          <div className="text-sm text-gray-600">
            {unlockedCount}/{totalCount} • {totalPoints} pts
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.slice(0, 3).map(category => {
            const progress = getCategoryProgress(category)
            return (
              <div key={category.id} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{category.name}</h4>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{progress.unlocked}/{progress.total}</p>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => {}}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          View All Achievements
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Achievements</h1>
          <p className="text-xl text-gray-600 mb-6">
            Unlock achievements by completing challenges and reaching milestones
          </p>

          {/* Stats Overview */}
          <div className="flex justify-center space-x-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{unlockedCount}</div>
              <div className="text-sm text-gray-600">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{totalCount}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{totalPoints}</div>
              <div className="text-sm text-gray-600">Points</div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Categories
            </button>
            {categories.map(category => {
              const progress = getCategoryProgress(category)
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2 ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{category.name}</span>
                  <span className="text-xs">({progress.unlocked}/{progress.total})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="space-y-8">
          {filteredCategories.map(category => {
            const progress = getCategoryProgress(category)
            return (
              <div key={category.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Category Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{category.name}</h3>
                    <div className="text-blue-100">
                      {progress.unlocked}/{progress.total} unlocked
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-blue-800 bg-opacity-50 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Achievements */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.achievements.map(achievement => (
                      <div
                        key={achievement.id}
                        className={`rounded-lg border-2 p-6 transition-all duration-300 hover:shadow-lg ${
                          achievement.unlockedAt
                            ? 'border-green-300 bg-green-50'
                            : achievement.progress && achievement.progress > 0
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        {/* Achievement Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="text-3xl">{achievement.icon}</div>
                            <div>
                              <h4 className="font-bold text-gray-900">{achievement.name}</h4>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(achievement.rarity)}`}>
                                  {getRarityIcon(achievement.rarity)} {achievement.rarity}
                                </span>
                                <span className="text-sm text-gray-500">{achievement.points} pts</span>
                              </div>
                            </div>
                          </div>
                          {achievement.unlockedAt && (
                            <div className="text-green-600 text-2xl">✅</div>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-600 mb-4">{achievement.description}</p>

                        {/* Progress */}
                        {achievement.maxProgress && achievement.maxProgress > 1 && (
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{achievement.progress}/{achievement.maxProgress}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(achievement.progress! / achievement.maxProgress) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Unlocked Date */}
                        {achievement.unlockedAt && (
                          <div className="text-xs text-gray-500">
                            Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
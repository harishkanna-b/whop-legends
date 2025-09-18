'use client'

import { useState, useEffect } from 'react'
import { LevelingManager } from '@/lib/leveling'

interface LevelProgressionProps {
  userId: string
}

interface XPEvent {
  id: string
  type: string
  amount: number
  description: string
  timestamp: string
  metadata?: any
}

interface LevelProgress {
  level: number
  totalXP: number
  xpToNextLevel: number
  currentLevelXP: number
  characterClass: any
}

export default function LevelProgression({ userId }: LevelProgressionProps) {
  const [progress, setProgress] = useState<LevelProgress | null>(null)
  const [xpHistory, setXpHistory] = useState<XPEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadProgressionData()
  }, [userId])

  const loadProgressionData = async () => {
    try {
      setLoading(true)

      // Load user progression
      const userProgress = await LevelingManager.getUserProgression(userId)

      // Calculate XP requirements
      const xpToNextLevel = LevelingManager.calculateXPRequired(userProgress.level + 1, userProgress.characterClass)
      const xpForCurrentLevel = LevelingManager.calculateXPRequired(userProgress.level, userProgress.characterClass)
      const currentLevelXP = userProgress.totalXP - xpForCurrentLevel

      setProgress({
        level: userProgress.level,
        totalXP: userProgress.totalXP,
        xpToNextLevel,
        currentLevelXP,
        characterClass: userProgress.characterClass
      })

      // Load XP history
      const history = await LevelingManager.getXPHistory(userId, 20)
      setXpHistory(history)
    } catch (error) {
      console.error('Error loading progression data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercentage = () => {
    if (!progress) return 0
    return Math.min((progress.currentLevelXP / progress.xpToNextLevel) * 100, 100)
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'referral_created': return '🎯'
      case 'referral_completed': return '✅'
      case 'achievement': return '🏆'
      case 'bonus': return '🎁'
      case 'penalty': return '⚠️'
      default: return '⚡'
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'referral_created': return 'bg-blue-100 text-blue-800'
      case 'referral_completed': return 'bg-green-100 text-green-800'
      case 'achievement': return 'bg-yellow-100 text-yellow-800'
      case 'bonus': return 'bg-purple-100 text-purple-800'
      case 'penalty': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading progression...</div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600">Failed to load progression data</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Level Progress Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Level Progression</h3>
          <div className="flex items-center space-x-4">
            <span className="text-3xl font-bold text-blue-600">Level {progress.level}</span>
            {progress.characterClass && (
              <span className="text-2xl">{progress.characterClass.emoji}</span>
            )}
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>Level {progress.level}</span>
            <span>Level {progress.level + 1}</span>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-8">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-8 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-semibold text-sm drop-shadow">
                {progress.currentLevelXP.toLocaleString()} / {progress.xpToNextLevel.toLocaleString()} XP
              </span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{getProgressPercentage().toFixed(1)}% Complete</span>
            <span>{(progress.xpToNextLevel - progress.currentLevelXP).toLocaleString()} XP to go</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{progress.totalXP.toLocaleString()}</div>
            <div className="text-sm text-blue-600">Total XP</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{progress.xpToNextLevel.toLocaleString()}</div>
            <div className="text-sm text-green-600">Next Level</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {progress.characterClass ? `${progress.characterClass.xpMultiplier}x` : '1.0x'}
            </div>
            <div className="text-sm text-purple-600">XP Multiplier</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {Math.floor(progress.totalXP / 1000)}
            </div>
            <div className="text-sm text-yellow-600">Levels Earned</div>
          </div>
        </div>

        {/* XP History Toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
          >
            <span>{showHistory ? 'Hide' : 'Show'} XP History</span>
            <svg
              className={`w-4 h-4 transform transition-transform ${showHistory ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* XP History */}
      {showHistory && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h4 className="text-xl font-bold text-gray-900 mb-4">Recent XP Activity</h4>
          {xpHistory.length > 0 ? (
            <div className="space-y-3">
              {xpHistory.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventTypeColor(event.type)}`}>
                      {getEventTypeIcon(event.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{event.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleDateString()} at {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${event.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {event.amount > 0 ? '+' : ''}{event.amount.toLocaleString()} XP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No XP activity recorded yet
            </div>
          )}
        </div>
      )}

      {/* Level Preview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h4 className="text-xl font-bold text-gray-900 mb-4">Coming Up Next</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">Level {progress.level + 1} Benefits</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Increased XP rewards</li>
              <li>• New abilities unlocked</li>
              <li>• Higher referral limits</li>
              <li>• Special recognition</li>
            </ul>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">Milestone Levels</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Level 5</span>
                <span className="text-green-600 font-medium">Advanced Features</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level 10</span>
                <span className="text-blue-600 font-medium">Premium Rewards</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level 25</span>
                <span className="text-purple-600 font-medium">Legend Status</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level 50</span>
                <span className="text-yellow-600 font-medium">Master Rank</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { CharacterClassManager } from '@/lib/character-classes'
import { LevelingManager } from '@/lib/leveling'
import { UserProfileManager } from '@/lib/user-profile'

interface UserDashboardProps {
  userId: string
}

interface UserProfile {
  level: number
  totalXP: number
  characterClass: any
  stats: {
    totalReferrals: number
    completedReferrals: number
    totalValue: number
    averageReferralValue: number
  }
  recentActivity: Array<{
    type: string
    description: string
    timestamp: string
    value?: number
  }>
}

export default function UserDashboard({ userId }: UserDashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUserData()
  }, [userId])

  const loadUserData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load user profile data
      const profileData = await UserProfileManager.getProfile(userId)
      const progression = await LevelingManager.getUserProgression(userId)
      const userClass = await CharacterClassManager.getUserClass(userId)
      const characterClass = userClass ? CharacterClassManager.getClassById(userClass.classId) : null

      setProfile({
        level: progression.currentLevel,
        totalXP: progression.totalXP,
        characterClass,
        stats: profileData.stats,
        recentActivity: profileData.recentActivity.map((activity: any) => ({
          type: activity.type,
          description: activity.description,
          timestamp: activity.createdAt || activity.timestamp,
          value: activity.value
        }))
      })
    } catch (err) {
      console.error('Error loading user data:', err)
      setError('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error: {error || 'Failed to load profile'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Whop Legends Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Profile Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {profile.level}
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Level</p>
                <p className="text-2xl font-bold text-gray-900">{profile.level}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-lg">
                  ⚡
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total XP</p>
                <p className="text-2xl font-bold text-gray-900">{profile.totalXP.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-lg">
                  🎯
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Referrals</p>
                <p className="text-2xl font-bold text-gray-900">{profile.stats.totalReferrals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-white text-lg">
                  💰
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">${profile.stats.totalValue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Character Class Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Character Class</h2>
              </div>
              <div className="p-6">
                {profile.characterClass ? (
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl`}
                         style={{ backgroundColor: profile.characterClass.color + '20' }}>
                      {profile.characterClass.emoji}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{profile.characterClass.name}</h3>
                      <p className="text-gray-600">{profile.characterClass.description}</p>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {profile.characterClass.xpMultiplier}x XP Multiplier
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No character class selected</p>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      Choose Your Class
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                {profile.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {profile.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            {activity.type === 'referral' ? '🎯' : activity.type === 'level_up' ? '⬆️' : '⚡'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{activity.description}</p>
                            <p className="text-sm text-gray-500">{new Date(activity.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {activity.value && (
                          <div className="text-right">
                            <p className="font-bold text-green-600">+{activity.value} XP</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Level Progress</h2>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                    <span>Level {profile.level}</span>
                    <span>Level {profile.level + 1}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(profile.totalXP % 1000) / 10}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {profile.totalXP % 1000} / 1000 XP to next level
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Next Level Unlocks</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• New abilities</li>
                      <li>• Increased rewards</li>
                      <li>• Special features</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Achievement Progress</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Referral Master</span>
                        <span>{Math.min(profile.stats.totalReferrals, 10)}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min(profile.stats.totalReferrals, 10) * 10}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
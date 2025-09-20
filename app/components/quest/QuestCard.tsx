'use client';

import React, { useState } from 'react';

interface QuestCardProps {
  quest: {
    id: string;
    user_id: string;
    quest_id: string;
    progress_value: number;
    is_completed: boolean;
    completed_at: string | null;
    reward_claimed: boolean;
    reward_claimed_at: string | null;
    created_at: string;
    updated_at: string;
    quest?: {
      id: string;
      title: string;
      description: string;
      quest_type: 'daily' | 'weekly' | 'monthly' | 'special';
      difficulty: 'easy' | 'medium' | 'hard' | 'epic';
      target_type: 'referrals' | 'commission' | 'level' | 'achievements';
      target_value: number;
      reward_xp: number;
      reward_commission: number;
      start_date: string | null;
      end_date: string | null;
    };
    progress?: {
      quest_id: string;
      current_value: number;
      target_value: number;
      percentage: number;
      is_completed: boolean;
      time_remaining?: string;
    };
  };
  onUpdate: (questId: string, updatedQuest: any) => void;
  userId: string;
}

export function QuestCard({ quest, onUpdate, userId }: QuestCardProps) {
  const [loading, setLoading] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  if (!quest.quest) {
    return null;
  }

  const { quest: questData, progress } = quest;
  const isCompleted = quest.is_completed || progress?.is_completed;
  const percentage = progress?.percentage || 0;

  const handleClaimReward = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quests/${quest.quest_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'claim_reward'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the quest to show reward is claimed
        onUpdate(quest.id, {
          ...quest,
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestTypeIcon = (type: string) => {
    const icons = {
      daily: '📅',
      weekly: '📊',
      monthly: '📈',
      special: '⭐'
    };
    return icons[type as keyof typeof icons] || '📋';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      hard: 'text-orange-600 bg-orange-100',
      epic: 'text-purple-600 bg-purple-100'
    };
    return colors[difficulty as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const formatTimeRemaining = (timeRemaining?: string) => {
    if (!timeRemaining) return '';
    return `⏰ ${timeRemaining} remaining`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">{getQuestTypeIcon(questData.quest_type)}</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{questData.title}</h3>
              <p className="text-gray-600 text-sm mt-1">{questData.description}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(questData.difficulty)}`}>
                  {questData.difficulty.charAt(0).toUpperCase() + questData.difficulty.slice(1)}
                </span>
                <span className="text-xs text-gray-500">
                  {getQuestTypeIcon(questData.quest_type)} {questData.quest_type}
                </span>
                {progress?.time_remaining && (
                  <span className="text-xs text-gray-500">
                    {formatTimeRemaining(progress.time_remaining)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            {isCompleted && !quest.reward_claimed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✅ Ready to Claim
              </span>
            )}
            {quest.reward_claimed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                💎 Reward Claimed
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              {progress?.current_value || 0} / {questData.target_value} {questData.target_type}
            </span>
            <span>
              {questData.target_type === 'referrals' && 'referrals'}
              {questData.target_type === 'commission' && '$'}
              {questData.target_type === 'level' && 'levels'}
              {questData.target_type === 'achievements' && 'achievements'}
            </span>
          </div>
        </div>

        {/* Rewards */}
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => setShowRewards(!showRewards)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>💎 Rewards</span>
            <span>{showRewards ? '▲' : '▼'}</span>
          </button>

          {showRewards && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⭐</span>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Experience Points</p>
                    <p className="text-lg font-bold text-blue-700">{questData.reward_xp.toLocaleString()} XP</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">💰</span>
                  <div>
                    <p className="text-sm font-medium text-green-900">Commission</p>
                    <p className="text-lg font-bold text-green-700">${questData.reward_commission.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4 flex justify-end">
          {isCompleted && !quest.reward_claimed && (
            <button
              onClick={handleClaimReward}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Claiming...' : 'Claim Reward'}
            </button>
          )}
          {!isCompleted && (
            <button
              disabled
              className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
            >
              In Progress
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
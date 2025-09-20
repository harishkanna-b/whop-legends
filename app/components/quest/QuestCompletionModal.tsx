'use client';

import React from 'react';

interface QuestCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quest: {
    title: string;
    description: string;
    quest_type: 'daily' | 'weekly' | 'monthly' | 'special';
    difficulty: 'easy' | 'medium' | 'hard' | 'epic';
    reward_xp: number;
    reward_commission: number;
  };
  onClaimReward: () => void;
  loading: boolean;
}

export function QuestCompletionModal({
  isOpen,
  onClose,
  quest,
  onClaimReward,
  loading
}: QuestCompletionModalProps) {
  if (!isOpen) return null;

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      hard: 'text-orange-600 bg-orange-100',
      epic: 'text-purple-600 bg-purple-100'
    };
    return colors[difficulty as keyof typeof colors] || 'text-gray-600 bg-gray-100';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Quest Completed! 🎉</h3>
              <p className="text-blue-100 mt-1">Congratulations on your achievement!</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Quest Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getQuestTypeIcon(quest.quest_type)}</span>
                <h4 className="text-lg font-semibold text-gray-900">{quest.title}</h4>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quest.difficulty)}`}>
                {quest.difficulty.charAt(0).toUpperCase() + quest.difficulty.slice(1)}
              </span>
            </div>
            <p className="text-gray-600 text-sm">{quest.description}</p>
          </div>

          {/* Rewards */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Rewards 💎</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">⭐</div>
                <p className="text-sm text-blue-600 font-medium">Experience Points</p>
                <p className="text-xl font-bold text-blue-900">{quest.reward_xp.toLocaleString()} XP</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">💰</div>
                <p className="text-sm text-green-600 font-medium">Commission</p>
                <p className="text-xl font-bold text-green-900">${quest.reward_commission.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Achievement Animation */}
          <div className="text-center mb-6">
            <div className="text-6xl animate-bounce">🏆</div>
            <p className="text-gray-600 mt-2">Quest mastery achieved!</p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Maybe Later
            </button>
            <button
              onClick={onClaimReward}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Claiming...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Claim Rewards 💎
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
          <p className="text-sm text-gray-600 text-center">
            Rewards will be added to your account immediately
          </p>
        </div>
      </div>
    </div>
  );
}
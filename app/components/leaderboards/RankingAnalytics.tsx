'use client';

import React, { useState, useMemo } from 'react';
import { RankingEntry } from '@/lib/leaderboards/ranking-engine';

interface RankingAnalyticsProps {
  entries: RankingEntry[];
  currentUserId?: string;
  timeframe: string;
  category: string;
}

interface AnalyticsData {
  totalParticipants: number;
  averageScore: number;
  topScore: number;
  userRank?: number;
  userPercentile?: number;
  classDistribution: { [key: string]: number };
  scoreDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  rankDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

export function RankingAnalytics({
  entries,
  currentUserId,
  timeframe,
  category
}: RankingAnalyticsProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'class' | 'scores' | 'ranks'>('overview');

  const analyticsData: AnalyticsData = useMemo(() => {
    if (entries.length === 0) {
      return {
        totalParticipants: 0,
        averageScore: 0,
        topScore: 0,
        classDistribution: {},
        scoreDistribution: [],
        rankDistribution: []
      };
    }

    const totalParticipants = entries.length;
    const scores = entries.map(e => e.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalParticipants;
    const topScore = Math.max(...scores);

    // Find current user data
    const currentUserEntry = entries.find(e => e.user_id === currentUserId);
    const userRank = currentUserEntry?.rank;
    const userPercentile = userRank ? ((totalParticipants - userRank) / totalParticipants) * 100 : undefined;

    // Class distribution
    const classCounts = entries.reduce((acc, entry) => {
      acc[entry.character_class] = (acc[entry.character_class] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // Score distribution
    const scoreRanges = [
      { min: 0, max: averageScore * 0.5, label: 'Low' },
      { min: averageScore * 0.5, max: averageScore, label: 'Medium' },
      { min: averageScore, max: averageScore * 1.5, label: 'High' },
      { min: averageScore * 1.5, max: Infinity, label: 'Top' }
    ];

    const scoreDistribution = scoreRanges.map(range => ({
      range: range.label,
      count: entries.filter(e => e.score >= range.min && e.score < range.max).length,
      percentage: (entries.filter(e => e.score >= range.min && e.score < range.max).length / totalParticipants) * 100
    }));

    // Rank distribution
    const rankRanges = [
      { min: 1, max: 10, label: 'Top 10' },
      { min: 11, max: 50, label: 'Top 50' },
      { min: 51, max: 100, label: 'Top 100' },
      { min: 101, max: Infinity, label: 'Others' }
    ];

    const rankDistribution = rankRanges.map(range => ({
      range: range.label,
      count: entries.filter(e => e.rank >= range.min && e.rank <= range.max).length,
      percentage: (entries.filter(e => e.rank >= range.min && e.rank <= range.max).length / totalParticipants) * 100
    }));

    return {
      totalParticipants,
      averageScore: Math.round(averageScore),
      topScore: Math.round(topScore),
      userRank,
      userPercentile,
      classDistribution: classCounts,
      scoreDistribution,
      rankDistribution
    };
  }, [entries, currentUserId]);

  const getClassIcon = (characterClass: string) => {
    const icons: { [key: string]: string } = {
      scout: '🔍',
      sage: '📚',
      champion: '🏆',
      merchant: '💰'
    };
    return icons[characterClass] || '👤';
  };

  const getClassName = (characterClass: string) => {
    const names: { [key: string]: string } = {
      scout: 'Scout',
      sage: 'Sage',
      champion: 'Champion',
      merchant: 'Merchant'
    };
    return names[characterClass] || characterClass;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Analytics & Insights</h3>
        <div className="flex space-x-2">
          {(['overview', 'class', 'scores', 'ranks'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-3 py-1 rounded-md text-sm font-medium capitalize ${
                selectedView === view
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Participants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.totalParticipants.toLocaleString()}
                </p>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.averageScore.toLocaleString()}
                </p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.topScore.toLocaleString()}
                </p>
              </div>
              <div className="text-3xl">🥇</div>
            </div>
          </div>

          {currentUserId && analyticsData.userRank && (
            <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Your Rank</p>
                  <p className="text-2xl font-bold text-blue-900">
                    #{analyticsData.userRank}
                  </p>
                  {analyticsData.userPercentile && (
                    <p className="text-sm text-blue-700">
                      Top {Math.round(100 - analyticsData.userPercentile)}%
                    </p>
                  )}
                </div>
                <div className="text-3xl">🎯</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Class Distribution */}
      {selectedView === 'class' && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Character Class Distribution</h4>
          <div className="space-y-3">
            {Object.entries(analyticsData.classDistribution).map(([className, count]) => (
              <div key={className} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getClassIcon(className)}</span>
                  <span className="text-sm font-medium text-gray-900">{getClassName(className)}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(count / analyticsData.totalParticipants) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {count} ({((count / analyticsData.totalParticipants) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Distribution */}
      {selectedView === 'scores' && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Score Distribution</h4>
          <div className="space-y-3">
            {analyticsData.scoreDistribution.map((range) => (
              <div key={range.range} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{range.range}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${range.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {range.count} ({range.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rank Distribution */}
      {selectedView === 'ranks' && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Rank Distribution</h4>
          <div className="space-y-3">
            {analyticsData.rankDistribution.map((range) => (
              <div key={range.range} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{range.range}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${range.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {range.count} ({range.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <h4 className="text-md font-semibold text-blue-900 mb-3">Key Insights</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Most participants are in the {analyticsData.scoreDistribution.reduce((max, curr) => curr.percentage > max.percentage ? curr : max).range} score range</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>The {Object.entries(analyticsData.classDistribution).reduce((max, [className, count]) => count > max[1] ? [className, count] : max, ['', 0])[0]} class has the most participants</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Top 10% of participants are in the top {Math.round(analyticsData.totalParticipants * 0.1)} ranks</span>
          </li>
          {analyticsData.userPercentile && (
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>You're performing better than {Math.round(analyticsData.userPercentile)}% of participants</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { RankingEngine, RankingEntry, LeaderboardConfig } from '@/lib/leaderboards/ranking-engine';

interface LeaderboardDisplayProps {
  companyId: string;
  category: 'overall' | 'referrals' | 'commission' | 'engagement' | 'quests' | 'retention';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time';
  limit?: number;
}

export function LeaderboardDisplay({ companyId, category, timeframe, limit = 100 }: LeaderboardDisplayProps) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [userRank, setUserRank] = useState<RankingEntry | null>(null);
  const [showUserRank, setShowUserRank] = useState(false);

  const rankingEngine = new RankingEngine();

  useEffect(() => {
    fetchLeaderboard();
  }, [companyId, category, timeframe, page]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboards/${category}?companyId=${companyId}&timeframe=${timeframe}&limit=${limit}&page=${page}`);

      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        setTotalEntries(data.pagination.total_entries);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const refreshLeaderboard = async () => {
    try {
      const response = await fetch(`/api/leaderboards/${category}?companyId=${companyId}&timeframe=${timeframe}&action=refresh`, {
        method: 'POST'
      });

      if (response.ok) {
        await fetchLeaderboard();
      }
    } catch (err) {
      console.error('Error refreshing leaderboard:', err);
    }
  };

  const fetchUserRank = async () => {
    try {
      const response = await fetch(`/api/rankings/${category}/${timeframe}?companyId=${companyId}&userId=${userRank?.user_id}`);

      if (response.ok) {
        const data = await response.json();
        if (data.user_ranking) {
          setUserRank(data.user_ranking);
          setShowUserRank(true);
        }
      }
    } catch (err) {
      console.error('Error fetching user rank:', err);
    }
  };

  const formatCategory = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const formatTimeframe = (tf: string) => {
    switch (tf) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'all_time': return 'All Time';
      default: return tf;
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '⭐';
    if (rank <= 50) return '🎯';
    return '📊';
  };

  const getChangeIcon = (change?: string) => {
    switch (change) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'new': return '🆕';
      default: return '➡️';
    }
  };

  const getChangeColor = (change?: string) => {
    switch (change) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'new': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getClassIcon = (characterClass: string) => {
    const icons = {
      scout: '🔍',
      sage: '📚',
      champion: '🏆',
      merchant: '💰'
    };
    return icons[characterClass as keyof typeof icons] || '👤';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchLeaderboard}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {formatCategory(category)} Leaderboard
          </h2>
          <p className="text-gray-600">{formatTimeframe(timeframe)} rankings</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={refreshLeaderboard}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
          {showUserRank && userRank && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-sm text-blue-800">
                Your Rank: #{userRank.rank} ({((userRank.rank / entries.length) * 100).toFixed(1)}th percentile)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Winners */}
      {entries.length >= 3 && (
        <div className="flex justify-center items-end space-x-4 py-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="text-6xl mb-2">🥈</div>
            <div className="bg-gray-100 rounded-lg p-4 text-center min-w-[120px]">
              <div className="text-2xl font-bold text-gray-700">{entries[1].username}</div>
              <div className="text-sm text-gray-600">2nd Place</div>
              <div className="text-lg font-semibold text-gray-800 mt-2">
                {Math.round(entries[1].score).toLocaleString()}
              </div>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center -mt-4">
            <div className="text-8xl mb-2">🥇</div>
            <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-6 text-center min-w-[140px]">
              <div className="text-3xl font-bold text-yellow-800">{entries[0].username}</div>
              <div className="text-sm text-yellow-700">1st Place</div>
              <div className="text-xl font-bold text-yellow-800 mt-2">
                {Math.round(entries[0].score).toLocaleString()}
              </div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="text-6xl mb-2">🥉</div>
            <div className="bg-orange-100 rounded-lg p-4 text-center min-w-[120px]">
              <div className="text-2xl font-bold text-orange-700">{entries[2].username}</div>
              <div className="text-sm text-orange-600">3rd Place</div>
              <div className="text-lg font-semibold text-orange-800 mt-2">
                {Math.round(entries[2].score).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={`hover:bg-gray-50 ${
                    entry.rank <= 3 ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getRankIcon(entry.rank)}</span>
                      <span className="text-lg font-bold text-gray-900">#{entry.rank}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {entry.avatar ? (
                          <img className="h-10 w-10 rounded-full" src={entry.avatar} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {entry.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.username}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            {getClassIcon(entry.character_class)} {entry.character_class}
                          </span>
                          <span>•</span>
                          <span>Lvl {entry.level}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-bold text-gray-900">
                      {Math.round(entry.score).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.rank === 1 ? '👑 Champion' :
                       entry.rank <= 10 ? '⭐ Top 10' :
                       entry.rank <= 50 ? '🎯 Top 50' : 'Contender'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {category === 'referrals' && `${entry.metrics.total_referrals} referrals`}
                      {category === 'commission' && `$${entry.metrics.total_commission.toLocaleString()}`}
                      {category === 'engagement' && `${entry.metrics.engagement_score.toFixed(1)}% engagement`}
                      {category === 'quests' && `${entry.metrics.quest_completion_rate.toFixed(1)}% completion`}
                      {category === 'retention' && `${entry.metrics.retention_rate.toFixed(1)}% retention`}
                      {category === 'overall' && `Overall performance`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.metrics.conversion_rate.toFixed(1)}% conversion
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={getChangeColor(entry.change)}>
                        {getChangeIcon(entry.change)}
                      </span>
                      {entry.previous_rank && (
                        <span className={`text-sm ${getChangeColor(entry.change)}`}>
                          {entry.change === 'up' ? `+${entry.previous_rank - entry.rank}` :
                           entry.change === 'down' ? `-${entry.rank - entry.previous_rank}` :
                           entry.change === 'new' ? 'New' : 'Same'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalEntries > limit && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(Math.ceil(totalEntries / limit), page + 1))}
                disabled={page >= Math.ceil(totalEntries / limit)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(page * limit, totalEntries)}
                  </span>{' '}
                  of <span className="font-medium">{totalEntries.toLocaleString()}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, Math.ceil(totalEntries / limit)) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(Math.ceil(totalEntries / limit) - 4, page - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(Math.ceil(totalEntries / limit), page + 1))}
                    disabled={page >= Math.ceil(totalEntries / limit)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Rankings Yet</h3>
          <p className="text-gray-600">Complete activities to appear on the leaderboard!</p>
        </div>
      )}
    </div>
  );
}
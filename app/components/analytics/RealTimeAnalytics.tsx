'use client';

import React, { useState, useEffect } from 'react';
import { useAnalyticsUpdates } from '@/lib/websocket/hooks';
import { useConnectionStatus } from '@/lib/websocket/hooks';

interface RealTimeAnalyticsProps {
  companyId: string;
  onAnalyticsUpdate?: (data: any) => void;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  amount?: number;
  timestamp: Date;
}

export function RealTimeAnalytics({
  companyId,
  onAnalyticsUpdate
}: RealTimeAnalyticsProps) {
  const { analyticsData, isConnected } = useAnalyticsUpdates(companyId);
  const { connect, disconnect } = useConnectionStatus();
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Convert analytics data to activity items
  useEffect(() => {
    const activityItems: ActivityItem[] = analyticsData.recentActivity.map((activity, index) => ({
      id: `${activity.type}-${index}`,
      type: activity.type,
      description: getActivityDescription(activity),
      amount: getActivityAmount(activity),
      timestamp: activity.timestamp
    }));

    setRecentActivity(activityItems);

    // Notify parent component of analytics updates
    if (Object.keys(analyticsData).length > 0) {
      onAnalyticsUpdate?.(analyticsData);
    }
  }, [analyticsData, onAnalyticsUpdate]);

  const getActivityDescription = (activity: any): string => {
    switch (activity.type) {
      case 'referral_created':
        return `New referral by ${activity.payload?.username || 'User'}`;
      case 'commission_earned':
        return `Commission earned: $${activity.payload?.amount?.toFixed(2) || '0.00'}`;
      case 'user_level_up':
        return `${activity.payload?.username || 'User'} leveled up to ${activity.payload?.level || 'N/A'}`;
      case 'analytics_updated':
        return 'Analytics data refreshed';
      default:
        return 'Activity updated';
    }
  };

  const getActivityAmount = (activity: any): number | undefined => {
    if (activity.type === 'commission_earned') {
      return activity.payload?.amount;
    }
    return undefined;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'referral_created':
        return '👥';
      case 'commission_earned':
        return '💰';
      case 'user_level_up':
        return '⭐';
      case 'analytics_updated':
        return '📊';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'referral_created':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'commission_earned':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'user_level_up':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'analytics_updated':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Real-Time Analytics</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live' : 'Offline'}
          </span>
          <button
            onClick={isConnected ? disconnect : connect}
            className="px-3 py-1 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Referrals</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.totalReferrals.toLocaleString()}
              </p>
              <p className="text-xs text-green-600">+12% from last week</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Commission</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.totalCommission)}
              </p>
              <p className="text-xs text-green-600">+8% from last week</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.activeUsers.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600">+5% from last week</p>
            </div>
            <div className="text-3xl">👤</div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Recent Activity</h4>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {recentActivity.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getActivityIcon(activity.type)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description}
                        </p>
                        {activity.amount !== undefined && (
                          <p className="text-xs text-gray-600">
                            Amount: {formatCurrency(activity.amount)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getActivityColor(activity.type)}`}>
                        {activity.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-900 mb-2">🚀 Performance Metrics</h4>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex justify-between">
              <span>Avg. Response Time:</span>
              <span className="font-medium">45ms</span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate:</span>
              <span className="font-medium">99.8%</span>
            </div>
            <div className="flex justify-between">
              <span>Active Connections:</span>
              <span className="font-medium">{isConnected ? '1' : '0'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">⚡ System Status</h4>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex justify-between">
              <span>WebSocket Status:</span>
              <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Update:</span>
              <span className="font-medium">
                {recentActivity.length > 0 ? formatTimeAgo(recentActivity[0].timestamp) : 'Never'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Data Freshness:</span>
              <span className="font-medium text-green-600">Real-time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Updates Badge */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-800">Live Updates Active</span>
        </div>
      </div>
    </div>
  );
}
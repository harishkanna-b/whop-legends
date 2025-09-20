'use client';

import React, { useState, useEffect } from 'react';
import { AnalyticsEngine, DashboardData, AnalyticsMetric } from '@/lib/analytics/analytics-engine';

interface AnalyticsDashboardProps {
  companyId: string;
}

interface ChartDataPoint {
  date: string;
  value: number;
  label: string;
}

export function AnalyticsDashboard({ companyId }: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['referrals', 'commission']);

  const analyticsEngine = new AnalyticsEngine();

  useEffect(() => {
    fetchDashboardData();
  }, [companyId, timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await analyticsEngine.getDashboardData(companyId, timeframe);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (percent: number) => {
    return `${percent.toFixed(1)}%`;
  };

  const getMetricIcon = (type: string) => {
    const icons = {
      referrals: '👥',
      commission: '💰',
      engagement: '📊',
      retention: '🔄',
      conversion: '🎯',
      growth: '📈'
    };
    return icons[type as keyof typeof icons] || '📊';
  };

  const getMetricColor = (change: number, changeType: string) => {
    if (changeType === 'increase') {
      return change > 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return change > 0 ? 'text-red-600' : 'text-green-600';
    }
  };

  const getInsightIcon = (type: string) => {
    const icons = {
      trend: '📈',
      opportunity: '💡',
      warning: '⚠️',
      achievement: '🏆',
      recommendation: '🎯'
    };
    return icons[type as keyof typeof icons] || '💡';
  };

  const getInsightColor = (type: string) => {
    const colors = {
      trend: 'border-blue-200 bg-blue-50',
      opportunity: 'border-green-200 bg-green-50',
      warning: 'border-yellow-200 bg-yellow-50',
      achievement: 'border-purple-200 bg-purple-50',
      recommendation: 'border-indigo-200 bg-indigo-50'
    };
    return colors[type as keyof typeof colors] || 'border-gray-200 bg-gray-50';
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
          onClick={refreshData}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Track your community's performance and growth</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={refreshData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardData.overview.total_members)}
              </p>
              <p className={`text-sm ${dashboardData.overview.member_growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dashboardData.overview.member_growth_rate >= 0 ? '↑' : '↓'} {Math.abs(dashboardData.overview.member_growth_rate).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Commission</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardData.overview.total_commission)}
              </p>
              <p className={`text-sm ${dashboardData.overview.revenue_growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dashboardData.overview.revenue_growth_rate >= 0 ? '↑' : '↓'} {Math.abs(dashboardData.overview.revenue_growth_rate).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardData.overview.active_members)}
              </p>
              <p className="text-sm text-gray-600">
                {formatPercentage((dashboardData.overview.active_members / dashboardData.overview.total_members) * 100)} active
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(dashboardData.overview.average_conversion_rate)}
              </p>
              <p className="text-sm text-gray-600">Average rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData.metrics.map((metric) => (
              <div key={metric.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{getMetricIcon(metric.type)}</span>
                  <span className={`text-sm font-medium ${getMetricColor(metric.change, metric.change_type)}`}>
                    {metric.change_type === 'increase' ? '↑' : '↓'} {metric.change.toFixed(1)}%
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">{metric.name}</h4>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metric.type === 'commission' ? formatCurrency(metric.value) : formatNumber(metric.value)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{metric.period}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {dashboardData.top_performers.slice(0, 5).map((performer, index) => (
              <div key={performer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-bold text-gray-500">#{index + 1}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">{performer.username}</h4>
                    <p className="text-sm text-gray-600">{performer.character_class} • Level {performer.level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(performer.total_commission)}</p>
                  <p className="text-sm text-gray-600">{formatNumber(performer.total_referrals)} referrals</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {dashboardData.recent_activity.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{activity.username}</p>
                  <p className="text-sm text-gray-600">{activity.action}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action.includes('commission') ? formatCurrency(activity.value) : formatNumber(activity.value)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      {dashboardData.insights.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Insights & Recommendations</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.insights.slice(0, 3).map((insight) => (
                <div
                  key={insight.id}
                  className={`border-l-4 p-4 rounded-lg ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{insight.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                          insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {insight.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                      {insight.actionable && (
                        <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                          View Details →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
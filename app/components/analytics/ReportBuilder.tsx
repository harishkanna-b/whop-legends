'use client';

import React, { useState, useEffect } from 'react';
import { AnalyticsEngine } from '@/lib/analytics/analytics-engine';

interface ReportBuilderProps {
  companyId: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'engagement' | 'retention' | 'growth';
  timeframe: '7d' | '30d' | '90d';
  lastGenerated: string | null;
}

export function ReportBuilder({ companyId }: ReportBuilderProps) {
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analyticsEngine = new AnalyticsEngine();

  const predefinedTemplates: ReportTemplate[] = [
    {
      id: 'performance_summary',
      name: 'Performance Summary',
      description: 'Comprehensive overview of member performance metrics',
      type: 'performance',
      timeframe: '30d',
      lastGenerated: null
    },
    {
      id: 'engagement_analysis',
      name: 'Engagement Analysis',
      description: 'Deep dive into member engagement and activity patterns',
      type: 'engagement',
      timeframe: '30d',
      lastGenerated: null
    },
    {
      id: 'retention_report',
      name: 'Retention Report',
      description: 'Member retention and churn analysis',
      type: 'retention',
      timeframe: '90d',
      lastGenerated: null
    },
    {
      id: 'growth_analysis',
      name: 'Growth Analysis',
      description: 'Community growth and expansion metrics',
      type: 'growth',
      timeframe: '30d',
      lastGenerated: null
    },
    {
      id: 'weekly_summary',
      name: 'Weekly Summary',
      description: 'Weekly performance and activity summary',
      type: 'performance',
      timeframe: '7d',
      lastGenerated: null
    }
  ];

  useEffect(() => {
    fetchRecentReports();
  }, [companyId]);

  const fetchRecentReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/generate?companyId=${companyId}`);
      if (response.ok) {
        const reports = await response.json();
        // Update lastGenerated for templates
        const updatedTemplates = predefinedTemplates.map(template => {
          const recentReport = reports.find((r: any) => r.report_type === template.type);
          return {
            ...template,
            lastGenerated: recentReport?.generated_at || null
          };
        });
        setReportTemplates(updatedTemplates);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (template: ReportTemplate) => {
    try {
      setGenerating(true);
      setSelectedTemplate(template);

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          reportType: template.type,
          timeframe: template.timeframe
        }),
      });

      if (response.ok) {
        const report = await response.json();
        console.log('Report generated:', report);
        await fetchRecentReports(); // Refresh the list
      } else {
        setError('Failed to generate report');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
    } finally {
      setGenerating(false);
      setSelectedTemplate(null);
    }
  };

  const downloadReport = async (template: ReportTemplate) => {
    try {
      const response = await fetch(`/api/reports/generate?companyId=${companyId}&reportType=${template.type}`);
      if (response.ok) {
        const report = await response.json();

        // Create JSON download
        const dataStr = JSON.stringify(report, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `${template.name}_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
    }
  };

  const formatTimeframe = (timeframe: string) => {
    switch (timeframe) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      default: return timeframe;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getReportIcon = (type: string) => {
    const icons = {
      performance: '📊',
      engagement: '💬',
      retention: '🔄',
      growth: '📈'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const getReportColor = (type: string) => {
    const colors = {
      performance: 'border-blue-200 bg-blue-50',
      engagement: 'border-green-200 bg-green-50',
      retention: 'border-yellow-200 bg-yellow-50',
      growth: 'border-purple-200 bg-purple-50'
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Builder</h2>
          <p className="text-gray-600">Generate and download detailed analytics reports</p>
        </div>
        <button
          onClick={fetchRecentReports}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTemplates.map((template) => (
          <div
            key={template.id}
            className={`border-2 rounded-lg p-6 ${getReportColor(template.type)} hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getReportIcon(template.type)}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{template.type}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{template.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Timeframe:</span>
                <span className="font-medium">{formatTimeframe(template.timeframe)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last generated:</span>
                <span className="font-medium">{formatDate(template.lastGenerated)}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => generateReport(template)}
                disabled={generating && selectedTemplate?.id === template.id}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {generating && selectedTemplate?.id === template.id ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Generating...
                  </span>
                ) : (
                  'Generate Report'
                )}
              </button>
              {template.lastGenerated && (
                <button
                  onClick={() => downloadReport(template)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Report Builder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Report Builder</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="performance">Performance</option>
              <option value="engagement">Engagement</option>
              <option value="retention">Retention</option>
              <option value="growth">Growth</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="once">Generate Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Create Custom Report
          </button>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {reportTemplates
              .filter(template => template.lastGenerated)
              .sort((a, b) => new Date(b.lastGenerated!).getTime() - new Date(a.lastGenerated!).getTime())
              .slice(0, 5)
              .map((template) => (
                <div key={template.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getReportIcon(template.type)}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600">
                        Generated on {formatDate(template.lastGenerated)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadReport(template)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Download
                  </button>
                </div>
              ))}
            {reportTemplates.filter(template => template.lastGenerated).length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No reports generated yet. Create your first report above.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
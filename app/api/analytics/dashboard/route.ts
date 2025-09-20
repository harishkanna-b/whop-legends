import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsEngine } from '@/lib/analytics/analytics-engine';

const analyticsEngine = new AnalyticsEngine();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const timeframe = searchParams.get('timeframe') as '7d' | '30d' | '90d' || '30d';

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const dashboardData = await analyticsEngine.getDashboardData(companyId, timeframe);

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId, timeframe } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Force refresh dashboard data by clearing cache
    // In a real implementation, you'd have a cache invalidation method
    const dashboardData = await analyticsEngine.getDashboardData(companyId, timeframe || '30d');

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error refreshing dashboard data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
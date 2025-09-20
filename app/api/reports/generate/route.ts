import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsEngine } from '@/lib/analytics/analytics-engine';
import { supabase } from '@/lib/supabase-client';

const analyticsEngine = new AnalyticsEngine();

export async function POST(request: NextRequest) {
  try {
    const { companyId, reportType, timeframe, filters } = await request.json();

    if (!companyId || !reportType) {
      return NextResponse.json({
        error: 'Company ID and report type are required'
      }, { status: 400 });
    }

    const report = await analyticsEngine.generateReport(
      companyId,
      reportType,
      timeframe || '30d'
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const reportType = searchParams.get('reportType');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Get available reports
    if (!reportType) {
      const { data: reports } = await supabase
        .from('report_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('generated_at', { ascending: false })
        .limit(50);

      return NextResponse.json(reports || []);
    }

    // Get specific report
    const { data: report } = await supabase
      .from('report_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('report_type', reportType)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
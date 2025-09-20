import { supabase } from '@/lib/supabase-client';

export interface AnalyticsMetric {
  id: string;
  name: string;
  type: 'referrals' | 'commission' | 'engagement' | 'retention' | 'conversion';
  value: number;
  change: number;
  change_type: 'increase' | 'decrease';
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  timestamp: string;
}

export interface MemberPerformance {
  id: string;
  user_id: string;
  username: string;
  avatar?: string;
  total_referrals: number;
  total_commission: number;
  conversion_rate: number;
  engagement_score: number;
  retention_rate: number;
  quest_completion_rate: number;
  last_active: string;
  join_date: string;
  character_class: string;
  level: number;
  rank: number;
}

export interface CreatorInsight {
  id: string;
  type: 'trend' | 'opportunity' | 'warning' | 'achievement';
  category: 'performance' | 'engagement' | 'retention' | 'growth';
  title: string;
  description: string;
  data: any;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface DashboardData {
  overview: {
    total_members: number;
    active_members: number;
    total_referrals: number;
    total_commission: number;
    average_conversion_rate: number;
    member_growth_rate: number;
    revenue_growth_rate: number;
  };
  metrics: AnalyticsMetric[];
  top_performers: MemberPerformance[];
  recent_activity: Array<{
    id: string;
    user_id: string;
    username: string;
    action: string;
    value: number;
    timestamp: string;
  }>;
  insights: CreatorInsight[];
}

export class AnalyticsEngine {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getDashboardData(companyId: string, timeframe: '7d' | '30d' | '90d' = '30d'): Promise<DashboardData> {
    const cacheKey = `dashboard_${companyId}_${timeframe}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const [overview, metrics, topPerformers, recentActivity, insights] = await Promise.all([
      this.getOverviewData(companyId, timeframe),
      this.getAnalyticsMetrics(companyId, timeframe),
      this.getTopPerformers(companyId, 10),
      this.getRecentActivity(companyId, 20),
      this.generateCreatorInsights(companyId)
    ]);

    const dashboardData: DashboardData = {
      overview,
      metrics,
      top_performers: topPerformers,
      recent_activity: recentActivity,
      insights
    };

    this.cache.set(cacheKey, { data: dashboardData, timestamp: Date.now() });
    return dashboardData;
  }

  private async getOverviewData(companyId: string, timeframe: string) {
    const endDate = new Date();
    const startDate = this.getTimeframeStartDate(timeframe);

    const { data: members, error: membersError } = await supabase
      .from('user_profiles')
      .select('id, created_at, total_referrals, total_commission, is_active')
      .eq('company_id', companyId);

    if (membersError) throw membersError;

    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('id, created_at, converted_at, commission_amount')
      .eq('company_id', companyId)
      .gte('created_at', startDate.toISOString());

    if (referralsError) throw referralsError;

    const totalMembers = members?.length || 0;
    const activeMembers = members?.filter(m => m.is_active).length || 0;
    const totalReferrals = referrals?.length || 0;
    const totalCommission = referrals?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;
    const convertedReferrals = referrals?.filter(r => r.converted_at).length || 0;
    const averageConversionRate = totalReferrals > 0 ? (convertedReferrals / totalReferrals) * 100 : 0;

    // Calculate growth rates (comparing with previous period)
    const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const { data: previousPeriodData } = await supabase
      .from('referrals')
      .select('id, created_at, commission_amount')
      .eq('company_id', companyId)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString());

    const previousReferrals = previousPeriodData?.length || 0;
    const previousCommission = previousPeriodData?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;

    const memberGrowthRate = totalMembers > 0
      ? ((totalMembers - previousReferrals) / previousReferrals) * 100
      : 0;

    const revenueGrowthRate = totalCommission > 0
      ? ((totalCommission - previousCommission) / previousCommission) * 100
      : 0;

    return {
      total_members: totalMembers,
      active_members: activeMembers,
      total_referrals: totalReferrals,
      total_commission: totalCommission,
      average_conversion_rate: averageConversionRate,
      member_growth_rate: memberGrowthRate,
      revenue_growth_rate: revenueGrowthRate
    };
  }

  private async getAnalyticsMetrics(companyId: string, timeframe: string): Promise<AnalyticsMetric[]> {
    const startDate = this.getTimeframeStartDate(timeframe);

    // Get daily metrics for the period
    const { data: dailyData, error } = await supabase
      .from('analytics_aggregations')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (error) throw error;

    if (!dailyData || dailyData.length === 0) {
      return this.generateMockMetrics(companyId, timeframe);
    }

    const metrics: AnalyticsMetric[] = [];

    // Calculate referral metrics
    const referralValues = dailyData.map(d => d.total_referrals || 0);
    const referralChange = this.calculateChange(referralValues);
    metrics.push({
      id: `${companyId}_referrals_${timeframe}`,
      name: 'Total Referrals',
      type: 'referrals',
      value: referralValues[referralValues.length - 1] || 0,
      change: Math.abs(referralChange),
      change_type: referralChange >= 0 ? 'increase' : 'decrease',
      period: this.mapTimeframeToPeriod(timeframe),
      timestamp: new Date().toISOString()
    });

    // Calculate commission metrics
    const commissionValues = dailyData.map(d => d.total_commission || 0);
    const commissionChange = this.calculateChange(commissionValues);
    metrics.push({
      id: `${companyId}_commission_${timeframe}`,
      name: 'Total Commission',
      type: 'commission',
      value: commissionValues[commissionValues.length - 1] || 0,
      change: Math.abs(commissionChange),
      change_type: commissionChange >= 0 ? 'increase' : 'decrease',
      period: this.mapTimeframeToPeriod(timeframe),
      timestamp: new Date().toISOString()
    });

    // Calculate engagement metrics
    const engagementValues = dailyData.map(d => d.active_users || 0);
    const engagementChange = this.calculateChange(engagementValues);
    metrics.push({
      id: `${companyId}_engagement_${timeframe}`,
      name: 'Active Members',
      type: 'engagement',
      value: engagementValues[engagementValues.length - 1] || 0,
      change: Math.abs(engagementChange),
      change_type: engagementChange >= 0 ? 'increase' : 'decrease',
      period: this.mapTimeframeToPeriod(timeframe),
      timestamp: new Date().toISOString()
    });

    // Calculate conversion metrics
    const conversionValues = dailyData.map(d => d.conversion_rate || 0);
    const conversionChange = this.calculateChange(conversionValues);
    metrics.push({
      id: `${companyId}_conversion_${timeframe}`,
      name: 'Conversion Rate',
      type: 'conversion',
      value: conversionValues[conversionValues.length - 1] || 0,
      change: Math.abs(conversionChange),
      change_type: conversionChange >= 0 ? 'increase' : 'decrease',
      period: this.mapTimeframeToPeriod(timeframe),
      timestamp: new Date().toISOString()
    });

    return metrics;
  }

  private async getTopPerformers(companyId: string, limit: number): Promise<MemberPerformance[]> {
    const { data: members, error } = await supabase
      .from('member_performance_stats')
      .select(`
        user_id,
        username,
        avatar,
        total_referrals,
        total_commission,
        conversion_rate,
        engagement_score,
        retention_rate,
        quest_completion_rate,
        last_active,
        join_date,
        character_class,
        level
      `)
      .eq('company_id', companyId)
      .order('total_commission', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (members || []).map((member, index) => ({
      id: member.user_id,
      user_id: member.user_id,
      username: member.username,
      avatar: member.avatar,
      total_referrals: member.total_referrals || 0,
      total_commission: member.total_commission || 0,
      conversion_rate: member.conversion_rate || 0,
      engagement_score: member.engagement_score || 0,
      retention_rate: member.retention_rate || 0,
      quest_completion_rate: member.quest_completion_rate || 0,
      last_active: member.last_active,
      join_date: member.join_date,
      character_class: member.character_class,
      level: member.level || 1,
      rank: index + 1
    }));
  }

  private async getRecentActivity(companyId: string, limit: number) {
    const { data: activity, error } = await supabase
      .from('recent_activity')
      .select('*')
      .eq('company_id', companyId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (activity || []).map(act => ({
      id: act.id,
      user_id: act.user_id,
      username: act.username,
      action: act.action,
      value: act.value,
      timestamp: act.timestamp
    }));
  }

  private async generateCreatorInsights(companyId: string): Promise<CreatorInsight[]> {
    const insights: CreatorInsight[] = [];
    const now = new Date().toISOString();

    // Get recent performance data
    const { data: performance } = await supabase
      .from('member_performance_stats')
      .select('*')
      .eq('company_id', companyId)
      .order('last_active', { ascending: false });

    if (!performance || performance.length === 0) {
      return insights;
    }

    // Check for low engagement
    const avgEngagement = performance.reduce((sum, p) => sum + (p.engagement_score || 0), 0) / performance.length;
    if (avgEngagement < 50) {
      insights.push({
        id: `${companyId}_low_engagement_${now}`,
        type: 'warning',
        category: 'engagement',
        title: 'Low Member Engagement',
        description: `Average engagement score is ${avgEngagement.toFixed(1)}%. Consider implementing engagement strategies.`,
        data: { avg_engagement: avgEngagement },
        actionable: true,
        priority: 'high',
        created_at: now
      });
    }

    // Check for high performers
    const topPerformers = performance.filter(p => (p.total_commission || 0) > 1000);
    if (topPerformers.length > 0) {
      insights.push({
        id: `${companyId}_top_performers_${now}`,
        type: 'achievement',
        category: 'performance',
        title: 'Top Performers Identified',
        description: `${topPerformers.length} members have generated over $1000 in commission.`,
        data: { top_performers: topPerformers.length },
        actionable: true,
        priority: 'medium',
        created_at: now
      });
    }

    // Check conversion rate trends
    const avgConversion = performance.reduce((sum, p) => sum + (p.conversion_rate || 0), 0) / performance.length;
    if (avgConversion > 30) {
      insights.push({
        id: `${companyId}_high_conversion_${now}`,
        type: 'opportunity',
        category: 'growth',
        title: 'High Conversion Rate',
        description: `Average conversion rate is ${avgConversion.toFixed(1)}%. Consider scaling successful strategies.`,
        data: { avg_conversion: avgConversion },
        actionable: true,
        priority: 'medium',
        created_at: now
      });
    }

    return insights;
  }

  private getTimeframeStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateChange(values: number[]): number {
    if (values.length < 2) return 0;
    const current = values[values.length - 1];
    const previous = values[values.length - 2];
    return previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  }

  private mapTimeframeToPeriod(timeframe: string): 'daily' | 'weekly' | 'monthly' | 'yearly' {
    switch (timeframe) {
      case '7d': return 'weekly';
      case '30d': return 'monthly';
      case '90d': return 'monthly';
      default: return 'monthly';
    }
  }

  private generateMockMetrics(companyId: string, timeframe: string): AnalyticsMetric[] {
    return [
      {
        id: `${companyId}_referrals_${timeframe}`,
        name: 'Total Referrals',
        type: 'referrals',
        value: Math.floor(Math.random() * 1000) + 100,
        change: Math.floor(Math.random() * 20) + 5,
        change_type: 'increase',
        period: this.mapTimeframeToPeriod(timeframe),
        timestamp: new Date().toISOString()
      },
      {
        id: `${companyId}_commission_${timeframe}`,
        name: 'Total Commission',
        type: 'commission',
        value: Math.floor(Math.random() * 10000) + 1000,
        change: Math.floor(Math.random() * 15) + 3,
        change_type: 'increase',
        period: this.mapTimeframeToPeriod(timeframe),
        timestamp: new Date().toISOString()
      },
      {
        id: `${companyId}_engagement_${timeframe}`,
        name: 'Active Members',
        type: 'engagement',
        value: Math.floor(Math.random() * 500) + 50,
        change: Math.floor(Math.random() * 10) + 2,
        change_type: 'increase',
        period: this.mapTimeframeToPeriod(timeframe),
        timestamp: new Date().toISOString()
      },
      {
        id: `${companyId}_conversion_${timeframe}`,
        name: 'Conversion Rate',
        type: 'conversion',
        value: Math.floor(Math.random() * 30) + 10,
        change: Math.floor(Math.random() * 8) + 1,
        change_type: 'increase',
        period: this.mapTimeframeToPeriod(timeframe),
        timestamp: new Date().toISOString()
      }
    ];
  }

  async getMemberDetails(memberId: string, companyId: string) {
    const { data: member, error } = await supabase
      .from('member_performance_stats')
      .select('*')
      .eq('user_id', memberId)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;

    // Get member's recent activity
    const { data: activity } = await supabase
      .from('recent_activity')
      .select('*')
      .eq('user_id', memberId)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Get member's quest performance
    const { data: questStats } = await supabase
      .from('user_quests')
      .select('is_completed, reward_claimed, quest:quests(title, quest_type, difficulty)')
      .eq('user_id', memberId);

    return {
      ...member,
      recent_activity: activity || [],
      quest_stats: {
        total_quests: questStats?.length || 0,
        completed_quests: questStats?.filter(q => q.is_completed).length || 0,
        claimed_rewards: questStats?.filter(q => q.reward_claimed).length || 0
      }
    };
  }

  async generateReport(
    companyId: string,
    reportType: 'performance' | 'engagement' | 'retention' | 'growth',
    timeframe: '7d' | '30d' | '90d' = '30d'
  ) {
    const startDate = this.getTimeframeStartDate(timeframe);
    const endDate = new Date();

    const report = {
      id: `${companyId}_${reportType}_${timeframe}_${Date.now()}`,
      company_id: companyId,
      report_type: reportType,
      timeframe,
      generated_at: endDate.toISOString(),
      data: {}
    };

    switch (reportType) {
      case 'performance':
        report.data = await this.generatePerformanceReport(companyId, startDate, endDate);
        break;
      case 'engagement':
        report.data = await this.generateEngagementReport(companyId, startDate, endDate);
        break;
      case 'retention':
        report.data = await this.generateRetentionReport(companyId, startDate, endDate);
        break;
      case 'growth':
        report.data = await this.generateGrowthReport(companyId, startDate, endDate);
        break;
    }

    // Save report to database
    const { data: savedReport, error } = await supabase
      .from('report_templates')
      .insert([report])
      .select()
      .single();

    if (error) throw error;

    return savedReport;
  }

  private async generatePerformanceReport(companyId: string, startDate: Date, endDate: Date) {
    const { data: performance } = await supabase
      .from('member_performance_stats')
      .select('*')
      .eq('company_id', companyId);

    return {
      total_members: performance?.length || 0,
      average_commission: performance?.reduce((sum, p) => sum + (p.total_commission || 0), 0) / (performance?.length || 1),
      top_performer: performance?.reduce((max, p) => (p.total_commission || 0) > (max.total_commission || 0) ? p : max, performance[0]),
      performance_distribution: this.calculatePerformanceDistribution(performance || [])
    };
  }

  private async generateEngagementReport(companyId: string, startDate: Date, endDate: Date) {
    const { data: activity } = await supabase
      .from('recent_activity')
      .select('*')
      .eq('company_id', companyId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    return {
      total_activities: activity?.length || 0,
      activity_by_type: this.groupActivityByType(activity || []),
      peak_activity_times: this.calculatePeakActivityTimes(activity || [])
    };
  }

  private async generateRetentionReport(companyId: string, startDate: Date, endDate: Date) {
    const { data: members } = await supabase
      .from('member_performance_stats')
      .select('*')
      .eq('company_id', companyId);

    return {
      retention_rate: members && members.length > 0 ? members.reduce((sum, m) => sum + ('retention_rate' in m ? (m.retention_rate || 0) : 0), 0) / members.length : 0,
      churn_rate: members && members.length > 0 ? members.filter(m => 'retention_rate' in m && (m.retention_rate || 0) < 50).length / members.length * 100 : 0,
      average_lifespan: members && members.length > 0 ? members.reduce((sum, m) => {
        const lifespan = 'join_date' in m ? new Date().getTime() - new Date(m.join_date).getTime() : 0;
        return sum + lifespan;
      }, 0) / members.length / (1000 * 60 * 60 * 24) : 0 // Convert to days
    };
  }

  private async generateGrowthReport(companyId: string, startDate: Date, endDate: Date) {
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { data: newMembers } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return {
      new_referrals: referrals?.length || 0,
      new_members: newMembers?.length || 0,
      growth_rate: newMembers?.length || 0 > 0
        ? (newMembers?.length || 0) / (newMembers?.length || 1) * 100
        : 0,
      referral_sources: this.groupReferralsBySource(referrals || [])
    };
  }

  private calculatePerformanceDistribution(performance: any[]) {
    const ranges = [
      { min: 0, max: 100, label: '$0-$100' },
      { min: 101, max: 500, label: '$101-$500' },
      { min: 501, max: 1000, label: '$501-$1000' },
      { min: 1001, max: Infinity, label: '$1000+' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: performance.filter(p => (p.total_commission || 0) >= range.min && (p.total_commission || 0) <= range.max).length,
      percentage: (performance.filter(p => (p.total_commission || 0) >= range.min && (p.total_commission || 0) <= range.max).length / performance.length) * 100
    }));
  }

  private groupActivityByType(activity: any[]) {
    const grouped = activity.reduce((acc, act) => {
      acc[act.action] = (acc[act.action] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([type, count]) => ({ type, count }));
  }

  private calculatePeakActivityTimes(activity: any[]) {
    const hourCounts = new Array(24).fill(0);
    activity.forEach(act => {
      const hour = new Date(act.timestamp).getHours();
      hourCounts[hour]++;
    });

    return hourCounts.map((count, hour) => ({ hour, count }));
  }

  private groupReferralsBySource(referrals: any[]) {
    const grouped = referrals.reduce((acc, ref) => {
      acc[ref.source || 'unknown'] = (acc[ref.source || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([source, count]) => ({ source, count }));
  }
}
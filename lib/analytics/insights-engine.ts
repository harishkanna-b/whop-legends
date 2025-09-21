import { supabase } from "@/lib/supabase-client";

export interface InsightConfig {
	id: string;
	name: string;
	description: string;
	type: "trend" | "opportunity" | "warning" | "achievement" | "recommendation";
	category: "performance" | "engagement" | "retention" | "growth" | "revenue";
	conditions: InsightCondition[];
	actions: InsightAction[];
	priority: "low" | "medium" | "high" | "critical";
	enabled: boolean;
}

export interface InsightCondition {
	field: string;
	operator: "gt" | "lt" | "eq" | "gte" | "lte" | "between" | "contains";
	value: any;
	weight?: number;
}

export interface InsightAction {
	type: "notification" | "email" | "badge" | "quest" | "message";
	target: "creator" | "member" | "both";
	template: string;
	data?: any;
}

export interface Insight {
	id: string;
	config_id: string;
	type: "trend" | "opportunity" | "warning" | "achievement" | "recommendation";
	category: "performance" | "engagement" | "retention" | "growth" | "revenue";
	title: string;
	description: string;
	data: any;
	actionable: boolean;
	priority: "low" | "medium" | "high" | "critical";
	created_at: string;
	expires_at?: string;
	acknowledged: boolean;
	acknowledged_at?: string;
	acknowledged_by?: string;
	company_id: string;
	user_id?: string;
}

export class InsightsEngine {
	private configs: Map<string, InsightConfig> = new Map();
	private cache = new Map<string, Insight[]>();
	private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

	constructor() {
		this.initializeDefaultConfigs();
	}

	private initializeDefaultConfigs() {
		// Performance insights
		this.addConfig({
			id: "low_conversion_rate",
			name: "Low Conversion Rate",
			description: "Detect when conversion rate drops below threshold",
			type: "warning",
			category: "performance",
			conditions: [
				{ field: "conversion_rate", operator: "lt", value: 20, weight: 0.8 },
			],
			actions: [
				{
					type: "notification",
					target: "creator",
					template:
						"Conversion rate is below 20%. Consider reviewing referral strategies.",
				},
			],
			priority: "high",
			enabled: true,
		});

		this.addConfig({
			id: "high_performer",
			name: "High Performer Detected",
			description: "Identify members with exceptional performance",
			type: "achievement",
			category: "performance",
			conditions: [
				{ field: "total_commission", operator: "gt", value: 5000, weight: 0.7 },
				{ field: "conversion_rate", operator: "gt", value: 50, weight: 0.3 },
			],
			actions: [
				{
					type: "notification",
					target: "both",
					template: "Exceptional performance detected!",
				},
				{ type: "badge", target: "member", template: "top_performer" },
			],
			priority: "medium",
			enabled: true,
		});

		// Engagement insights
		this.addConfig({
			id: "declining_engagement",
			name: "Declining Member Engagement",
			description: "Detect when member engagement is decreasing",
			type: "warning",
			category: "engagement",
			conditions: [
				{ field: "engagement_score", operator: "lt", value: 40, weight: 0.6 },
				{ field: "engagement_trend", operator: "lt", value: -10, weight: 0.4 },
			],
			actions: [
				{
					type: "notification",
					target: "creator",
					template:
						"Member engagement is declining. Consider engagement campaigns.",
				},
				{ type: "quest", target: "member", template: "engagement_boost" },
			],
			priority: "high",
			enabled: true,
		});

		this.addConfig({
			id: "high_activity_member",
			name: "High Activity Member",
			description: "Identify members with consistently high activity",
			type: "achievement",
			category: "engagement",
			conditions: [
				{ field: "engagement_score", operator: "gt", value: 80, weight: 0.5 },
				{
					field: "quest_completion_rate",
					operator: "gt",
					value: 70,
					weight: 0.3,
				},
				{ field: "active_days_count", operator: "gt", value: 20, weight: 0.2 },
			],
			actions: [
				{ type: "badge", target: "member", template: "engagement_champion" },
			],
			priority: "low",
			enabled: true,
		});

		// Retention insights
		this.addConfig({
			id: "churn_risk",
			name: "Churn Risk Detected",
			description: "Identify members at risk of churning",
			type: "warning",
			category: "retention",
			conditions: [
				{
					field: "days_since_last_activity",
					operator: "gt",
					value: 30,
					weight: 0.4,
				},
				{ field: "engagement_score", operator: "lt", value: 30, weight: 0.3 },
				{ field: "retention_rate", operator: "lt", value: 50, weight: 0.3 },
			],
			actions: [
				{
					type: "notification",
					target: "creator",
					template: "Members at risk of churn detected.",
				},
				{
					type: "message",
					target: "member",
					template: "reactivation_campaign",
				},
			],
			priority: "critical",
			enabled: true,
		});

		// Growth insights
		this.addConfig({
			id: "rapid_growth",
			name: "Rapid Growth Detected",
			description: "Detect when growth rate exceeds expectations",
			type: "opportunity",
			category: "growth",
			conditions: [
				{ field: "member_growth_rate", operator: "gt", value: 50, weight: 0.6 },
				{ field: "new_members_count", operator: "gt", value: 100, weight: 0.4 },
			],
			actions: [
				{
					type: "notification",
					target: "creator",
					template: "Exceptional growth rate detected!",
				},
			],
			priority: "medium",
			enabled: true,
		});

		// Revenue insights
		this.addConfig({
			id: "revenue_anomaly",
			name: "Revenue Anomaly Detected",
			description: "Detect unusual revenue patterns",
			type: "warning",
			category: "revenue",
			conditions: [
				{
					field: "revenue_change_percent",
					operator: "lt",
					value: -20,
					weight: 0.5,
				},
				{ field: "revenue_volatility", operator: "gt", value: 30, weight: 0.5 },
			],
			actions: [
				{
					type: "notification",
					target: "creator",
					template: "Unusual revenue pattern detected. Review recent changes.",
				},
			],
			priority: "high",
			enabled: true,
		});
	}

	private addConfig(config: InsightConfig) {
		this.configs.set(config.id, config);
	}

	async generateInsights(
		companyId: string,
		timeframe: "7d" | "30d" | "90d" = "30d",
	): Promise<Insight[]> {
		const cacheKey = `insights_${companyId}_${timeframe}`;
		const cached = this.cache.get(cacheKey);

		if (cached?.[0]) {
			const createdAt = cached[0].created_at;
			const cacheAge = createdAt
				? Date.now() - new Date(createdAt).getTime()
				: 0;
			if (cacheAge < this.CACHE_DURATION) {
				return cached;
			}
		}

		const insights: Insight[] = [];
		const companyData = await this.getCompanyData(companyId, timeframe);

		for (const [configId, config] of Array.from(this.configs.entries())) {
			if (!config.enabled) continue;

			const matchingInsights = await this.evaluateConfig(
				config,
				companyData,
				companyId,
			);
			insights.push(...matchingInsights);
		}

		// Save insights to database
		await this.saveInsights(insights);

		this.cache.set(cacheKey, insights);
		return insights;
	}

	private async getCompanyData(companyId: string, timeframe: string) {
		const startDate = this.getTimeframeStartDate(timeframe);

		// Get member performance data
		const { data: members } = await supabase()
			.from("member_performance_stats")
			.select("*")
			.eq("company_id", companyId);

		// Get recent activity
		const { data: activity } = await supabase()
			.from("recent_activity")
			.select("*")
			.eq("company_id", companyId)
			.gte("timestamp", startDate.toISOString());

		// Get analytics aggregations
		const { data: analytics } = await supabase()
			.from("analytics_aggregations")
			.select("*")
			.eq("company_id", companyId)
			.gte("date", startDate.toISOString());

		// Calculate aggregated metrics
		const totalMembers = members?.length || 0;
		const activeMembers = members?.filter((m: any) => m.is_active).length || 0;
		const totalCommission =
			members?.reduce(
				(sum: number, m: any) => sum + (m.total_commission || 0),
				0,
			) || 0;
		const totalReferrals =
			members?.reduce(
				(sum: number, m: any) => sum + (m.total_referrals || 0),
				0,
			) || 0;
		const avgConversionRate =
			members?.reduce(
				(sum: number, m: any) => sum + (m.conversion_rate || 0),
				0,
			) / (members?.length || 1) || 0;
		const avgEngagement =
			members?.reduce(
				(sum: number, m: any) => sum + (m.engagement_score || 0),
				0,
			) / (members?.length || 1) || 0;

		// Calculate trends
		const dailyData = analytics || [];
		const revenueTrend = this.calculateTrend(
			dailyData.map((d: any) => d.total_commission || 0),
		);
		const memberTrend = this.calculateTrend(
			dailyData.map((d: any) => d.active_users || 0),
		);

		return {
			members: members || [],
			activity: activity || [],
			analytics: dailyData,
			aggregated: {
				total_members: totalMembers,
				active_members: activeMembers,
				total_commission: totalCommission,
				total_referrals: totalReferrals,
				average_conversion_rate: avgConversionRate,
				average_engagement_score: avgEngagement,
				revenue_growth_rate: revenueTrend,
				member_growth_rate: memberTrend,
				timeframe,
			},
		};
	}

	private async evaluateConfig(
		config: InsightConfig,
		companyData: any,
		companyId: string,
	): Promise<Insight[]> {
		const insights: Insight[] = [];

		for (const member of companyData.members) {
			const context = {
				...companyData.aggregated,
				...member,
				company_data: companyData,
			};

			const passes = await this.evaluateConditions(config.conditions, context);

			if (passes) {
				const insight = await this.createInsight(
					config,
					context,
					companyId,
					member.user_id,
				);
				insights.push(insight);
			}
		}

		// Also evaluate company-level insights
		const companyContext = {
			...companyData.aggregated,
			company_data: companyData,
		};

		const companyPasses = await this.evaluateConditions(
			config.conditions.filter((c: any) => !c.field.startsWith("member_")),
			companyContext,
		);

		if (companyPasses) {
			const insight = await this.createInsight(
				config,
				companyContext,
				companyId,
			);
			insights.push(insight);
		}

		return insights;
	}

	private async evaluateConditions(
		conditions: InsightCondition[],
		context: any,
	): Promise<boolean> {
		if (conditions.length === 0) return true;

		let totalWeight = 0;
		let passingWeight = 0;

		for (const condition of conditions) {
			const weight = condition.weight || 1;
			totalWeight += weight;

			if (await this.evaluateCondition(condition, context)) {
				passingWeight += weight;
			}
		}

		return totalWeight > 0 && passingWeight / totalWeight >= 0.7; // 70% threshold
	}

	private async evaluateCondition(
		condition: InsightCondition,
		context: any,
	): Promise<boolean> {
		const fieldValue = this.getFieldValue(condition.field, context);

		switch (condition.operator) {
			case "gt":
				return fieldValue > condition.value;
			case "lt":
				return fieldValue < condition.value;
			case "eq":
				return fieldValue === condition.value;
			case "gte":
				return fieldValue >= condition.value;
			case "lte":
				return fieldValue <= condition.value;
			case "between":
				return (
					fieldValue >= condition.value[0] && fieldValue <= condition.value[1]
				);
			case "contains":
				return String(fieldValue).includes(String(condition.value));
			default:
				return false;
		}
	}

	private getFieldValue(field: string, context: any): any {
		return field
			.split(".")
			.reduce((obj: any, key: string) => obj?.[key], context);
	}

	private async createInsight(
		config: InsightConfig,
		context: any,
		companyId: string,
		userId?: string,
	): Promise<Insight> {
		const title = this.generateInsightTitle(config, context);
		const description = this.generateInsightDescription(config, context);

		return {
			id: `${config.id}_${companyId}_${userId || "company"}_${Date.now()}`,
			config_id: config.id,
			type: config.type,
			category: config.category,
			title,
			description,
			data: context,
			actionable: true,
			priority: config.priority,
			created_at: new Date().toISOString(),
			acknowledged: false,
			company_id: companyId,
			user_id: userId,
		};
	}

	private generateInsightTitle(config: InsightConfig, context: any): string {
		const templates = {
			low_conversion_rate: `Low conversion rate detected (${context.average_conversion_rate?.toFixed(1)}%)`,
			high_performer: `High performer: ${context.username} (${context.total_commission?.toLocaleString()})`,
			declining_engagement: "Declining engagement detected",
			high_activity_member: `High activity member: ${context.username}`,
			churn_risk: `Churn risk: ${context.username}`,
			rapid_growth: `Rapid growth: ${context.member_growth_rate?.toFixed(1)}% increase`,
			revenue_anomaly: "Revenue anomaly detected",
		};

		return templates[config.id as keyof typeof templates] || config.name;
	}

	private generateInsightDescription(
		config: InsightConfig,
		context: any,
	): string {
		const templates = {
			low_conversion_rate: `The average conversion rate is ${context.average_conversion_rate?.toFixed(1)}%, which is below the healthy threshold of 20%.`,
			high_performer: `${context.username} has generated $${context.total_commission?.toLocaleString()} in commission with a ${context.conversion_rate?.toFixed(1)}% conversion rate.`,
			declining_engagement: `Member engagement scores are declining. Current average: ${context.average_engagement_score?.toFixed(1)}%.`,
			high_activity_member: `${context.username} shows exceptional engagement with ${context.engagement_score?.toFixed(1)}% engagement score.`,
			churn_risk: `${context.username} has been inactive for ${context.days_since_last_activity} days and shows declining engagement metrics.`,
			rapid_growth: `Member base has grown by ${context.member_growth_rate?.toFixed(1)}% in the last ${context.timeframe}, exceeding expectations.`,
			revenue_anomaly: `Revenue patterns show unusual volatility. Revenue changed by ${context.revenue_growth_rate?.toFixed(1)}% recently.`,
		};

		return templates[config.id as keyof typeof templates] || config.description;
	}

	private calculateTrend(values: number[]): number {
		if (values.length < 2) return 0;

		const recent =
			values.slice(-7).reduce((sum: number, val: number) => sum + val, 0) /
			Math.min(7, values.length);
		const previous =
			values.slice(-14, -7).reduce((sum: number, val: number) => sum + val, 0) /
			Math.min(7, values.length);

		return previous !== 0 ? ((recent - previous) / previous) * 100 : 0;
	}

	private getTimeframeStartDate(timeframe: string): Date {
		const now = new Date();
		switch (timeframe) {
			case "7d":
				return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			case "30d":
				return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			case "90d":
				return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
			default:
				return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		}
	}

	private async saveInsights(insights: Insight[]): Promise<void> {
		if (insights.length === 0) return;

		const { error } = await supabase()
			.from("creator_insights")
			.insert(insights);

		if (error) {
			console.error("Error saving insights:", error);
		}
	}

	async getInsights(
		companyId: string,
		filters?: {
			type?: string;
			category?: string;
			priority?: string;
			acknowledged?: boolean;
			timeframe?: "7d" | "30d" | "90d";
		},
	): Promise<Insight[]> {
		let query = supabase()
			.from("creator_insights")
			.select("*")
			.eq("company_id", companyId)
			.order("created_at", { ascending: false });

		if (filters) {
			if (filters.type) {
				query = query.eq("type", filters.type);
			}
			if (filters.category) {
				query = query.eq("category", filters.category);
			}
			if (filters.priority) {
				query = query.eq("priority", filters.priority);
			}
			if (filters.acknowledged !== undefined) {
				query = query.eq("acknowledged", filters.acknowledged);
			}
			if (filters.timeframe) {
				const startDate = this.getTimeframeStartDate(filters.timeframe);
				query = query.gte("created_at", startDate.toISOString());
			}
		}

		const { data, error } = await query;

		if (error) throw error;
		return data || [];
	}

	async acknowledgeInsight(
		insightId: string,
		acknowledgedBy: string,
	): Promise<void> {
		const { error } = await supabase()
			.from("creator_insights")
			.update({
				acknowledged: true,
				acknowledged_at: new Date().toISOString(),
				acknowledged_by: acknowledgedBy,
			})
			.eq("id", insightId);

		if (error) throw error;
	}

	async getInsightStats(companyId: string): Promise<{
		total_insights: number;
		acknowledged_insights: number;
		insights_by_type: Record<string, number>;
		insights_by_priority: Record<string, number>;
		recent_insights: Insight[];
	}> {
		const { data: insights } = await supabase()
			.from("creator_insights")
			.select("*")
			.eq("company_id", companyId)
			.order("created_at", { ascending: false })
			.limit(100);

		const allInsights = insights || [];

		return {
			total_insights: allInsights.length,
			acknowledged_insights: allInsights.filter((i: any) => i.acknowledged)
				.length,
			insights_by_type: this.groupByField(allInsights, "type"),
			insights_by_priority: this.groupByField(allInsights, "priority"),
			recent_insights: allInsights.slice(0, 10),
		};
	}

	private groupByField(items: any[], field: string): Record<string, number> {
		return items.reduce(
			(acc: Record<string, number>, item: any) => {
				const value = item[field];
				acc[value] = (acc[value] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);
	}

	async executeInsightActions(insight: Insight): Promise<void> {
		const config = this.configs.get(insight.config_id);
		if (!config) return;

		for (const action of config.actions) {
			await this.executeAction(action, insight);
		}
	}

	private async executeAction(
		action: InsightAction,
		insight: Insight,
	): Promise<void> {
		switch (action.type) {
			case "notification":
				// Send notification logic here
				console.log(`Sending notification: ${action.template}`);
				break;
			case "email":
				// Send email logic here
				console.log(`Sending email: ${action.template}`);
				break;
			case "badge":
				// Award badge logic here
				console.log(`Awarding badge: ${action.template}`);
				break;
			case "quest":
				// Create quest logic here
				console.log(`Creating quest: ${action.template}`);
				break;
			case "message":
				// Send message logic here
				console.log(`Sending message: ${action.template}`);
				break;
		}
	}
}

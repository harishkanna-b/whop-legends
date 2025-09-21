import { supabase, supabaseService } from "./supabase-client";

// Types for referral tracking
export interface Referral {
	id: string;
	referrerId: string;
	referredUserId: string;
	referredUsername: string;
	status: "pending" | "completed" | "expired" | "cancelled";
	value: number;
	commission: number;
	commissionRate: number;
	createdAt: string;
	completedAt?: string;
	expiresAt?: string;
	source: string;
	metadata?: {
		product?: string;
		campaign?: string;
		utmSource?: string;
		utmMedium?: string;
		utmCampaign?: string;
		utmContent?: string;
		utmTerm?: string;
		ip?: string;
		userAgent?: string;
		country?: string;
		city?: string;
	};
}

export interface ReferralStats {
	totalReferrals: number;
	completedReferrals: number;
	pendingReferrals: number;
	expiredReferrals: number;
	cancelledReferrals: number;
	totalValue: number;
	totalCommission: number;
	averageCommission: number;
	conversionRate: number;
	averageValue: number;
	topSources: Array<{
		source: string;
		count: number;
		value: number;
		conversionRate: number;
	}>;
	monthlyTrend: Array<{
		month: string;
		referrals: number;
		completed: number;
		value: number;
		commission: number;
	}>;
	performanceMetrics: {
		bestMonth: { month: string; referrals: number; value: number };
		worstMonth: { month: string; referrals: number; value: number };
		averageMonthlyReferrals: number;
		averageMonthlyValue: number;
		growthRate: number;
	};
	geographicData: Array<{
		country: string;
		count: number;
		value: number;
		cities: Array<{
			city: string;
			count: number;
			value: number;
		}>;
	}>;
}

export interface ReferralCampaign {
	id: string;
	name: string;
	description: string;
	commissionRate: number;
	isActive: boolean;
	referralCode: string;
	createdAt: string;
	expiresAt?: string;
	maxReferrals?: number;
	currentValue: number;
	referralCount: number;
	settings: {
		allowCustomCodes: boolean;
		trackUTM: boolean;
		requireApproval: boolean;
		autoApprove: boolean;
		notifyOnComplete: boolean;
	};
}

export interface ReferralLink {
	id: string;
	userId: string;
	campaignId?: string;
	code: string;
	url: string;
	isActive: boolean;
	clicks: number;
	uniqueClicks: number;
	conversions: number;
	createdAt: string;
	expiresAt?: string;
	metadata?: {
		source?: string;
		medium?: string;
		campaign?: string;
	};
}

export interface ReferralAnalytics {
	timeframe: string;
	totalClicks: number;
	uniqueClicks: number;
	conversions: number;
	conversionRate: number;
	averageTimeToConvert: number;
	topReferringPages: Array<{
		url: string;
		clicks: number;
		conversions: number;
	}>;
	deviceBreakdown: {
		desktop: number;
		mobile: number;
		tablet: number;
	};
	browserBreakdown: Array<{
		browser: string;
		clicks: number;
		conversions: number;
	}>;
}

export class ReferralManager {
	private static instance: ReferralManager;

	static getInstance(): ReferralManager {
		if (!ReferralManager.instance) {
			ReferralManager.instance = new ReferralManager();
		}
		return ReferralManager.instance;
	}

	// Core referral operations
	async createReferral(
		referrerId: string,
		referredUserId: string,
		value: number,
		source: string,
		metadata?: Referral["metadata"],
	): Promise<Referral> {
		try {
			// Get user's commission rate
			const { data: referrerProfile, error: profileError } =
				await supabaseService()
					.from("user_profiles")
					.select("commission_rate")
					.eq("user_id", referrerId)
					.single();

			if (profileError) throw profileError;

			const commissionRate = referrerProfile?.commission_rate || 10; // Default 10%
			const commission = (value * commissionRate) / 100;

			// Create referral
			const { data: referral, error } = await supabaseService()
				.from("referrals")
				.insert([
					{
						referrer_id: referrerId,
						referred_user_id: referredUserId,
						value,
						commission,
						commission_rate: commissionRate,
						source,
						metadata,
						status: "pending",
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
					},
				])
				.select()
				.single();

			if (error) throw error;

			// Log referral activity
			await this.logActivity(referrerId, "referral_created", {
				referralId: referral.id,
				value,
				source,
			});

			return this.mapReferral(referral);
		} catch (error) {
			console.error("Error creating referral:", error);
			throw error;
		}
	}

	async getUserReferrals(
		userId: string,
		timeframe: "7d" | "30d" | "90d" | "1y" | "all" = "all",
	): Promise<Referral[]> {
		try {
			let query = supabaseService()
				.from("referrals")
				.select(`
          *,
          referred_user:referred_user_id(username)
        `)
				.eq("referrer_id", userId)
				.order("created_at", { ascending: false });

			// Apply timeframe filter
			if (timeframe !== "all") {
				const days = Number.parseInt(timeframe.replace("d", ""));
				const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
				query = query.gte("created_at", cutoffDate.toISOString());
			}

			const { data: referrals, error } = await query;

			if (error) throw error;

			return referrals.map((referral: any) =>
				this.mapReferral({
					...referral,
					referredUsername: referral.referred_user?.username || "Unknown",
				}),
			);
		} catch (error) {
			console.error("Error getting user referrals:", error);
			return [];
		}
	}

	async getReferralStats(
		userId: string,
		timeframe: "7d" | "30d" | "90d" | "1y" | "all" = "all",
	): Promise<ReferralStats> {
		try {
			const referrals = await this.getUserReferrals(userId, timeframe);

			const stats: ReferralStats = {
				totalReferrals: referrals.length,
				completedReferrals: referrals.filter((r) => r.status === "completed")
					.length,
				pendingReferrals: referrals.filter((r) => r.status === "pending")
					.length,
				expiredReferrals: referrals.filter((r) => r.status === "expired")
					.length,
				cancelledReferrals: referrals.filter((r) => r.status === "cancelled")
					.length,
				totalValue: referrals.reduce((sum, r) => sum + r.value, 0),
				totalCommission: referrals.reduce((sum, r) => sum + r.commission, 0),
				averageCommission:
					referrals.length > 0
						? referrals.reduce((sum, r) => sum + r.commission, 0) /
							referrals.length
						: 0,
				conversionRate:
					referrals.length > 0
						? referrals.filter((r) => r.status === "completed").length /
							referrals.length
						: 0,
				averageValue:
					referrals.length > 0
						? referrals.reduce((sum, r) => sum + r.value, 0) / referrals.length
						: 0,
				topSources: [],
				monthlyTrend: [],
				performanceMetrics: {
					bestMonth: { month: "", referrals: 0, value: 0 },
					worstMonth: { month: "", referrals: 0, value: 0 },
					averageMonthlyReferrals: 0,
					averageMonthlyValue: 0,
					growthRate: 0,
				},
				geographicData: [],
			};

			// Calculate top sources
			const sourceMap = new Map<
				string,
				{ count: number; value: number; completed: number }
			>();
			referrals.forEach((referral) => {
				const source = referral.source || "direct";
				const current = sourceMap.get(source) || {
					count: 0,
					value: 0,
					completed: 0,
				};
				current.count++;
				current.value += referral.value;
				if (referral.status === "completed") current.completed++;
				sourceMap.set(source, current);
			});

			stats.topSources = Array.from(sourceMap.entries())
				.map(([source, data]) => ({
					source,
					count: data.count,
					value: data.value,
					conversionRate: data.count > 0 ? data.completed / data.count : 0,
				}))
				.sort((a, b) => b.value - a.value);

			// Calculate monthly trends
			const monthlyMap = new Map<
				string,
				{
					referrals: number;
					completed: number;
					value: number;
					commission: number;
				}
			>();
			referrals.forEach((referral) => {
				const month = new Date(referral.createdAt)
					.toISOString()
					.substring(0, 7); // YYYY-MM
				const current = monthlyMap.get(month) || {
					referrals: 0,
					completed: 0,
					value: 0,
					commission: 0,
				};
				current.referrals++;
				current.value += referral.value;
				current.commission += referral.commission;
				if (referral.status === "completed") current.completed++;
				monthlyMap.set(month, current);
			});

			stats.monthlyTrend = Array.from(monthlyMap.entries())
				.map(([month, data]) => ({
					month: new Date(`${month}-01`).toLocaleDateString("en-US", {
						month: "short",
						year: "numeric",
					}),
					referrals: data.referrals,
					completed: data.completed,
					value: data.value,
					commission: data.commission,
				}))
				.sort((a, b) => a.month.localeCompare(b.month));

			// Calculate performance metrics
			if (stats.monthlyTrend.length > 0) {
				const sortedByValue = [...stats.monthlyTrend].sort(
					(a, b) => b.value - a.value,
				);
				stats.performanceMetrics.bestMonth = sortedByValue[0];
				stats.performanceMetrics.worstMonth =
					sortedByValue[sortedByValue.length - 1];
				stats.performanceMetrics.averageMonthlyReferrals =
					stats.totalReferrals / stats.monthlyTrend.length;
				stats.performanceMetrics.averageMonthlyValue =
					stats.totalValue / stats.monthlyTrend.length;

				// Calculate growth rate
				if (stats.monthlyTrend.length >= 2) {
					const recent = stats.monthlyTrend[stats.monthlyTrend.length - 1];
					const previous = stats.monthlyTrend[stats.monthlyTrend.length - 2];
					stats.performanceMetrics.growthRate =
						previous.value > 0
							? ((recent.value - previous.value) / previous.value) * 100
							: 0;
				}
			}

			return stats;
		} catch (error) {
			console.error("Error getting referral stats:", error);
			throw error;
		}
	}

	async generateReferralLink(
		userId: string,
		campaignId?: string,
	): Promise<string> {
		try {
			// Generate unique referral code
			const code = await this.generateUniqueCode(userId, campaignId);

			const baseUrl =
				process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
			const url = `${baseUrl}/ref/${code}`;

			// Store referral link
			const { error } = await supabaseService()
				.from("referral_links")
				.insert([
					{
						user_id: userId,
						campaign_id: campaignId,
						code,
						url,
						is_active: true,
					},
				]);

			if (error) throw error;

			await this.logActivity(userId, "referral_link_created", {
				code,
				campaignId,
				url,
			});

			return url;
		} catch (error) {
			console.error("Error generating referral link:", error);
			throw error;
		}
	}

	async trackReferralClick(
		code: string,
		clickData: {
			ip?: string;
			userAgent?: string;
			referer?: string;
			utmSource?: string;
			utmMedium?: string;
			utmCampaign?: string;
		},
	): Promise<void> {
		try {
			// Get referral link
			const { data: link, error: linkError } = await supabaseService()
				.from("referral_links")
				.select("*")
				.eq("code", code)
				.eq("is_active", true)
				.single();

			if (linkError || !link) return;

			// Check if this is a unique click (based on IP and user agent)
			const { data: existingClick, error: clickError } = await supabaseService()
				.from("referral_clicks")
				.select("id")
				.eq("link_id", link.id)
				.eq("ip", clickData.ip || "")
				.eq("user_agent", clickData.userAgent || "")
				.gte(
					"created_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				) // 24 hours
				.single();

			const isUnique = !existingClick;

			// Record click
			await supabaseService()
				.from("referral_clicks")
				.insert([
					{
						link_id: link.id,
						ip: clickData.ip,
						user_agent: clickData.userAgent,
						referer: clickData.referer,
						utm_source: clickData.utmSource,
						utm_medium: clickData.utmMedium,
						utm_campaign: clickData.utmCampaign,
						is_unique: isUnique,
					},
				]);

			// Update link click counts
			await supabaseService()
				.from("referral_links")
				.update({
					clicks: link.clicks + 1,
					unique_clicks: isUnique ? link.unique_clicks + 1 : link.unique_clicks,
				})
				.eq("id", link.id);

			await this.logActivity(link.user_id, "referral_click", {
				linkId: link.id,
				isUnique,
				code,
			});
		} catch (error) {
			console.error("Error tracking referral click:", error);
		}
	}

	async getUserCampaigns(userId: string): Promise<ReferralCampaign[]> {
		try {
			const { data: campaigns, error } = await supabaseService()
				.from("referral_campaigns")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false });

			if (error) throw error;

			return campaigns.map((campaign: any) => ({
				id: campaign.id,
				name: campaign.name,
				description: campaign.description,
				commissionRate: campaign.commission_rate,
				isActive: campaign.is_active,
				referralCode: campaign.referral_code,
				createdAt: campaign.created_at,
				expiresAt: campaign.expires_at,
				maxReferrals: campaign.max_referrals,
				currentValue: campaign.current_value,
				referralCount: campaign.referral_count,
				settings: campaign.settings || {},
			}));
		} catch (error) {
			console.error("Error getting user campaigns:", error);
			return [];
		}
	}

	async createCampaign(
		userId: string,
		campaignData: {
			name: string;
			description: string;
			commissionRate: number;
			expiresAt?: Date;
			maxReferrals?: number;
			settings?: Partial<ReferralCampaign["settings"]>;
		},
	): Promise<ReferralCampaign> {
		try {
			const code = await this.generateUniqueCode(userId, "campaign");

			const { data: campaign, error } = await supabaseService()
				.from("referral_campaigns")
				.insert([
					{
						user_id: userId,
						name: campaignData.name,
						description: campaignData.description,
						commission_rate: campaignData.commissionRate,
						referral_code: code,
						expires_at: campaignData.expiresAt?.toISOString(),
						max_referrals: campaignData.maxReferrals,
						is_active: true,
						settings: campaignData.settings,
					},
				])
				.select()
				.single();

			if (error) throw error;

			await this.logActivity(userId, "campaign_created", {
				campaignId: campaign.id,
				code,
			});

			return this.mapCampaign(campaign);
		} catch (error) {
			console.error("Error creating campaign:", error);
			throw error;
		}
	}

	async getReferralAnalytics(
		userId: string,
		timeframe: "7d" | "30d" | "90d" | "1y" = "30d",
	): Promise<ReferralAnalytics> {
		try {
			const days = Number.parseInt(timeframe.replace("d", ""));
			const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

			// Get clicks data
			const { data: clicks, error: clicksError } = await supabaseService()
				.from("referral_clicks")
				.select(`
          *,
          referral_link:link_id(user_id)
        `)
				.eq("referral_link.user_id", userId)
				.gte("created_at", cutoffDate.toISOString());

			if (clicksError) throw clicksError;

			// Get conversions (completed referrals)
			const referrals = await this.getUserReferrals(userId, timeframe);
			const conversions = referrals.filter((r) => r.status === "completed");

			const clickData = clicks || [];
			const analytics: ReferralAnalytics = {
				timeframe,
				totalClicks: clickData.length,
				uniqueClicks: clickData.filter((c: any) => c.is_unique).length,
				conversions: conversions.length,
				conversionRate:
					clickData.length > 0 ? conversions.length / clickData.length : 0,
				averageTimeToConvert: 0,
				topReferringPages: [],
				deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
				browserBreakdown: [],
			};

			// Calculate device breakdown
			clickData.forEach((click: any) => {
				const userAgent = click.user_agent || "";
				if (userAgent.includes("Mobile")) {
					analytics.deviceBreakdown.mobile++;
				} else if (userAgent.includes("Tablet")) {
					analytics.deviceBreakdown.tablet++;
				} else {
					analytics.deviceBreakdown.desktop++;
				}
			});

			// Calculate browser breakdown
			const browserMap = new Map<
				string,
				{ clicks: number; conversions: number }
			>();
			clickData.forEach((click: any) => {
				const userAgent = click.user_agent || "";
				let browser = "Unknown";
				if (userAgent.includes("Chrome")) browser = "Chrome";
				else if (userAgent.includes("Firefox")) browser = "Firefox";
				else if (userAgent.includes("Safari")) browser = "Safari";
				else if (userAgent.includes("Edge")) browser = "Edge";

				const current = browserMap.get(browser) || {
					clicks: 0,
					conversions: 0,
				};
				current.clicks++;
				browserMap.set(browser, current);
			});

			analytics.browserBreakdown = Array.from(browserMap.entries())
				.map(([browser, data]) => ({ browser, ...data }))
				.sort((a, b) => b.clicks - a.clicks);

			return analytics;
		} catch (error) {
			console.error("Error getting referral analytics:", error);

			// Return default analytics structure on error
			return {
				timeframe,
				totalClicks: 0,
				uniqueClicks: 0,
				conversions: 0,
				conversionRate: 0,
				averageTimeToConvert: 0,
				topReferringPages: [],
				deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
				browserBreakdown: [],
			};
		}
	}

	// Private helper methods
	private async generateUniqueCode(
		userId: string,
		context?: string,
	): Promise<string> {
		const prefix = context === "campaign" ? "camp" : "ref";
		const attempts = 10;

		for (let i = 0; i < attempts; i++) {
			const code = `${prefix}_${userId.substring(0, 8)}_${Math.random().toString(36).substring(2, 8)}`;

			// Check if code already exists
			const { data: existing, error } = await supabaseService()
				.from("referral_links")
				.select("id")
				.eq("code", code)
				.single();

			if (error && error.code === "PGRST116") {
				// Not found
				return code;
			}
		}

		throw new Error("Failed to generate unique referral code");
	}

	private mapReferral(data: any): Referral {
		return {
			id: data.id,
			referrerId: data.referrer_id,
			referredUserId: data.referred_user_id,
			referredUsername: data.referredUsername || "Unknown",
			status: data.status,
			value: data.value,
			commission: data.commission,
			commissionRate: data.commission_rate,
			createdAt: data.created_at,
			completedAt: data.completed_at,
			expiresAt: data.expires_at,
			source: data.source,
			metadata: data.metadata,
		};
	}

	private mapCampaign(data: any): ReferralCampaign {
		return {
			id: data.id,
			name: data.name,
			description: data.description,
			commissionRate: data.commission_rate,
			isActive: data.is_active,
			referralCode: data.referral_code,
			createdAt: data.created_at,
			expiresAt: data.expires_at,
			maxReferrals: data.max_referrals,
			currentValue: data.current_value,
			referralCount: data.referral_count,
			settings: data.settings || {},
		};
	}

	private async logActivity(
		userId: string,
		action: string,
		metadata: any,
	): Promise<void> {
		try {
			await supabaseService()
				.from("user_activity")
				.insert([
					{
						user_id: userId,
						action,
						metadata,
						created_at: new Date().toISOString(),
					},
				]);
		} catch (error) {
			console.error("Error logging activity:", error);
		}
	}
}

// Export singleton instance
export const referralManager = ReferralManager.getInstance();

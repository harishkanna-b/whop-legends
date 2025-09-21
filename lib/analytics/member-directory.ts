import { supabase } from "@/lib/supabase-client";

export interface MemberFilter {
	search?: string;
	character_class?: string;
	level_range?: [number, number];
	commission_range?: [number, number];
	referral_range?: [number, number];
	status?: "active" | "inactive" | "all";
	join_date_range?: [string, string];
	sort_by?:
		| "total_commission"
		| "total_referrals"
		| "level"
		| "engagement_score"
		| "last_active";
	sort_order?: "asc" | "desc";
}

export interface MemberSearchResult {
	id: string;
	user_id: string;
	username: string;
	avatar?: string;
	character_class: string;
	level: number;
	total_referrals: number;
	total_commission: number;
	conversion_rate: number;
	engagement_score: number;
	retention_rate: number;
	quest_completion_rate: number;
	last_active: string;
	join_date: string;
	is_active: boolean;
	rank: number;
	badges: string[];
}

export interface MemberExportOptions {
	format: "csv" | "json" | "xlsx";
	fields: string[];
	filters: MemberFilter;
}

export class MemberDirectory {
	private readonly PAGE_SIZE = 20;

	async searchMembers(
		companyId: string,
		filters: MemberFilter,
		page = 1,
	): Promise<{
		members: MemberSearchResult[];
		total: number;
		page: number;
		pages: number;
	}> {
		let query = supabase()
			.from("member_performance_stats")
			.select(
				`
        user_id,
        username,
        avatar,
        character_class,
        level,
        total_referrals,
        total_commission,
        conversion_rate,
        engagement_score,
        retention_rate,
        quest_completion_rate,
        last_active,
        join_date,
        is_active
      `,
				{ count: "exact" },
			)
			.eq("company_id", companyId);

		// Apply filters
		if (filters.search) {
			query = query.ilike("username", `%${filters.search}%`);
		}

		if (filters.character_class && filters.character_class !== "all") {
			query = query.eq("character_class", filters.character_class);
		}

		if (filters.level_range) {
			query = query
				.gte("level", filters.level_range[0])
				.lte("level", filters.level_range[1]);
		}

		if (filters.commission_range) {
			query = query
				.gte("total_commission", filters.commission_range[0])
				.lte("total_commission", filters.commission_range[1]);
		}

		if (filters.referral_range) {
			query = query
				.gte("total_referrals", filters.referral_range[0])
				.lte("total_referrals", filters.referral_range[1]);
		}

		if (filters.status && filters.status !== "all") {
			query = query.eq("is_active", filters.status === "active");
		}

		if (filters.join_date_range) {
			query = query
				.gte("join_date", filters.join_date_range[0])
				.lte("join_date", filters.join_date_range[1]);
		}

		// Apply sorting
		const sortBy = filters.sort_by || "total_commission";
		const sortOrder = filters.sort_order || "desc";
		query = query.order(sortBy, { ascending: sortOrder === "asc" });

		// Apply pagination
		const offset = (page - 1) * this.PAGE_SIZE;
		query = query.range(offset, offset + this.PAGE_SIZE - 1);

		const { data, error, count } = await query;

		if (error) throw error;

		// Calculate ranks and get badges for each member
		const membersWithDetails = await Promise.all(
			(data || []).map(async (member: any, index: number) => ({
				id: member.user_id,
				user_id: member.user_id,
				username: member.username,
				avatar: member.avatar,
				character_class: member.character_class,
				level: member.level || 1,
				total_referrals: member.total_referrals || 0,
				total_commission: member.total_commission || 0,
				conversion_rate: member.conversion_rate || 0,
				engagement_score: member.engagement_score || 0,
				retention_rate: member.retention_rate || 0,
				quest_completion_rate: member.quest_completion_rate || 0,
				last_active: member.last_active,
				join_date: member.join_date,
				is_active: member.is_active,
				rank: offset + index + 1,
				badges: await this.getMemberBadges(member.user_id, companyId),
			})),
		);

		return {
			members: membersWithDetails,
			total: count || 0,
			page,
			pages: Math.ceil((count || 0) / this.PAGE_SIZE),
		};
	}

	async getMemberDetails(
		memberId: string,
		companyId: string,
	): Promise<MemberSearchResult | null> {
		const { data: member, error } = await supabase()
			.from("member_performance_stats")
			.select("*")
			.eq("user_id", memberId)
			.eq("company_id", companyId)
			.single();

		if (error) return null;

		const badges = await this.getMemberBadges(memberId, companyId);

		return {
			id: member.user_id,
			user_id: member.user_id,
			username: member.username,
			avatar: member.avatar,
			character_class: member.character_class,
			level: member.level || 1,
			total_referrals: member.total_referrals || 0,
			total_commission: member.total_commission || 0,
			conversion_rate: member.conversion_rate || 0,
			engagement_score: member.engagement_score || 0,
			retention_rate: member.retention_rate || 0,
			quest_completion_rate: member.quest_completion_rate || 0,
			last_active: member.last_active,
			join_date: member.join_date,
			is_active: member.is_active,
			rank: await this.getMemberRank(memberId, companyId),
			badges,
		};
	}

	async getMemberAnalytics(
		memberId: string,
		companyId: string,
		timeframe: "7d" | "30d" | "90d" = "30d",
	) {
		const startDate = this.getTimeframeStartDate(timeframe);

		// Get member's recent referrals
		const { data: referrals } = await supabase()
			.from("referrals")
			.select("*")
			.eq("referrer_id", memberId)
			.eq("company_id", companyId)
			.gte("created_at", startDate.toISOString())
			.order("created_at", { ascending: false });

		// Get member's quest activity
		const { data: quests } = await supabase()
			.from("user_quests")
			.select(`
        *,
        quest:quests (
          title,
          quest_type,
          difficulty,
          reward_xp,
          reward_commission
        )
      `)
			.eq("user_id", memberId)
			.gte("created_at", startDate.toISOString())
			.order("created_at", { ascending: false });

		// Get member's daily performance
		const { data: dailyStats } = await supabase()
			.from("daily_member_stats")
			.select("*")
			.eq("user_id", memberId)
			.eq("company_id", companyId)
			.gte("date", startDate.toISOString())
			.order("date", { ascending: false });

		return {
			referrals: referrals || [],
			quests: quests || [],
			daily_stats: dailyStats || [],
			summary: {
				total_referrals: referrals?.length || 0,
				converted_referrals:
					referrals?.filter((r: any) => r.converted_at).length || 0,
				total_commission:
					referrals?.reduce(
						(sum: any, r: any) => sum + (r.commission_amount || 0),
						0,
					) || 0,
				completed_quests:
					quests?.filter((q: any) => q.is_completed).length || 0,
				claimed_rewards:
					quests?.filter((q: any) => q.reward_claimed).length || 0,
			},
		};
	}

	async exportMembers(
		companyId: string,
		options: MemberExportOptions,
	): Promise<string> {
		const { members } = await this.searchMembers(companyId, options.filters, 1);

		switch (options.format) {
			case "csv":
				return this.exportToCSV(members, options.fields);
			case "json":
				return this.exportToJSON(members, options.fields);
			case "xlsx":
				// For Excel export, you would need a library like xlsx
				// For now, return CSV format
				return this.exportToCSV(members, options.fields);
			default:
				throw new Error(`Unsupported export format: ${options.format}`);
		}
	}

	async getMemberRank(memberId: string, companyId: string): Promise<number> {
		const { data: higherPerformers, error } = await supabase()
			.from("member_performance_stats")
			.select("user_id, total_commission", { count: "exact" })
			.eq("company_id", companyId)
			.gt(
				"total_commission",
				supabase()
					.from("member_performance_stats")
					.select("total_commission")
					.eq("user_id", memberId)
					.single(),
			);

		if (error) throw error;

		return (higherPerformers?.length || 0) + 1;
	}

	async getMemberBadges(
		memberId: string,
		companyId: string,
	): Promise<string[]> {
		const { data: achievements } = await supabase()
			.from("user_achievements")
			.select("achievement:achievements (badge_icon)")
			.eq("user_id", memberId)
			.eq("company_id", companyId);

		return (achievements || [])
			.map((a: any) => {
				const achievement = a as any;
				return achievement.achievement?.badge_icon || "🏆";
			})
			.slice(0, 5);
	}

	async getMemberStats(companyId: string): Promise<{
		total_members: number;
		active_members: number;
		average_level: number;
		total_commission: number;
		top_character_class: string;
		new_members_this_month: number;
	}> {
		const { data: members, error } = await supabase()
			.from("member_performance_stats")
			.select("*")
			.eq("company_id", companyId);

		if (error) throw error;

		const totalMembers = members?.length || 0;
		const activeMembers = members?.filter((m: any) => m.is_active).length || 0;
		const averageLevel =
			members?.reduce((sum: any, m: any) => sum + (m.level || 0), 0) /
			(members?.length || 1);
		const totalCommission =
			members?.reduce(
				(sum: any, m: any) => sum + (m.total_commission || 0),
				0,
			) || 0;

		// Find most popular character class
		const classCounts = members?.reduce(
			(acc: any, m: any) => {
				acc[m.character_class] = (acc[m.character_class] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const topCharacterClass = Object.entries(classCounts).reduce(
			(max: any, [cls, count]: any[]) =>
				(count as number) > max.count
					? { class: cls, count: count as number }
					: max,
			{ class: "", count: 0 },
		).class;

		// Get new members this month
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		const newMembersThisMonth =
			members?.filter((m: any) => new Date(m.join_date) >= startOfMonth)
				.length || 0;

		return {
			total_members: totalMembers,
			active_members: activeMembers,
			average_level: Math.round(averageLevel * 10) / 10,
			total_commission: totalCommission,
			top_character_class: topCharacterClass,
			new_members_this_month: newMembersThisMonth,
		};
	}

	async bulkUpdateMembers(
		companyId: string,
		updates: Array<{
			user_id: string;
			updates: Partial<MemberSearchResult>;
		}>,
	): Promise<void> {
		const updatePromises = updates.map(async ({ user_id, updates }: any) => {
			const { error } = await supabase()
				.from("member_performance_stats")
				.update(updates)
				.eq("user_id", user_id)
				.eq("company_id", companyId);

			if (error) throw error;
		});

		await Promise.all(updatePromises);
	}

	async getMemberActivityTimeline(
		memberId: string,
		companyId: string,
		limit = 50,
	) {
		const { data: activity } = await supabase()
			.from("recent_activity")
			.select("*")
			.eq("user_id", memberId)
			.eq("company_id", companyId)
			.order("timestamp", { ascending: false })
			.limit(limit);

		return (activity || []).map((act: any) => ({
			id: act.id,
			type: act.action,
			title: this.getActivityTitle(act.action),
			description: act.description || "",
			value: act.value,
			timestamp: act.timestamp,
			metadata: act.metadata || {},
		}));
	}

	private getActivityTitle(action: string): string {
		const titles: Record<string, string> = {
			referral_created: "New Referral",
			referral_converted: "Referral Converted",
			quest_completed: "Quest Completed",
			reward_claimed: "Reward Claimed",
			level_up: "Level Up",
			achievement_unlocked: "Achievement Unlocked",
			commission_earned: "Commission Earned",
		};

		return titles[action] || "Activity";
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

	private exportToCSV(members: MemberSearchResult[], fields: string[]): string {
		const headers = fields.join(",");
		const rows = members.map((member: any) =>
			fields
				.map((field: any) => {
					const value = member[field as keyof MemberSearchResult];
					return typeof value === "string" ? `"${value}"` : value;
				})
				.join(","),
		);

		return [headers, ...rows].join("\n");
	}

	private exportToJSON(
		members: MemberSearchResult[],
		fields: string[],
	): string {
		const filteredMembers = members.map((member: any) => {
			const filtered: any = {};
			fields.forEach((field: any) => {
				filtered[field] = member[field as keyof MemberSearchResult];
			});
			return filtered;
		});

		return JSON.stringify(filteredMembers, null, 2);
	}
}

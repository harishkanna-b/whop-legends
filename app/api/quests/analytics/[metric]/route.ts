import { supabase, supabaseService } from "@/lib/supabase-client";
import { type NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ metric: string }> },
) {
	const { metric } = await params;
	try {
		const { searchParams } = new URL(request.url);
		const companyId = searchParams.get("companyId");
		const userId = searchParams.get("userId");
		const days = Number.parseInt(searchParams.get("days") || "30");

		if (!companyId) {
			return NextResponse.json(
				{ error: "Company ID is required" },
				{ status: 400 },
			);
		}

		const validMetrics = [
			"completion-rates",
			"engagement",
			"performance",
			"rewards",
		];

		if (!validMetrics.includes(metric)) {
			return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
		}

		let result;

		switch (metric) {
			case "completion-rates":
				result = await getCompletionRates(companyId, userId, days);
				break;
			case "engagement":
				result = await getEngagementMetrics(companyId, userId, days);
				break;
			case "performance":
				result = await getPerformanceAnalytics(companyId, userId, days);
				break;
			case "rewards":
				result = await getRewardAnalytics(companyId, userId, days);
				break;
			default:
				return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error fetching quest analytics:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// Analytics helper methods
async function getCompletionRates(
	companyId: string,
	userId: string | null,
	days: number,
) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	const query = supabaseService()
		.from("user_quests")
		.select(
			`
      *,
      quest:quests(quest_type, difficulty, reward_xp, reward_commission),
      user:users(character_class, level)
    `,
		)
		.gte("created_at", cutoffDate.toISOString());

	if (userId) {
		query.eq("user_id", userId);
	} else {
		// For company-wide analytics, we need to join with users table
		query.eq("user->company_id", companyId);
	}

	const { data: userQuests, error } = await query;

	if (error || !userQuests) {
		return { error: "Failed to fetch completion data" };
	}

	const totalQuests = userQuests.length;
	const completedQuests = userQuests.filter((q: any) => q.is_completed);
	const completionRate =
		totalQuests > 0 ? (completedQuests.length / totalQuests) * 100 : 0;

	// Group by quest type
	const byType: Record<string, { total: number; completed: number }> = {};
	const byDifficulty: Record<string, { total: number; completed: number }> = {};
	const byCharacterClass: Record<string, { total: number; completed: number }> =
		{};

	userQuests.forEach((userQuest: any) => {
		const quest = userQuest.quest;
		const user = userQuest.user as any;

		// By type
		if (quest) {
			if (!byType[quest.quest_type]) {
				byType[quest.quest_type] = { total: 0, completed: 0 };
			}
			byType[quest.quest_type].total++;
			if (userQuest.is_completed) {
				byType[quest.quest_type].completed++;
			}

			// By difficulty
			if (!byDifficulty[quest.difficulty]) {
				byDifficulty[quest.difficulty] = { total: 0, completed: 0 };
			}
			byDifficulty[quest.difficulty].total++;
			if (userQuest.is_completed) {
				byDifficulty[quest.difficulty].completed++;
			}
		}

		// By character class
		if (user?.character_class) {
			if (!byCharacterClass[user.character_class]) {
				byCharacterClass[user.character_class] = { total: 0, completed: 0 };
			}
			byCharacterClass[user.character_class].total++;
			if (userQuest.is_completed) {
				byCharacterClass[user.character_class].completed++;
			}
		}
	});

	// Calculate completion rates
	const completionRatesByType = Object.entries(byType).reduce(
		(acc, [type, data]) => {
			acc[type] = data.total > 0 ? (data.completed / data.total) * 100 : 0;
			return acc;
		},
		{} as Record<string, number>,
	);

	const completionRatesByDifficulty = Object.entries(byDifficulty).reduce(
		(acc, [difficulty, data]) => {
			acc[difficulty] =
				data.total > 0 ? (data.completed / data.total) * 100 : 0;
			return acc;
		},
		{} as Record<string, number>,
	);

	const completionRatesByClass = Object.entries(byCharacterClass).reduce(
		(acc, [classType, data]) => {
			acc[classType] = data.total > 0 ? (data.completed / data.total) * 100 : 0;
			return acc;
		},
		{} as Record<string, number>,
	);

	return {
		metric: "completion-rates",
		total_quests: totalQuests,
		completed_quests: completedQuests.length,
		completion_rate: completionRate,
		completion_rates_by_type: completionRatesByType,
		completion_rates_by_difficulty: completionRatesByDifficulty,
		completion_rates_by_class: completionRatesByClass,
		period_days: days,
	};
}

async function getEngagementMetrics(
	companyId: string,
	userId: string | null,
	days: number,
) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	// Get active users with quests
	const { data: activeUsers, error: userError } = await supabaseService()
		.from("user_quests")
		.select("user_id")
		.gte("created_at", cutoffDate.toISOString())
		.eq("is_completed", false);

	const uniqueActiveUsers = new Set(
		activeUsers?.map((u: any) => u.user_id) || [],
	).size;

	// Get total users in company
	const { data: totalUsers, error: totalError } = await supabaseService()
		.from("users")
		.select("id")
		.eq("company_id", companyId);

	const engagementRate =
		totalUsers && totalUsers.length > 0
			? (uniqueActiveUsers / totalUsers.length) * 100
			: 0;

	// Get quest activity by day
	const { data: dailyActivity, error: activityError } = await supabaseService()
		.from("user_quests")
		.select("created_at, is_completed")
		.gte("created_at", cutoffDate.toISOString());

	const activityByDay: Record<string, { created: number; completed: number }> =
		{};

	dailyActivity?.forEach((quest: any) => {
		const date = new Date(quest.created_at).toISOString().split("T")[0];
		if (!activityByDay[date]) {
			activityByDay[date] = { created: 0, completed: 0 };
		}
		activityByDay[date].created++;
		if (quest.is_completed) {
			activityByDay[date].completed++;
		}
	});

	return {
		metric: "engagement",
		total_users: totalUsers?.length || 0,
		active_users: uniqueActiveUsers,
		engagement_rate: engagementRate,
		daily_activity: Object.entries(activityByDay).map(([date, stats]) => ({
			date,
			created: stats.created,
			completed: stats.completed,
		})),
		period_days: days,
	};
}

async function getPerformanceAnalytics(
	companyId: string,
	userId: string | null,
	days: number,
) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	// Get top performing users
	const { data: topPerformers, error: perfError } = await supabaseService()
		.from("user_quests")
		.select(
			`
      user_id,
      user:users(username, character_class, level),
      is_completed,
      quest:quests(reward_xp, reward_commission)
    `,
		)
		.gte("created_at", cutoffDate.toISOString())
		.eq("is_completed", true);

	const userStats: Record<
		string,
		{
			username: string;
			character_class: string;
			level: number;
			completed_quests: number;
			total_xp: number;
			total_commission: number;
		}
	> = {};

	topPerformers?.forEach((item: any) => {
		const user = item.user as any;
		const quest = item.quest as any;

		if (!userStats[item.user_id]) {
			userStats[item.user_id] = {
				username: user.username,
				character_class: user.character_class,
				level: user.level,
				completed_quests: 0,
				total_xp: 0,
				total_commission: 0,
			};
		}

		userStats[item.user_id].completed_quests++;
		userStats[item.user_id].total_xp += quest?.[0]?.reward_xp || 0;
		userStats[item.user_id].total_commission +=
			quest?.[0]?.reward_commission || 0;
	});

	const performers = Object.entries(userStats)
		.map(([userId, stats]) => ({ userId, ...stats }))
		.sort((a, b) => b.completed_quests - a.completed_quests)
		.slice(0, 10);

	return {
		metric: "performance",
		top_performers: performers,
		period_days: days,
	};
}

async function getRewardAnalytics(
	companyId: string,
	userId: string | null,
	days: number,
) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	const query = supabaseService()
		.from("user_quests")
		.select(
			`
      reward_claimed_at,
      quest:quests(reward_xp, reward_commission, quest_type, difficulty),
      user:users(character_class)
    `,
		)
		.gte("reward_claimed_at", cutoffDate.toISOString())
		.eq("reward_claimed", true);

	if (userId) {
		query.eq("user_id", userId);
	} else {
		query.eq("user->company_id", companyId);
	}

	const { data: claimedRewards, error } = await query;

	if (error || !claimedRewards) {
		return { error: "Failed to fetch reward data" };
	}

	const totalXP = claimedRewards.reduce(
		(sum: number, item: any) =>
			sum + ((item.quest as any)?.[0]?.reward_xp || 0),
		0,
	);
	const totalCommission = claimedRewards.reduce(
		(sum: number, item: any) =>
			sum + ((item.quest as any)?.[0]?.reward_commission || 0),
		0,
	);

	// Group rewards by type
	const rewardsByType: Record<
		string,
		{ xp: number; commission: number; count: number }
	> = {};
	const rewardsByClass: Record<
		string,
		{ xp: number; commission: number; count: number }
	> = {};

	claimedRewards.forEach((item: any) => {
		const quest = item.quest as any;
		const user = item.user as any;
		const questData = quest?.[0];

		if (questData) {
			// By quest type
			if (!rewardsByType[questData.quest_type]) {
				rewardsByType[questData.quest_type] = {
					xp: 0,
					commission: 0,
					count: 0,
				};
			}
			rewardsByType[questData.quest_type].xp += questData.reward_xp;
			rewardsByType[questData.quest_type].commission +=
				questData.reward_commission;
			rewardsByType[questData.quest_type].count++;

			// By character class
			if (user?.character_class) {
				if (!rewardsByClass[user.character_class]) {
					rewardsByClass[user.character_class] = {
						xp: 0,
						commission: 0,
						count: 0,
					};
				}
				rewardsByClass[user.character_class].xp += questData.reward_xp;
				rewardsByClass[user.character_class].commission +=
					questData.reward_commission;
				rewardsByClass[user.character_class].count++;
			}
		}
	});

	return {
		metric: "rewards",
		total_xp_earned: totalXP,
		total_commission_earned: totalCommission,
		total_rewards_claimed: claimedRewards.length,
		average_xp_per_reward:
			claimedRewards.length > 0 ? totalXP / claimedRewards.length : 0,
		average_commission_per_reward:
			claimedRewards.length > 0 ? totalCommission / claimedRewards.length : 0,
		rewards_by_type: rewardsByType,
		rewards_by_class: rewardsByClass,
		period_days: days,
	};
}

import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { supabaseService } from "@/lib/supabase-client";
// @ts-nocheck
import { type NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any

/**
 * GET /api/quests/analytics - Get quest analytics and metrics
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const companyId = searchParams.get("company_id");
		const questType = searchParams.get("quest_type");
		const timeRange = searchParams.get("time_range") || "7d"; // 7d, 30d, 90d, all

		if (!companyId) {
			return createErrorResponse("Company ID is required", 400);
		}

		// Calculate date range
		const now = new Date();
		let startDate = new Date();

		switch (timeRange) {
			case "7d":
				startDate.setDate(now.getDate() - 7);
				break;
			case "30d":
				startDate.setDate(now.getDate() - 30);
				break;
			case "90d":
				startDate.setDate(now.getDate() - 90);
				break;
			case "all":
				startDate = new Date(0); // Beginning of time
				break;
			default:
				startDate.setDate(now.getDate() - 7);
		}

		// Get quest completion analytics
		const { data: questStats, error: questError } = await supabaseService().rpc(
			"get_quest_analytics",
			{
				p_company_id: companyId,
				p_quest_type: questType,
				p_start_date: startDate.toISOString(),
				p_end_date: now.toISOString(),
			},
		);

		if (questError) {
			console.error("Error fetching quest analytics:", questError);
			// Fallback to manual calculation
			return await getFallbackAnalytics(companyId, questType, startDate, now);
		}

		// Get user engagement metrics
		const { data: engagementData, error: engagementError } =
			await supabaseService()
				.from("user_quests")
				.select("user_id, created_at, status")
				.gte("created_at", startDate.toISOString())
				.lte("created_at", now.toISOString());

		if (engagementError) {
			console.error("Error fetching engagement data:", engagementError);
		}

		const analytics = {
			quest_stats: questStats || {},
			user_engagement: calculateEngagementMetrics(engagementData || []),
			popular_quests: await getPopularQuests(companyId, startDate, now),
			completion_trends: await getCompletionTrends(
				companyId,
				questType,
				startDate,
				now,
			),
		};

		return createSuccessResponse(analytics);
	} catch (error) {
		console.error("Error fetching quest analytics:", error);
		return createErrorResponse("Failed to fetch quest analytics", 500);
	}
}

interface QuestItem {
	id: string;
	quest_type: string;
}

interface UserQuestItem {
	quest_id: string;
	user_id: string;
	is_completed: boolean;
}

interface UserQuestEngagement {
	user_id: string;
	status?: string;
}

interface UserQuestWithQuestData {
	quest_id: string;
	quest?: Array<{
		title: string;
		difficulty: string;
		quest_type: string;
	}>;
	is_completed: boolean;
	created_at: string;
}

interface UserQuestForTrends {
	created_at: string;
	completed_at: string | null;
	is_completed: boolean;
	quest?: Array<{
		quest_type: string;
	}>;
}

/**
 * Fallback analytics calculation when RPC is not available
 */
async function getFallbackAnalytics(
	companyId: string,
	questType: string | null,
	startDate: Date,
	endDate: Date,
) {
	try {
		// Get basic quest statistics
		const { data: quests, error } = await supabaseService()
			.from("quests")
			.select("*")
			.eq("company_id", companyId)
			.eq("is_active", true);

		if (error) throw error;

		const { data: userQuests, error: userQuestError } = await supabaseService()
			.from("user_quests")
			.select("*")
			.gte("created_at", startDate.toISOString())
			.lte("created_at", endDate.toISOString());

		if (userQuestError) throw userQuestError;

		const filteredQuests = questType
			? quests.filter((q: QuestItem) => q.quest_type === questType)
			: quests;

		const filteredUserQuests = userQuests.filter((uq: UserQuestItem) =>
			filteredQuests.some((q: QuestItem) => q.id === uq.quest_id),
		);

		const totalQuests = filteredQuests.length;
		const completedQuests = filteredUserQuests.filter(
			(uq: UserQuestItem) => uq.is_completed,
		).length;
		const totalUsers = new Set(filteredUserQuests.map((uq: UserQuestItem) => uq.user_id))
			.size;

		const analytics = {
			quest_stats: {
				total_quests: totalQuests,
				completed_quests: completedQuests,
				completion_rate:
					totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0,
				total_users: totalUsers,
				average_completion_time: 0, // Would need more detailed calculation
			},
			user_engagement: calculateEngagementMetrics(filteredUserQuests),
			popular_quests: await getPopularQuests(companyId, startDate, endDate),
			completion_trends: await getCompletionTrends(
				companyId,
				questType,
				startDate,
				endDate,
			),
		};

		return createSuccessResponse(analytics);
	} catch (error) {
		console.error("Error in fallback analytics:", error);
		throw error;
	}
}

/**
 * Calculate user engagement metrics
 */
function calculateEngagementMetrics(userQuests: UserQuestEngagement[]) {
	const uniqueUsers = new Set(userQuests.map((uq) => uq.user_id));
	const totalQuests = userQuests.length;
	const completedQuests = userQuests.filter((uq) => uq.is_completed).length;
	const activeQuests = userQuests.filter((uq) => uq.status === "active").length;

	return {
		total_users: uniqueUsers.size,
		average_quests_per_user: totalQuests / (uniqueUsers.size || 1),
		completion_rate:
			totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0,
		active_quest_rate: totalQuests > 0 ? (activeQuests / totalQuests) * 100 : 0,
		daily_active_users: uniqueUsers.size, // Simplified - would need date-based calculation
		weekly_active_users: uniqueUsers.size, // Simplified - would need date-based calculation
	};
}

/**
 * Get most popular quests by completion count
 */
async function getPopularQuests(
	companyId: string,
	startDate: Date,
	endDate: Date,
) {
	try {
		const { data, error } = await supabaseService()
			.from("user_quests")
			.select(`
        quest_id,
        quest:quests(title, difficulty, quest_type),
        is_completed,
        created_at
      `)
			.gte("created_at", startDate.toISOString())
			.lte("created_at", endDate.toISOString())
			.eq("quest.company_id", companyId);

		if (error) throw error;

		// Group by quest and calculate completion counts
		const questCounts: Record<
			string,
			{ quest: Array<{ title: string; difficulty: string; quest_type: string }>; completions: number; attempts: number }
		> = {};

		(data || []).forEach((uq: UserQuestWithQuestData) => {
			if (!questCounts[uq.quest_id]) {
				questCounts[uq.quest_id] = {
					quest: uq.quest,
					completions: 0,
					attempts: 0,
				};
			}
			questCounts[uq.quest_id].attempts++;
			if (uq.is_completed) {
				questCounts[uq.quest_id].completions++;
			}
		});

		return Object.entries(questCounts)
			.map(([questId, data]) => ({
				quest_id: questId,
				title: data.quest.title,
				difficulty: data.quest.difficulty,
				quest_type: data.quest.quest_type,
				completion_count: data.completions,
				attempt_count: data.attempts,
				completion_rate:
					data.attempts > 0 ? (data.completions / data.attempts) * 100 : 0,
			}))
			.sort((a, b) => b.completion_count - a.completion_count)
			.slice(0, 10); // Top 10 quests
	} catch (error) {
		console.error("Error getting popular quests:", error);
		return [];
	}
}

/**
 * Get completion trends over time
 */
async function getCompletionTrends(
	companyId: string,
	questType: string | null,
	startDate: Date,
	endDate: Date,
) {
	try {
		const { data, error } = await supabaseService()
			.from("user_quests")
			.select(
				"created_at, completed_at, is_completed, quest:quests(quest_type)",
			)
			.gte("created_at", startDate.toISOString())
			.lte("created_at", endDate.toISOString())
			.eq("quest.company_id", companyId);

		if (error) throw error;

		const filteredData = questType
			? data.filter(
					(uq: UserQuestForTrends) => (uq.quest?.[0]?.quest_type) === questType,
				)
			: data;

		// Group by day and calculate completion rates
		const dailyStats: Record<string, { created: number; completed: number }> =
			{};

		(filteredData || []).forEach((uq: UserQuestForTrends) => {
			const date = new Date(uq.created_at).toISOString().split("T")[0];
			if (!dailyStats[date]) {
				dailyStats[date] = { created: 0, completed: 0 };
			}
			dailyStats[date].created++;
			if (uq.is_completed) {
				dailyStats[date].completed++;
			}
		});

		return Object.entries(dailyStats)
			.map(([date, stats]) => ({
				date,
				created: stats.created,
				completed: stats.completed,
				completion_rate:
					stats.created > 0 ? (stats.completed / stats.created) * 100 : 0,
			}))
			.sort((a, b) => a.date.localeCompare(b.date));
	} catch (error) {
		console.error("Error getting completion trends:", error);
		return [];
	}
}

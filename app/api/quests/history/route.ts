import { ProgressTracker } from "@/lib/quest-system/progress-tracker";
import { QuestEngine } from "@/lib/quest-system/quest-engine";
import { RewardManager } from "@/lib/quest-system/reward-manager";
import { supabase } from "@/lib/supabase-client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");
		const limit = Number.parseInt(searchParams.get("limit") || "50");
		const offset = Number.parseInt(searchParams.get("offset") || "0");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		// Get user's quest history
		const { data: userQuests, error } = await supabase()
			.from("user_quests")
			.select(`
        *,
        quest:quests(*)
      `)
			.eq("user_id", userId)
			.order("updated_at", { ascending: false })
			.range(offset, offset + limit);

		if (error) {
			return NextResponse.json(
				{ error: "Failed to fetch quest history" },
				{ status: 500 },
			);
		}

		// Get quest statistics
		const stats = await QuestEngine.getUserQuestStats(userId);
		const rewardStats = await RewardManager.getRewardStats(userId);
		const progressHistory = await ProgressTracker.getProgressHistory(
			userId,
			30,
		);

		// Get reward history
		const rewardHistory = await RewardManager.getRewardHistory(userId, limit);

		return NextResponse.json({
			quests: userQuests || [],
			stats,
			reward_stats: rewardStats,
			progress_history: progressHistory,
			reward_history: rewardHistory,
			pagination: {
				limit,
				offset,
				total: userQuests?.length || 0,
			},
		});
	} catch (error) {
		console.error("Error fetching quest history:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { QuestEngine } from "@/lib/quest-system/quest-engine";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/quests/rewards - Claim quest rewards
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { user_id, user_quest_id } = body;

		if (!user_id || !user_quest_id) {
			return createErrorResponse(
				"Missing required fields: user_id, user_quest_id",
				400,
			);
		}

		const reward = await QuestEngine.claimQuestRewards(user_id, user_quest_id);

		if (!reward) {
			return createErrorResponse(
				"Quest not found, not completed, or rewards already claimed",
				404,
			);
		}

		return createSuccessResponse(reward, "Quest rewards claimed successfully");
	} catch (error) {
		console.error("Error claiming quest rewards:", error);
		return createErrorResponse("Failed to claim quest rewards", 500);
	}
}

/**
 * GET /api/quests/rewards - Get user's reward history
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("user_id");
		const limit = Number.parseInt(searchParams.get("limit") || "10");
		const offset = Number.parseInt(searchParams.get("offset") || "0");

		if (!userId) {
			return createErrorResponse("User ID is required", 400);
		}

		// This would need to be implemented in QuestEngine
		// const rewardHistory = await QuestEngine.getUserRewardHistory(userId, limit, offset);

		return createSuccessResponse({
			message: "Reward history endpoint not yet implemented",
			userId,
			limit,
			offset,
			data: [],
		});
	} catch (error) {
		console.error("Error fetching reward history:", error);
		return createErrorResponse("Failed to fetch reward history", 500);
	}
}

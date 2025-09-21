import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { QuestEngine } from "@/lib/quest-system/quest-engine";
import { type NextRequest, NextResponse } from "next/server";

/**
 * PUT /api/quests/progress - Update quest progress
 */
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { user_id, action_type, value } = body;

		if (!user_id || !action_type) {
			return createErrorResponse(
				"Missing required fields: user_id, action_type",
				400,
			);
		}

		// Validate action_type
		const validActionTypes = ["referral", "commission", "level", "achievement"];
		if (!validActionTypes.includes(action_type)) {
			return createErrorResponse(
				`Invalid action_type: ${action_type}. Must be one of: ${validActionTypes.join(", ")}`,
				400,
			);
		}

		// Validate value
		const progressValue = value || 1;
		if (
			typeof progressValue !== "number" ||
			progressValue < 0 ||
			progressValue > 1000
		) {
			return createErrorResponse(
				"Value must be a number between 0 and 1000",
				400,
			);
		}

		await QuestEngine.updateQuestProgress(user_id, action_type, progressValue);

		return createSuccessResponse(null, "Quest progress updated successfully");
	} catch (error) {
		console.error("Error updating quest progress:", error);
		return createErrorResponse("Failed to update quest progress", 500);
	}
}

/**
 * GET /api/quests/progress - Get user's quest progress overview
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("user_id");

		if (!userId) {
			return createErrorResponse("User ID is required", 400);
		}

		const progress = await QuestEngine.getUserQuestProgress(userId);
		const stats = await QuestEngine.getUserQuestStats(userId);

		return createSuccessResponse({
			progress,
			stats,
		});
	} catch (error) {
		console.error("Error fetching quest progress:", error);
		return createErrorResponse("Failed to fetch quest progress", 500);
	}
}

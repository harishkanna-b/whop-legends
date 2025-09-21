import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { QuestEngine } from "@/lib/quest-system/quest-engine";
import { supabase } from "@/lib/supabase-client";
import type { QuestFilters } from "@/lib/types/quest-types";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/quests - Get user's active quests
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("user_id");
		const questType = searchParams.get("quest_type");
		const status = searchParams.get("status");
		const difficulty = searchParams.get("difficulty");

		if (!userId) {
			return createErrorResponse("User ID is required", 400);
		}

		let quests;

		if (questType || status || difficulty) {
			// If filters are provided, use filtered query
			const filters: QuestFilters = {
				quest_type: questType as any,
				status: status as any,
				difficulty: difficulty as any,
			};
			// For now, just get all quests - filtering would need to be implemented
			quests = await QuestEngine.getUserActiveQuests(userId);
		} else {
			// Get all active quests
			quests = await QuestEngine.getUserActiveQuests(userId);
		}

		return createSuccessResponse(quests);
	} catch (error) {
		console.error("Error fetching quests:", error);
		return createErrorResponse("Failed to fetch quests", 500);
	}
}

/**
 * POST /api/quests - Generate new quests for user
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { user_id, company_id, user_level, character_class, quest_type } =
			body;

		if (!user_id || !company_id || !quest_type) {
			return createErrorResponse(
				"Missing required fields: user_id, company_id, quest_type",
				400,
			);
		}

		const config = {
			company_id,
			user_id,
			user_level: user_level || 1,
			character_class: character_class || "scout",
			quest_type,
		};

		let quests;
		switch (quest_type) {
			case "daily":
				quests = await QuestEngine.generateDailyQuests(config);
				break;
			case "weekly":
				quests = await QuestEngine.generateWeeklyQuests(config);
				break;
			case "monthly":
				quests = await QuestEngine.generateMonthlyQuests(config);
				break;
			default:
				quests = await QuestEngine.generateUserQuests(config);
		}

		// Create user quest entries
		for (const quest of quests) {
			await supabase()
				.from("user_quests")
				.insert([
					{
						user_id,
						quest_id: quest.id,
						progress_value: 0,
						is_completed: false,
						reward_claimed: false,
					},
				]);
		}

		return createSuccessResponse(quests, "Quests generated successfully");
	} catch (error) {
		console.error("Error generating quests:", error);
		return createErrorResponse("Failed to generate quests", 500);
	}
}

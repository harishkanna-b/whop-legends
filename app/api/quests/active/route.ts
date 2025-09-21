import { ProgressTracker } from "@/lib/quest-system/progress-tracker";
import { QuestEngine } from "@/lib/quest-system/quest-engine";
import { supabase } from "@/lib/supabase-client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		// Get user's active quests
		const activeQuests = await QuestEngine.getUserActiveQuests(userId);

		// Get current progress for all quests
		const progress = await QuestEngine.getUserQuestProgress(userId);

		// Get progress summary
		const summary = await ProgressTracker.getProgressSummary(userId);

		// Combine quest data with progress
		const questsWithProgress = activeQuests.map((userQuest) => {
			const questProgress = progress.find(
				(p) => p.quest_id === userQuest.quest_id,
			);
			return {
				...userQuest,
				progress: questProgress,
			};
		});

		return NextResponse.json({
			quests: questsWithProgress,
			summary,
			total_active: activeQuests.length,
		});
	} catch (error) {
		console.error("Error fetching active quests:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { userId, companyId, userLevel, characterClass, questType } = body;

		if (!userId || !companyId) {
			return NextResponse.json(
				{ error: "User ID and Company ID are required" },
				{ status: 400 },
			);
		}

		// Generate new quests for user
		const config = {
			company_id: companyId,
			user_level: userLevel || 1,
			character_class: characterClass || "scout",
			quest_type: questType || "daily",
		};

		const newQuests = await QuestEngine.generateUserQuests(config);

		// Assign quests to user (need to import supabase)
		const { data: assignedQuests, error: assignError } = await supabase()
			.from("user_quests")
			.insert(
				newQuests.map((quest) => ({
					user_id: userId,
					quest_id: quest.id,
					progress_value: 0,
					is_completed: false,
					reward_claimed: false,
				})),
			)
			.select(`
        *,
        quest:quests(*)
      `);

		return NextResponse.json({
			success: true,
			assigned_quests: assignedQuests || [],
			total_generated: newQuests.length,
			total_assigned: (assignedQuests || []).length,
		});
	} catch (error) {
		console.error("Error generating quests:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

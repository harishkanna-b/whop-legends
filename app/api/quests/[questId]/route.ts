import { type Database } from "@/lib/database.types";
import { QuestEngine } from "@/lib/quest-system/quest-engine";
import { RewardManager } from "@/lib/quest-system/reward-manager";
import { supabase, supabaseService } from "@/lib/supabase-client";
import { type NextRequest, NextResponse } from "next/server";


type UserQuestWithQuest = Database["public"]["Tables"]["user_quests"]["Row"] & {
	quest: Database["public"]["Tables"]["quests"]["Row"];
};

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ questId: string }> },
) {
	const { questId } = await params;
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		// Get specific user quest
		const { data: userQuest, error } = await supabaseService()
			.from("user_quests")
			.select(
				`
        *,
        quest:quests(*)
      `,
			)
			.eq("id", questId)
			.eq("user_id", userId)
			.single();

		if (error) {
			return NextResponse.json({ error: "Quest not found" }, { status: 404 });
		}

		// Calculate current progress
		const progress = await QuestEngine.getUserQuestProgress(userId);
		const questProgress = progress.find(
			(p) => p.quest_id === (userQuest as UserQuestWithQuest).quest_id,
		);

		return NextResponse.json({
			quest: userQuest,
			progress: questProgress,
			rewards: await RewardManager.calculateQuestRewards(
				userId,
				(userQuest as UserQuestWithQuest).quest_id,
			),
		});
	} catch (error) {
		console.error("Error fetching quest:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ questId: string }> },
) {
	const { questId } = await params;
	try {
		const body = await request.json();
		const { userId, action, value } = body;

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		switch (action) {
			case "claim_reward": {
				const reward = await RewardManager.distributeQuestRewards(
					userId,
					questId,
				);
				if (reward) {
					return NextResponse.json({ success: true, reward });
				}
				return NextResponse.json(
					{ error: "Failed to claim reward" },
					{ status: 400 },
				);
			}

			case "update_progress":
				await QuestEngine.updateQuestProgress(userId, "referral", value || 1);
				return NextResponse.json({ success: true });

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("Error updating quest:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ questId: string }> },
) {
	const { questId } = await params;
	try {
		const body = await request.json();
		const { userId } = body;

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		// Start a new quest
		const { data: existingQuest, error: checkError } = await supabase()
			.from("user_quests")
			.select("*")
			.eq("user_id", userId)
			.eq("quest_id", questId)
			.single();

		if (!checkError && existingQuest) {
			return NextResponse.json(
				{ error: "User already has this quest" },
				{ status: 400 },
			);
		}

		const { data: userQuest, error: insertError } = await supabaseService()
			.from("user_quests")
			.insert({
				user_id: userId,
				quest_id: questId,
				progress_value: 0,
				is_completed: false,
				reward_claimed: false,
			})
			.select()
			.single();

		if (insertError) {
			return NextResponse.json(
				{ error: "Failed to start quest" },
				{ status: 400 },
			);
		}

		return NextResponse.json({ success: true, userQuest });
	} catch (error) {
		console.error("Error starting quest:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

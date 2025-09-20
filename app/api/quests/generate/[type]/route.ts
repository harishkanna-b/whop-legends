import { NextRequest, NextResponse } from "next/server";
import { QuestGenerator } from "@/lib/quest-system/quest-generator";
import { supabaseService } from "@/lib/supabase-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  try {
    const body = await request.json();
    const { companyId, userLevel, characterClass, userId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 },
      );
    }

    const questType = type;
    const validTypes = ["daily", "weekly", "monthly"];

    if (!validTypes.includes(questType)) {
      return NextResponse.json(
        { error: "Invalid quest type" },
        { status: 400 },
      );
    }

    let result;

    if (userId) {
      // Generate quests for specific user
      const config = {
        company_id: companyId,
        user_level: userLevel || 1,
        character_class: characterClass || "scout",
        quest_type: questType as "daily" | "weekly" | "monthly",
      };

      const quests = await QuestGenerator.generateQuestsForUser(config);

      // Assign quests to user
      const { data: assignedQuests, error: assignError } = await supabaseService
        .from("user_quests")
        .insert(
          quests.map((quest) => ({
            user_id: userId,
            quest_id: quest.id,
            progress_value: 0,
            is_completed: false,
            reward_claimed: false,
          })),
        )
        .select(
          `
          *,
          quest:quests(*)
        `,
        );

      result = {
        type: "user",
        success: true,
        generated_quests: quests,
        assigned_quests: assignedQuests || [],
        total_generated: quests.length,
        total_assigned: (assignedQuests || []).length,
      };
    } else {
      // Generate quests for all users in company
      switch (questType) {
        case "daily":
          await QuestGenerator.generateDailyQuests(companyId);
          break;
        case "weekly":
          await QuestGenerator.generateWeeklyQuests(companyId);
          break;
        case "monthly":
          await QuestGenerator.generateMonthlyQuests(companyId);
          break;
      }

      result = {
        type: "company",
        success: true,
        message: `${questType} quests generated for all users in company`,
        quest_type: questType,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating quests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 },
      );
    }

    const questType = type;
    const validTypes = ["daily", "weekly", "monthly"];

    if (!validTypes.includes(questType)) {
      return NextResponse.json(
        { error: "Invalid quest type" },
        { status: 400 },
      );
    }

    // Get available quest types for the company
    const availableTypes =
      await QuestGenerator.getAvailableQuestTypes(companyId);

    return NextResponse.json({
      quest_type: questType,
      is_available: availableTypes.includes(questType),
      available_types: availableTypes,
      company_id: companyId,
    });
  } catch (error) {
    console.error("Error checking quest availability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

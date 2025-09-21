import { achievementManager } from "@/lib/achievements";
import { withRateLimit } from "@/lib/middleware";
import { type NextRequest, NextResponse } from "next/server";

// Handler with rate limiting
const handler = async (request: NextRequest) => {
	try {
		if (request.method !== "POST") {
			return NextResponse.json(
				{ error: "Method not allowed" },
				{ status: 405 },
			);
		}

		const body = await request.json();
		const { userId, eventType, value, metadata } = body;

		if (!userId || !eventType || value === undefined) {
			return NextResponse.json(
				{ error: "userId, eventType, and value are required" },
				{ status: 400 },
			);
		}

		// Validate event type
		const validEventTypes = [
			"referral",
			"level_up",
			"xp_gained",
			"value_generated",
			"streak_updated",
		];
		if (!validEventTypes.includes(eventType)) {
			return NextResponse.json(
				{
					error: `Invalid event type. Must be one of: ${validEventTypes.join(", ")}`,
				},
				{ status: 400 },
			);
		}

		// Update achievement progress
		await achievementManager.updateProgress(userId, eventType, value, metadata);

		return NextResponse.json({
			success: true,
			message: "Achievement progress updated successfully",
		});
	} catch (error) {
		console.error("Achievement update API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
};

export const POST = withRateLimit(handler, {
	type: "api",
	windowMs: 60 * 1000, // 1 minute
	maxRequests: 50, // More restrictive for updates
});

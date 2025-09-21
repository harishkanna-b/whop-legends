import { withRateLimit } from "@/lib/middleware";
import { socialManager } from "@/lib/social";
import { type NextRequest, NextResponse } from "next/server";

// Handler with rate limiting
const handler = async (request: NextRequest) => {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");
		const action = searchParams.get("action");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		switch (action) {
			case "list": {
				const friends = await socialManager.getFriends(userId);
				return NextResponse.json({ success: true, data: friends });
			}

			case "requests": {
				const requests = await socialManager.getFriendRequests(userId);
				return NextResponse.json({ success: true, data: requests });
			}

			case "stats": {
				const stats = await socialManager.getSocialStats(userId);
				return NextResponse.json({ success: true, data: stats });
			}

			default:
				return NextResponse.json(
					{ error: "Invalid action. Use: list, requests, or stats" },
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error("Friends API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
};

export const GET = withRateLimit(handler, {
	type: "api",
	windowMs: 60 * 1000, // 1 minute
	maxRequests: 100,
});

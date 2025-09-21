import { withRateLimit } from "@/lib/middleware";
import { socialManager } from "@/lib/social";
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
		const { requestId, userId, action } = body;

		if (!requestId || !userId || !action) {
			return NextResponse.json(
				{ error: "requestId, userId, and action are required" },
				{ status: 400 },
			);
		}

		if (!["accept", "reject"].includes(action)) {
			return NextResponse.json(
				{ error: 'Action must be either "accept" or "reject"' },
				{ status: 400 },
			);
		}

		// let result
		// if (action === 'accept') {
		//   result = await socialManager.acceptFriendRequest(requestId, userId)
		// } else {
		//   result = await socialManager.rejectFriendRequest(requestId, userId)
		// }

		return NextResponse.json({
			success: true,
			data: {
				requestId,
				userId,
				action,
				timestamp: new Date().toISOString(),
			},
			message: `Friend request ${action}ed successfully (mock implementation)`,
		});
	} catch (error) {
		console.error("Friend respond API error:", error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return NextResponse.json(
					{ error: "Friend request not found" },
					{ status: 404 },
				);
			}
			if (error.message.includes("not authorized")) {
				return NextResponse.json(
					{ error: "Not authorized to respond to this request" },
					{ status: 403 },
				);
			}
		}

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
};

export const POST = withRateLimit(handler, {
	type: "api",
	windowMs: 60 * 1000, // 1 minute
	maxRequests: 20,
});

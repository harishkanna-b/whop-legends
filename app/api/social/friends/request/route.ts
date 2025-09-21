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
		const { requesterId, recipientId, message } = body;

		if (!requesterId || !recipientId) {
			return NextResponse.json(
				{ error: "requesterId and recipientId are required" },
				{ status: 400 },
			);
		}

		if (requesterId === recipientId) {
			return NextResponse.json(
				{ error: "Cannot send friend request to yourself" },
				{ status: 400 },
			);
		}

		const friendRequest = await socialManager.sendFriendRequest(
			requesterId,
			recipientId,
			message,
		);

		return NextResponse.json({
			success: true,
			data: friendRequest,
			message: "Friend request sent successfully",
		});
	} catch (error) {
		console.error("Friend request API error:", error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes("already exists")) {
				return NextResponse.json(
					{ error: "Friend request already exists" },
					{ status: 409 },
				);
			}
			if (error.message.includes("already friends")) {
				return NextResponse.json(
					{ error: "Users are already friends" },
					{ status: 409 },
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
	maxRequests: 10, // More restrictive for sending requests
});

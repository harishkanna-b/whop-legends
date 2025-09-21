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
		const { userId, teamId } = body;

		if (!userId || !teamId) {
			return NextResponse.json(
				{ error: "userId and teamId are required" },
				{ status: 400 },
			);
		}

		await socialManager.leaveTeam(userId, teamId);

		return NextResponse.json({
			success: true,
			message: "Left team successfully",
		});
	} catch (error) {
		console.error("Team leave API error:", error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return NextResponse.json(
					{ error: "Team membership not found" },
					{ status: 404 },
				);
			}
			if (error.message.includes("cannot leave as leader")) {
				return NextResponse.json(
					{
						error:
							"Team leader cannot leave. Transfer leadership or disband team first.",
					},
					{ status: 400 },
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

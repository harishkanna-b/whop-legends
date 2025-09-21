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
		const { inviterId, teamId, inviteeId, message } = body;

		if (!inviterId || !teamId || !inviteeId) {
			return NextResponse.json(
				{ error: "inviterId, teamId, and inviteeId are required" },
				{ status: 400 },
			);
		}

		if (inviterId === inviteeId) {
			return NextResponse.json(
				{ error: "Cannot invite yourself to a team" },
				{ status: 400 },
			);
		}

		const invite = await socialManager.inviteToTeam(
			inviterId,
			teamId,
			inviteeId,
			message,
		);

		return NextResponse.json({
			success: true,
			data: invite,
			message: "Team invitation sent successfully",
		});
	} catch (error) {
		console.error("Team invite API error:", error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return NextResponse.json(
					{ error: "Team or user not found" },
					{ status: 404 },
				);
			}
			if (error.message.includes("not authorized")) {
				return NextResponse.json(
					{ error: "Not authorized to invite users to this team" },
					{ status: 403 },
				);
			}
			if (error.message.includes("already a member")) {
				return NextResponse.json(
					{ error: "User is already a member of this team" },
					{ status: 409 },
				);
			}
			if (error.message.includes("already invited")) {
				return NextResponse.json(
					{ error: "User already has a pending invitation to this team" },
					{ status: 409 },
				);
			}
			if (error.message.includes("team is full")) {
				return NextResponse.json({ error: "Team is full" }, { status: 409 });
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
	maxRequests: 15,
});

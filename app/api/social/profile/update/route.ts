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
		const { userId, updates } = body;

		if (!userId || !updates) {
			return NextResponse.json(
				{ error: "userId and updates are required" },
				{ status: 400 },
			);
		}

		// Validate allowed update fields
		const allowedFields = [
			"username",
			"avatar",
			"banner",
			"bio",
			"location",
			"website",
			"socialLinks",
			"privacySettings",
			"activityStatus",
		];

		const invalidFields = Object.keys(updates).filter(
			(field) => !allowedFields.includes(field),
		);
		if (invalidFields.length > 0) {
			return NextResponse.json(
				{ error: `Invalid update fields: ${invalidFields.join(", ")}` },
				{ status: 400 },
			);
		}

		const profile = await socialManager.updateSocialProfile(userId, updates);

		return NextResponse.json({
			success: true,
			data: profile,
			message: "Social profile updated successfully",
		});
	} catch (error) {
		console.error("Social profile update API error:", error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return NextResponse.json(
					{ error: "Social profile not found" },
					{ status: 404 },
				);
			}
			if (error.message.includes("username already taken")) {
				return NextResponse.json(
					{ error: "Username is already taken" },
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
	maxRequests: 30,
});

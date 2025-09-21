import { rateLimitMiddleware } from "@/lib/rate-limit";
import { type NextRequest, NextResponse } from "next/server";

async function handler() {
	try {
		// In a real implementation, these would come from your database
		const achievementStats = {
			totalAchievements: 150,
			unlockedAchievements: 89345,
			unlockRate: 67.8,
			topAchievements: [
				{
					id: "1",
					name: "First Steps",
					category: "progression",
					rarity: "common",
					unlocks: 15678,
				},
				{
					id: "2",
					name: "Social Butterfly",
					category: "social",
					rarity: "rare",
					unlocks: 8234,
				},
				{
					id: "3",
					name: "Referral Master",
					category: "referral",
					rarity: "legendary",
					unlocks: 1245,
				},
			],
			categoryStats: [
				{
					category: "progression",
					total: 45,
					unlocks: 34567,
					unlockRate: 76.5,
				},
				{ category: "social", total: 35, unlocks: 28934, unlockRate: 82.1 },
				{ category: "referral", total: 25, unlocks: 18745, unlockRate: 74.8 },
				{ category: "milestone", total: 20, unlocks: 15678, unlockRate: 78.4 },
				{ category: "special", total: 25, unlocks: 11421, unlockRate: 45.7 },
			],
		};

		return NextResponse.json(achievementStats);
	} catch (error) {
		console.error("Error getting achievement stats:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export const GET = async (_request: NextRequest) => {
	// Apply rate limiting
	const rateLimitResult = await rateLimitMiddleware(_request as unknown as import("next").NextApiRequest, {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 30, // 30 requests per minute
		keyGenerator: (req) =>
			`admin:${req.headers["x-forwarded-for"] || req.connection.remoteAddress || "unknown"}`,
	});

	if (!rateLimitResult.allowed) {
		return NextResponse.json(
			{ error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter },
			{ status: 429 },
		);
	}

	return await handler();
};

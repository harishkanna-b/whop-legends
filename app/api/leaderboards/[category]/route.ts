import {
	type LeaderboardConfig,
	RankingEngine,
} from "@/lib/leaderboards/ranking-engine";
import {
	RateLimiters,
} from "@/lib/security/rate-limit";
import { SecurityValidator } from "@/lib/security/validation";
import { type NextRequest, NextResponse } from "next/server";


const rankingEngine = new RankingEngine();

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ category: string }> },
) {
	const { category } = await params;
	try {
		// Apply rate limiting (simplified for Next.js API routes)
		const clientIp = request.headers.get("x-forwarded-for") || "unknown";
		const rateLimitResult = await RateLimiters.leaderboard.checkLimit({
			ip: clientIp,
		});

		if (!rateLimitResult.allowed) {
			return NextResponse.json(
				{ error: "Too Many Requests", message: "Rate limit exceeded" },
				{
					status: 429,
					headers: {
						"X-RateLimit-Limit": rateLimitResult.limitInfo.total.toString(),
						"X-RateLimit-Remaining":
							rateLimitResult.limitInfo.remaining.toString(),
						"X-RateLimit-Reset": rateLimitResult.limitInfo.resetTime
							.getTime()
							.toString(),
					},
				},
			);
		}

		const { searchParams } = new URL(request.url);
		const companyId = searchParams.get("companyId");
		const timeframe =
			(searchParams.get("timeframe") as
				| "daily"
				| "weekly"
				| "monthly"
				| "all_time") || "weekly";
		const limit = Number.parseInt(searchParams.get("limit") || "100");
		const page = Number.parseInt(searchParams.get("page") || "1");

		// Validate and sanitize input parameters
		const companyValidation = SecurityValidator.validateCompanyId(
			companyId || "",
		);
		if (!companyId || !companyValidation.isValid) {
			return NextResponse.json(
				{
					error: "Invalid or missing Company ID",
					details: companyValidation.errors,
				},
				{ status: 400 },
			);
		}

		const paramsValidation = SecurityValidator.validateLeaderboardParams({
			category,
			timeframe,
			limit,
			offset: (page - 1) * limit,
		});

		if (!paramsValidation.isValid) {
			return NextResponse.json(
				{
					error: "Invalid parameters",
					details: paramsValidation.errors,
				},
				{ status: 400 },
			);
		}
		const leaderboardId = `${companyId}_${category}_${timeframe}`;

		// Get leaderboard config
		const config: LeaderboardConfig = {
			id: leaderboardId,
			name: `${category.charAt(0).toUpperCase() + category.slice(1)} Leaderboard`,
			description: `Top performers in ${category}`,
			category: category as "overall" | "referrals" | "commission" | "engagement" | "quests" | "retention",
			timeframe,
			scoring_method: "weighted",
			max_entries: limit,
			enabled: true,
		};

		// Calculate leaderboard
		const entries = await rankingEngine.calculateLeaderboard(config);

		// Apply pagination
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedEntries = entries.slice(startIndex, endIndex);

		return NextResponse.json({
			entries: paginatedEntries,
			pagination: {
				current_page: page,
				total_pages: Math.ceil(entries.length / limit),
				total_entries: entries.length,
				has_next: endIndex < entries.length,
				has_prev: page > 1,
			},
			leaderboard: {
				id: leaderboardId,
				name: config.name,
				category,
				timeframe,
				last_updated: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Error fetching leaderboard:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ category: string }> },
) {
	const { category } = await params;
	try {
		const { searchParams } = new URL(request.url);
		const companyId = searchParams.get("companyId");
		const action = searchParams.get("action");

		if (!companyId) {
			return NextResponse.json(
				{ error: "Company ID required" },
				{ status: 400 },
			);
		}

		switch (action) {
			case "refresh": {
				const timeframe =
					(searchParams.get("timeframe") as
						| "daily"
						| "weekly"
						| "monthly"
						| "all_time") || "weekly";
				const leaderboardId = `${companyId}_${category}_${timeframe}`;
				const refreshedEntries =
					await rankingEngine.refreshLeaderboard(leaderboardId);
				return NextResponse.json({
					success: true,
					entries: refreshedEntries,
					message: "Leaderboard refreshed successfully",
				});
			}

			case "getStats": {
				const statsLeaderboardId = `${companyId}_${category}_${searchParams.get("timeframe") || "weekly"}`;
				const stats =
					await rankingEngine.getLeaderboardStatistics(statsLeaderboardId);
				return NextResponse.json(stats);
			}

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("Error processing leaderboard action:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

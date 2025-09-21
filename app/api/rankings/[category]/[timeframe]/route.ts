import { RankingEngine } from "@/lib/leaderboards/ranking-engine";
import { type NextRequest, NextResponse } from "next/server";

const rankingEngine = new RankingEngine();

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ category: string; timeframe: string }> },
) {
	const { category, timeframe } = await params;
	try {
		const { searchParams } = new URL(request.url);
		const companyId = searchParams.get("companyId");
		const userId = searchParams.get("userId");

		if (!companyId) {
			return NextResponse.json(
				{ error: "Company ID required" },
				{ status: 400 },
			);
		}

		if (userId) {
			// Get user's specific ranking
			const leaderboardId = `${companyId}_${category}_${timeframe}`;
			const userRankings = await rankingEngine.getUserRankings(userId, [
				companyId,
			]);

			if (userRankings[leaderboardId]) {
				return NextResponse.json({
					user_ranking: userRankings[leaderboardId],
					leaderboard_id: leaderboardId,
				});
			}
			return NextResponse.json({
				user_ranking: null,
				message: "User not found in leaderboard",
			});
		}
		// Get ranking statistics for the leaderboard
		const leaderboardId = `${companyId}_${category}_${timeframe}`;
		const stats = await rankingEngine.getLeaderboardStatistics(leaderboardId);

		return NextResponse.json({
			leaderboard_id: leaderboardId,
			statistics: stats,
		});
	} catch (error) {
		console.error("Error fetching rankings:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ category: string; timeframe: string }> },
) {
	const { category, timeframe } = await params;
	try {
		const { searchParams } = new URL(request.url);
		const companyId = searchParams.get("companyId");
		const userId = searchParams.get("userId");
		const action = searchParams.get("action");

		if (!companyId || !userId) {
			return NextResponse.json(
				{ error: "Company ID and User ID required" },
				{ status: 400 },
			);
		}

		switch (action) {
			case "getHistory": {
				const leaderboardId = `${companyId}_${category}_${timeframe}`;
				const days = Number.parseInt(searchParams.get("days") || "30");
				const history = await rankingEngine.getRankingHistory(
					userId,
					leaderboardId,
					days,
				);
				return NextResponse.json({ history });
			}

			case "getUserRankings": {
				const companyIds = searchParams.get("companyIds")?.split(",") || [
					companyId,
				];
				const rankings = await rankingEngine.getUserRankings(
					userId,
					companyIds,
				);
				return NextResponse.json({ rankings });
			}

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("Error processing ranking action:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

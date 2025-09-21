import { rateLimitMiddleware } from "@/lib/rate-limit";
import { type NextRequest, NextResponse } from "next/server";

async function handler(request: NextRequest) {
	try {
		// In a real implementation, these would come from your database
		const stats = {
			totalUsers: 15420,
			activeUsers: 8345,
			totalReferrals: 45678,
			totalRevenue: 1250000,
			systemLoad: 45.2,
			uptime: "15d 8h 32m",
		};

		return NextResponse.json(stats);
	} catch (error) {
		console.error("Error getting admin stats:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export const GET = async (request: NextRequest) => {
	// Apply rate limiting
	const rateLimitResult = await rateLimitMiddleware(request as any, {
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

	return await handler(request);
};

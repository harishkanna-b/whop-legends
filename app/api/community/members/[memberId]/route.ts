import { MemberDirectory } from "@/lib/analytics/member-directory";
import { type NextRequest, NextResponse } from "next/server";

const memberDirectory = new MemberDirectory();

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ memberId: string }> },
) {
	const { memberId } = await params;
	try {
		const { searchParams } = new URL(request.url);
		const companyId = searchParams.get("companyId");
		const includeAnalytics = searchParams.get("includeAnalytics") === "true";
		const includeActivity = searchParams.get("includeActivity") === "true";
		const timeframe =
			(searchParams.get("timeframe") as "7d" | "30d" | "90d") || "30d";

		if (!companyId) {
			return NextResponse.json(
				{ error: "Company ID required" },
				{ status: 400 },
			);
		}

		// Get member details
		const memberDetails = await memberDirectory.getMemberDetails(
			memberId,
			companyId,
		);

		if (!memberDetails) {
			return NextResponse.json({ error: "Member not found" }, { status: 404 });
		}

		let analytics = null;
		let activity = null;

		// Get analytics if requested
		if (includeAnalytics) {
			analytics = await memberDirectory.getMemberAnalytics(
				memberId,
				companyId,
				timeframe,
			);
		}

		// Get activity timeline if requested
		if (includeActivity) {
			activity = await memberDirectory.getMemberActivityTimeline(
				memberId,
				companyId,
			);
		}

		return NextResponse.json({
			member: memberDetails,
			analytics,
			activity,
		});
	} catch (error) {
		console.error("Error fetching member details:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ memberId: string }> },
) {
	const { memberId } = await params;
	try {
		const { searchParams } = new URL(request.url);
		const companyId = searchParams.get("companyId");
		const updates = await request.json();

		if (!companyId) {
			return NextResponse.json(
				{ error: "Company ID required" },
				{ status: 400 },
			);
		}

		// Update member
		await memberDirectory.bulkUpdateMembers(companyId, [
			{
				user_id: memberId,
				updates,
			},
		]);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error updating member:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

import { referralManager } from "@/lib/referral-tracking";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { code, clickData } = body;

		if (!code) {
			return NextResponse.json(
				{ success: false, error: "Missing referral code" },
				{ status: 400 },
			);
		}

		await referralManager.trackReferralClick(code, clickData || {});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Referral click tracking error:", error);
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

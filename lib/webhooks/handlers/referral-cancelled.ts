import { supabaseService } from "@/lib/supabase-client";
import type { WebhookProcessingResult, WhopWebhookEvent } from "@/types/whop";

export const handleReferralCancelled = async (
	event: WhopWebhookEvent,
): Promise<WebhookProcessingResult> => {
	const { referral } = event.data;

	if (!referral) {
		return {
			success: false,
			processed: false,
			error: "Missing referral data in webhook payload",
		};
	}

	try {
		// Update referral status to cancelled
		const { data: updatedReferral, error: referralError } =
			await supabaseService()
				.from("referrals")
				.update({
					status: "cancelled",
					commission_status: "cancelled",
				})
				.eq("referral_code", referral.code)
				.select()
				.single();

		if (referralError) {
			throw referralError;
		}

		// If commission was already paid, we might need to adjust user stats
		if (referral.commission_status === "paid") {
			await adjustUserStatsForCancelledReferral(updatedReferral);
		}

		// Log the webhook event
		await supabaseService().from("webhook_logs").insert({
			webhook_id: event.id,
			event_type: event.type,
			referral_id: updatedReferral.id,
			user_id: updatedReferral.referrer_id,
			payload: event.data,
			processed_at: new Date().toISOString(),
			status: "success",
		});

		console.log(
			`Successfully processed referral.cancelled for referral ${referral.code}`,
		);
		return {
			success: true,
			processed: true,
		};
	} catch (error) {
		console.error("Error in handleReferralCancelled:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);

		// Log the failure
		await supabaseService().from("webhook_logs").insert({
			webhook_id: event.id,
			event_type: event.type,
			payload: event.data,
			processed_at: new Date().toISOString(),
			status: "error",
			error_message: errorMessage,
		});

		throw error;
	}
};

// Helper function to adjust user stats when a paid referral is cancelled
const adjustUserStatsForCancelledReferral = async (referral: any) => {
	try {
		// Get the user's current stats
		const { data: user } = await supabaseService()
			.from("users")
			.select("total_referrals, total_commission")
			.eq("id", referral.referrer_id)
			.single();

		if (!user) return;

		// Adjust stats (ensure they don't go negative)
		const newTotalReferrals = Math.max(0, user.total_referrals - 1);
		const newTotalCommission = Math.max(
			0,
			user.total_commission - referral.commission_amount,
		);

		await supabaseService()
			.from("users")
			.update({
				total_referrals: newTotalReferrals,
				total_commission: newTotalCommission,
			})
			.eq("id", referral.referrer_id);

		console.log(
			`Adjusted stats for user ${referral.referrer_id}: referrals=${newTotalReferrals}, commission=${newTotalCommission}`,
		);
	} catch (error) {
		console.error("Error adjusting user stats for cancelled referral:", error);
		// Don't throw here as this is not critical for the webhook processing
	}
};

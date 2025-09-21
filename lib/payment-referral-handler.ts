import { ProgressTracker } from "@/lib/quest-system/progress-tracker";
import { referralManager } from "@/lib/referral-tracking";
import { supabaseService } from "@/lib/supabase-client";
import { waitUntil } from "@vercel/functions";

export async function paymentReferralHandler(
	paymentId: string,
	userId: string | null | undefined,
	amount: number,
	currency: string,
	amountAfterFees: number | null | undefined,
	member: any,
) {
	try {
		if (!userId) {
			console.log(
				"No user_id in payment webhook, skipping referral processing",
			);
			return;
		}

		// Extract referrer information from member metadata or find via referral link
		const referrerId = await findReferrerForUser(userId);

		if (!referrerId) {
			console.log(
				`No referrer found for user ${userId}, skipping referral processing`,
			);
			return;
		}

		console.log(
			`Processing referral for payment ${paymentId}: ${referrerId} -> ${userId}`,
		);

		// Check if referral already exists for this payment
		const { data: existingReferral } = await supabaseService()
			.from("referrals")
			.select("*")
			.eq("whop_payment_id", paymentId)
			.single();

		if (existingReferral) {
			console.log(
				`Referral already exists for payment ${paymentId}, updating status`,
			);
			await supabaseService()
				.from("referrals")
				.update({ status: "completed" })
				.eq("whop_payment_id", paymentId);
			return;
		}

		// Create pending referral
		const { data: pendingReferral, error: referralError } =
			await supabaseService()
				.from("referrals")
				.insert({
					referrer_id: referrerId,
					referred_user_id: userId,
					status: "pending",
					whop_payment_id: paymentId,
					amount: amountAfterFees || amount,
					currency,
				})
				.select()
				.single();

		if (referralError) {
			console.error("Error creating referral:", referralError);
			return;
		}

		console.log(
			`Created pending referral ${pendingReferral.id} for payment ${paymentId}`,
		);

		// Update user stats and achievements
		const { data: user } = await supabaseService()
			.from("users")
			.select("*")
			.eq("id", userId)
			.single();

		if (user) {
			// Update user's total payments
			await supabaseService()
				.from("users")
				.update({
					total_payments: (user.total_payments || 0) + amount,
				})
				.eq("id", userId);
		}

		// Mark referral as completed and process commission
		const { data: updatedReferral, error: updateError } =
			await supabaseService()
				.from("referrals")
				.update({ status: "completed" })
				.eq("id", pendingReferral.id)
				.select()
				.single();

		if (updateError) {
			console.error("Error updating referral status:", updateError);
		} else {
			console.log(`Referral ${pendingReferral.id} marked as completed`);
		}

		// Update quest progress for referrer
		const { data: userQuests } = await supabaseService()
			.from("user_quests")
			.select(`
        *,
        quest (
          target_type,
          target_value
        )
      `)
			.eq("user_id", referrerId)
			.eq("is_completed", false);

		if (userQuests && userQuests.length > 0) {
			const referralQuests = userQuests.filter(
				(uq: any) =>
					uq.quest?.target_type === "referrals" ||
					uq.quest?.target_type === "commission",
			);

			if (referralQuests.length > 0) {
				const questIds = referralQuests.map((uq: any) => uq.id);
				await ProgressTracker.bulkUpdateProgress(referrerId, questIds);
				console.log(`Updated quest progress for referrer ${referrerId}`);
			}
		}

		console.log(`Successfully processed referral for payment ${paymentId}`);
	} catch (error) {
		console.error("Error in payment referral handler:", error);
	}
}

// Helper function to find referrer for a user
async function findReferrerForUser(userId: string): Promise<string | null> {
	try {
		// Try to find referrer via referral link first
		const { data: referralLink } = await supabaseService()
			.from("referral_links")
			.select("creator_id")
			.eq("referred_user_id", userId)
			.single();

		if (referralLink) {
			return referralLink.creator_id;
		}

		// If no referral link, check member metadata for referrer info
		// This would be passed in the member parameter from the webhook
		// For now, return null as we can't determine referrer from just user ID
		return null;
	} catch (error) {
		console.error("Error finding referrer for user:", error);
		return null;
	}
}

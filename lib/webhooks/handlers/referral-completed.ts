import { supabaseService } from "@/lib/supabase-client";
import {
	checkAndUnlockAchievements,
	updateUserStats,
} from "@/lib/user-management";
import { calculateXPForReferral } from "@/lib/xp-calculator";
import type { WebhookProcessingResult, WhopWebhookEvent } from "@/types/whop";

export const handleReferralCompleted = async (
	event: WhopWebhookEvent,
): Promise<WebhookProcessingResult> => {
	const { referral, payment } = event.data;

	if (!referral) {
		return {
			success: false,
			processed: false,
			error: "Missing referral data in webhook payload",
		};
	}

	try {
		// Update referral status to completed
		const { data: updatedReferral, error: referralError } =
			await supabaseService()
				.from("referrals")
				.update({
					status: "completed",
					commission_status: "paid",
					whop_payment_id: payment?.id,
				})
				.eq("referral_code", referral.code)
				.select()
				.single();

		if (referralError) {
			throw referralError;
		}

		// Calculate XP reward for the completed referral
		const xpReward = calculateXPForReferral(
			referral.commission_amount,
			payment?.amount || 0,
		);

		// Update user stats with XP and referral count
		const userUpdateResult = await updateUserStats(
			updatedReferral.referrer_id,
			{
				experience_points: xpReward,
				total_referrals: 1,
				total_commission: referral.commission_amount,
			},
		);

		// Check for new achievements
		const unlockedAchievements = await checkAndUnlockAchievements(
			updatedReferral.referrer_id,
		);

		// Update user quests related to referrals
		await updateUserQuests(updatedReferral.referrer_id);

		// Log the webhook event
		await supabaseService()
			.from("webhook_logs")
			.insert({
				webhook_id: event.id,
				event_type: event.type,
				referral_id: updatedReferral.id,
				user_id: updatedReferral.referrer_id,
				payload: event.data,
				processed_at: new Date().toISOString(),
				status: "success",
				metadata: {
					xp_awarded: xpReward,
					achievements_unlocked: unlockedAchievements,
				},
			});

		console.log(
			`Successfully processed referral.completed for referral ${referral.code}`,
		);
		return {
			success: true,
			processed: true,
		};
	} catch (error) {
		console.error("Error in handleReferralCompleted:", error);

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

// Helper function to update user quests
const updateUserQuests = async (userId: string) => {
	try {
		// Find active referral quests for this user
		const { data: userQuests } = await supabaseService()
			.from("user_quests")
			.select(`
        id,
        quest_id,
        progress_value,
        quests (
          id,
          target_type,
          target_value,
          is_active
        )
      `)
			.eq("user_id", userId)
			.eq("is_completed", false);

		if (!userQuests || userQuests.length === 0) return;

		// Update progress for referral quests
		for (const userQuest of userQuests) {
			const questData = userQuest.quests as any;
			if (questData?.target_type === "referrals" && questData?.is_active) {
				const newProgress = Math.min(
					userQuest.progress_value + 1,
					questData.target_value,
				);

				const isCompleted = newProgress >= questData.target_value;

				await supabaseService()
					.from("user_quests")
					.update({
						progress_value: newProgress,
						is_completed: isCompleted,
						completed_at: isCompleted ? new Date().toISOString() : null,
					})
					.eq("id", userQuest.id);
			}
		}
	} catch (error) {
		console.error("Error updating user quests:", error);
		// Don't throw here as this is not critical
	}
};

import { generateReferralCode } from "@/lib/database-utils";
import { supabaseService } from "@/lib/supabase-client";
import { createOrUpdateUser } from "@/lib/user-management";
import type { WebhookProcessingResult, WhopWebhookEvent } from "@/types/whop";

export const handleReferralCreated = async (
	event: WhopWebhookEvent,
): Promise<WebhookProcessingResult> => {
	const { referral, user } = event.data;

	if (!referral || !user) {
		return {
			success: false,
			processed: false,
			error: "Missing referral or user data in webhook payload",
		};
	}

	try {
		// Create or update user profile
		const userData = await createOrUpdateUser(user.id, {
			username: user.username,
			email: user.email,
			avatar_url: user.avatar_url,
			whop_user_id: user.id,
		});

		// Generate referral code if not provided
		const referralCode = referral.code || generateReferralCode();

		// Create referral record
		const { data: referralRecord, error: referralError } =
			await supabaseService()
				.from("referrals")
				.insert({
					referrer_id: userData.id,
					referred_whop_user_id: referral.referred_user_id || "",
					company_id: referral.company_id,
					referral_code: referralCode,
					status: referral.status,
					commission_amount: referral.commission_amount,
					commission_status: referral.commission_status,
					whop_webhook_id: event.id,
				})
				.select()
				.single();

		if (referralError) {
			// Check if referral already exists
			if (referralError.code === "23505") {
				return {
					success: true,
					processed: true,
				};
			}
			throw referralError;
		}

		// Log the webhook event for audit purposes
		// TODO: Fix database schema - webhook_logs table not in types
		// await supabaseService().from("webhook_logs").insert({
		// 	webhook_id: event.id,
		// 	event_type: event.type,
		// 	referral_id: referralRecord.id,
		// 	user_id: userData.id,
		// 	payload: event.data,
		// 	processed_at: new Date().toISOString(),
		// 	status: "success",
		// });

		console.log(
			`Successfully processed referral.created for user ${user.username}`,
		);
		return {
			success: true,
			processed: true,
		};
	} catch (error) {
		console.error("Error in handleReferralCreated:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);

		// Log the failure
		// TODO: Fix database schema - webhook_logs table not in types
		// await supabaseService().from("webhook_logs").insert({
		// 	webhook_id: event.id,
		// 	event_type: event.type,
		// 	payload: event.data,
		// 	processed_at: new Date().toISOString(),
		// 	status: "error",
		// 	error_message: errorMessage,
		// });

		throw error;
	}
};

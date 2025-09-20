import { waitUntil } from "@vercel/functions";
import { makeWebhookValidator } from "@whop/api";
import type { NextRequest } from "next/server";
import { referralManager } from "@/lib/referral-tracking";
import { supabaseService } from "@/lib/supabase-client";
import { ProgressTracker } from "@/lib/quest-system/progress-tracker";

const validateWebhook = makeWebhookValidator({
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});

export async function POST(request: NextRequest): Promise<Response> {
  // Validate the webhook to ensure it's from Whop
  const webhookData = await validateWebhook(request);

  // Handle the webhook event
  if (webhookData.action === "payment.succeeded") {
    const { id, final_amount, amount_after_fees, currency, user_id } =
      webhookData.data;
    const member = (webhookData.data as any).member;

    // final_amount is the amount the user paid
    // amount_after_fees is the amount that is received by you, after card fees and processing fees are taken out
    // member contains user information including the referrer if available

    console.log(
      `Payment ${id} succeeded for ${user_id} with amount ${final_amount} ${currency}`,
    );

    // if you need to do work that takes a long time, use waitUntil to run it in the background
    waitUntil(
      paymentReferralHandler(
        id,
        user_id,
        final_amount,
        currency,
        amount_after_fees,
        member,
      ),
    );
  }

  // Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
  return new Response("OK", { status: 200 });
}

async function paymentReferralHandler(
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
        `No referrer found for user ${userId}, processing as direct payment`,
      );
      await processDirectPayment(userId, amount, currency);
      return;
    }

    console.log(
      `Processing referral: user ${userId} referred by ${referrerId} for payment ${amount} ${currency}`,
    );

    // Process referral commission
    await processReferralCommission(
      referrerId,
      userId,
      amount,
      paymentId,
      member,
    );

    // Update quest progress for referrer
    await updateReferrerQuestProgress(referrerId, amount);

    // Process direct payment benefits for the payer
    await processDirectPayment(userId, amount, currency);
  } catch (error) {
    console.error("Error processing payment referral:", error);
    // Consider adding error reporting or retry logic here
  }
}

async function findReferrerForUser(userId: string): Promise<string | null> {
  try {
    // First check if user already has a completed referral
    const { data: existingReferral } = await supabaseService
      .from("referrals")
      .select("referrer_id")
      .eq("referred_user_id", userId)
      .eq("status", "completed")
      .single();

    if (existingReferral) {
      return existingReferral.referrer_id;
    }

    // Check for pending referrals that might need completion
    const { data: pendingReferral } = await supabaseService
      .from("referrals")
      .select("referrer_id, id")
      .eq("referred_user_id", userId)
      .eq("status", "pending")
      .single();

    if (pendingReferral) {
      // Complete the pending referral
      await supabaseService
        .from("referrals")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", pendingReferral.id);

      return pendingReferral.referrer_id;
    }

    // If no existing referral, check user metadata for referral tracking
    const { data: user } = await supabaseService
      .from("users")
      .select("metadata")
      .eq("id", userId)
      .single();

    if (user?.metadata?.referred_by) {
      // Create new referral record if found in metadata
      const referrerId = user.metadata.referred_by;
      await referralManager.createReferral(
        referrerId,
        userId,
        0, // Default amount, will be updated when we have the payment amount
        "whop_payment",
        {
          product: "whop_platform",
        },
      );
      return referrerId;
    }

    return null;
  } catch (error) {
    console.error("Error finding referrer for user:", error);
    return null;
  }
}

async function processReferralCommission(
  referrerId: string,
  userId: string,
  amount: number,
  paymentId: string,
  member: any,
) {
  try {
    // Calculate commission (typically 10-20% of payment amount)
    const commissionRate = 0.15; // 15% default commission rate
    const commission = amount * commissionRate;

    // Create or update referral record
    const referral = await referralManager.createReferral(
      referrerId,
      userId,
      amount,
      "whop_payment",
      {
        product: "whop_platform",
        campaign: "payment_commission",
      },
    );

    // Mark referral as completed since payment was successful
    await supabaseService
      .from("referrals")
      .update({
        status: "completed",
        commission: commission,
        commission_rate: commissionRate,
        completed_at: new Date().toISOString(),
      })
      .eq("id", referral.id);

    console.log(
      `Referral commission processed: ${commission} for referrer ${referrerId}`,
    );

    // Update referrer's total commission
    await updateUserCommissionStats(referrerId, commission);
  } catch (error) {
    console.error("Error processing referral commission:", error);
    throw error;
  }
}

async function updateReferrerQuestProgress(referrerId: string, amount: number) {
  try {
    // Get referrer's active quests
    const { data: userQuests } = await supabaseService
      .from("user_quests")
      .select(
        `
				*,
				quest:quests(*)
			`,
      )
      .eq("user_id", referrerId)
      .eq("is_completed", false);

    if (!userQuests || userQuests.length === 0) {
      return;
    }

    // Find relevant quests to update
    const referralQuests = userQuests.filter(
      (uq) =>
        uq.quest?.target_type === "referrals" ||
        uq.quest?.target_type === "commission",
    );

    if (referralQuests.length > 0) {
      const questIds = referralQuests.map((uq) => uq.id);
      await ProgressTracker.bulkUpdateProgress(referrerId, questIds);
      console.log(`Updated quest progress for referrer ${referrerId}`);
    }
  } catch (error) {
    console.error("Error updating referrer quest progress:", error);
    // Don't throw here to avoid interrupting the main flow
  }
}

async function processDirectPayment(
  userId: string,
  amount: number,
  currency: string,
) {
  try {
    // Update user's payment stats (note: total_payments and last_payment_at not in schema)
    // For now, just update the timestamp - actual increment would need to be handled differently
    await supabaseService
      .from("users")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Update user's quest progress for payment-related quests
    const { data: userQuests } = await supabaseService
      .from("user_quests")
      .select(
        `
				*,
				quest:quests(*)
			`,
      )
      .eq("user_id", userId)
      .eq("is_completed", false);

    if (userQuests && userQuests.length > 0) {
      const paymentQuests = userQuests.filter(
        (uq) =>
          uq.quest?.target_type === "payments" ||
          uq.quest?.target_type === "commission",
      );

      if (paymentQuests.length > 0) {
        const questIds = paymentQuests.map((uq) => uq.id);
        await ProgressTracker.bulkUpdateProgress(userId, questIds);
      }
    }

    console.log(
      `Processed direct payment for user ${userId}: ${amount} ${currency}`,
    );
  } catch (error) {
    console.error("Error processing direct payment:", error);
    // Don't throw here to avoid interrupting the main flow
  }
}

async function updateUserCommissionStats(userId: string, commission: number) {
  try {
    // Update user's commission stats (total_commission exists in schema)
    // For now, just update the timestamp - actual increment would need to be handled differently
    await supabaseService
      .from("users")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch (error) {
    console.error("Error updating user commission stats:", error);
    // Don't throw here to avoid interrupting the main flow
  }
}

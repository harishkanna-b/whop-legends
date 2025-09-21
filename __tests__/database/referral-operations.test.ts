import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import {
	createReferral,
	createUser,
	getReferralsByUser,
	updateReferral,
} from "../../lib/database-utils";
import { generateReferralCode } from "../../lib/database-utils";
import { supabaseService } from "../../lib/supabase-client";

describe("Referral Operations", () => {
	const testUser = {
		whop_user_id: "test_referral_user_123",
		company_id: "test_company_123",
		username: "referraluser",
		character_class: "scout" as const,
		level: 1,
		experience_points: 0,
		prestige_level: 0,
		total_referrals: 0,
		total_commission: 0,
	};

	const testReferral = {
		referred_whop_user_id: "referred_user_123",
		company_id: "test_company_123",
		status: "pending" as const,
		commission_amount: 10.0,
		commission_status: "pending" as const,
	};

	let createdUserId: string;
	let createdReferralId: string;

	beforeAll(async () => {
		// Clean up any existing test user
		await supabaseService()
			.from("users")
			.delete()
			.eq("whop_user_id", testUser.whop_user_id);

		// Create test user
		const user = await createUser(testUser);
		createdUserId = user.id;
	});

	afterAll(async () => {
		// Clean up test user and referrals
		await supabaseService().from("users").delete().eq("id", createdUserId);
	});

	it("should create a new referral", async () => {
		const referral = await createReferral({
			...testReferral,
			referrer_id: createdUserId,
			referral_code: generateReferralCode(),
		});

		expect(referral).toBeTruthy();
		expect(referral.referrer_id).toBe(createdUserId);
		expect(referral.referred_whop_user_id).toBe(
			testReferral.referred_whop_user_id,
		);
		expect(referral.status).toBe(testReferral.status);
		expect(referral.commission_amount).toBe(testReferral.commission_amount);

		createdReferralId = referral.id;
	});

	it("should get referrals by user", async () => {
		const referrals = await getReferralsByUser(createdUserId);

		expect(Array.isArray(referrals)).toBe(true);
		expect(referrals.length).toBeGreaterThan(0);

		const referral = referrals[0];
		expect(referral.referrer_id).toBe(createdUserId);
		expect(referral.referred_whop_user_id).toBe(
			testReferral.referred_whop_user_id,
		);
	});

	it("should update referral information", async () => {
		const updates = {
			status: "completed" as const,
			commission_status: "paid" as const,
		};

		const updatedReferral = await updateReferral(createdReferralId, updates);

		expect(updatedReferral).toBeTruthy();
		expect(updatedReferral.status).toBe(updates.status);
		expect(updatedReferral.commission_status).toBe(updates.commission_status);
	});

	it("should respect pagination limits", async () => {
		const referrals = await getReferralsByUser(createdUserId, 1, 0);

		expect(Array.isArray(referrals)).toBe(true);
		expect(referrals.length).toBeLessThanOrEqual(1);
	});

	it("should return empty array for user with no referrals", async () => {
		// Create a user with no referrals
		const noReferralUser = await createUser({
			...testUser,
			whop_user_id: "no_referral_user_123",
			username: "noreferraluser",
		});

		const referrals = await getReferralsByUser(noReferralUser.id);
		expect(referrals).toEqual([]);

		// Clean up
		await supabaseService().from("users").delete().eq("id", noReferralUser.id);
	});

	it("should generate unique referral codes", async () => {
		const code1 = generateReferralCode();
		const code2 = generateReferralCode();

		expect(code1).toHaveLength(8);
		expect(code2).toHaveLength(8);
		expect(code1).not.toBe(code2);
	});
});

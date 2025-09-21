import { referralManager } from "@/lib/referral-tracking";

describe("ReferralManager - Core Functionality", () => {
	test("should have referral manager instance", () => {
		expect(referralManager).toBeDefined();
		expect(typeof referralManager.createReferral).toBe("function");
		expect(typeof referralManager.getUserReferrals).toBe("function");
		expect(typeof referralManager.getReferralStats).toBe("function");
		expect(typeof referralManager.generateReferralLink).toBe("function");
		expect(typeof referralManager.trackReferralClick).toBe("function");
		expect(typeof referralManager.getUserCampaigns).toBe("function");
		expect(typeof referralManager.createCampaign).toBe("function");
		expect(typeof referralManager.getReferralAnalytics).toBe("function");
	});

	test("should handle database connection errors gracefully", async () => {
		// These should return empty arrays or default values instead of throwing
		const referrals = await referralManager.getUserReferrals("test-user");
		expect(Array.isArray(referrals)).toBe(true);

		const stats = await referralManager.getReferralStats("test-user");
		expect(typeof stats).toBe("object");
		expect(stats.totalReferrals).toBe(0);
		expect(stats.conversionRate).toBe(0);

		const campaigns = await referralManager.getUserCampaigns("test-user");
		expect(Array.isArray(campaigns)).toBe(true);

		const analytics = await referralManager.getReferralAnalytics(
			"test-user",
			"30d",
		);
		expect(typeof analytics).toBe("object");
		expect(analytics.totalClicks).toBe(0);
		expect(analytics.conversions).toBe(0);
	});

	test("should return proper stats structure", async () => {
		const stats = await referralManager.getReferralStats("test-user");

		expect(stats).toHaveProperty("totalReferrals");
		expect(stats).toHaveProperty("completedReferrals");
		expect(stats).toHaveProperty("pendingReferrals");
		expect(stats).toHaveProperty("totalValue");
		expect(stats).toHaveProperty("totalCommission");
		expect(stats).toHaveProperty("conversionRate");
		expect(stats).toHaveProperty("topSources");
		expect(stats).toHaveProperty("monthlyTrend");
		expect(stats).toHaveProperty("performanceMetrics");

		expect(typeof stats.totalReferrals).toBe("number");
		expect(typeof stats.completedReferrals).toBe("number");
		expect(typeof stats.conversionRate).toBe("number");
		expect(Array.isArray(stats.topSources)).toBe(true);
		expect(Array.isArray(stats.monthlyTrend)).toBe(true);
	});

	test("should return proper analytics structure", async () => {
		const analytics = await referralManager.getReferralAnalytics(
			"test-user",
			"30d",
		);

		expect(analytics).toHaveProperty("timeframe");
		expect(analytics).toHaveProperty("totalClicks");
		expect(analytics).toHaveProperty("uniqueClicks");
		expect(analytics).toHaveProperty("conversions");
		expect(analytics).toHaveProperty("conversionRate");
		expect(analytics).toHaveProperty("deviceBreakdown");
		expect(analytics).toHaveProperty("browserBreakdown");

		expect(typeof analytics.totalClicks).toBe("number");
		expect(typeof analytics.uniqueClicks).toBe("number");
		expect(typeof analytics.conversionRate).toBe("number");
		expect(typeof analytics.deviceBreakdown).toBe("object");
		expect(Array.isArray(analytics.browserBreakdown)).toBe(true);
	});

	test("should track referral clicks without throwing", async () => {
		// This should not throw an error, even with invalid data
		await expect(
			referralManager.trackReferralClick("invalid-code", {}),
		).resolves.not.toThrow();
	});

	test("should handle empty results gracefully", async () => {
		const referrals =
			await referralManager.getUserReferrals("nonexistent-user");
		expect(Array.isArray(referrals)).toBe(true);
		expect(referrals).toHaveLength(0);

		const campaigns =
			await referralManager.getUserCampaigns("nonexistent-user");
		expect(Array.isArray(campaigns)).toBe(true);
		expect(campaigns).toHaveLength(0);
	});
});

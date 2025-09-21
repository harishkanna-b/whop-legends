import { socialManager } from "@/lib/social";

describe("SocialManager - Minimal Validation", () => {
	test("should have social manager instance", () => {
		expect(socialManager).toBeDefined();
		expect(typeof socialManager.sendFriendRequest).toBe("function");
		expect(typeof socialManager.getFriends).toBe("function");
		expect(typeof socialManager.createTeam).toBe("function");
		expect(typeof socialManager.getTeams).toBe("function");
		expect(typeof socialManager.getSocialProfile).toBe("function");
		expect(typeof socialManager.updateSocialProfile).toBe("function");
		expect(typeof socialManager.getSocialActivity).toBe("function");
		expect(typeof socialManager.getSocialStats).toBe("function");
	});

	test("should handle database connection errors gracefully", async () => {
		// These should return empty arrays or null values instead of throwing
		const friends = await socialManager.getFriends("test-user");
		expect(Array.isArray(friends)).toBe(true);

		const requests = await socialManager.getFriendRequests("test-user");
		expect(Array.isArray(requests)).toBe(true);

		const teams = await socialManager.getTeams("test-user");
		expect(Array.isArray(teams)).toBe(true);

		const profile = await socialManager.getSocialProfile("test-user");
		// Profile can be null if not found
		expect(profile === null || typeof profile === "object").toBe(true);

		const activity = await socialManager.getSocialActivity("test-user", 10);
		expect(Array.isArray(activity)).toBe(true);

		const stats = await socialManager.getSocialStats("test-user");
		expect(typeof stats).toBe("object");
	});

	test("should return proper stats structure", async () => {
		const stats = await socialManager.getSocialStats("test-user");

		expect(stats).toHaveProperty("friendsCount");
		expect(stats).toHaveProperty("teamsCount");
		expect(stats).toHaveProperty("referralsGiven");
		expect(stats).toHaveProperty("referralsReceived");
		expect(stats).toHaveProperty("totalValueGenerated");
		expect(stats).toHaveProperty("socialAchievements");
		expect(stats).toHaveProperty("rank");

		expect(typeof stats.friendsCount).toBe("number");
		expect(typeof stats.teamsCount).toBe("number");
		expect(typeof stats.referralsGiven).toBe("number");
		expect(typeof stats.referralsReceived).toBe("number");
		expect(typeof stats.totalValueGenerated).toBe("number");
		expect(typeof stats.socialAchievements).toBe("number");
		expect(typeof stats.rank).toBe("number");
	});

	test("should handle empty results gracefully", async () => {
		const friends = await socialManager.getFriends("nonexistent-user");
		expect(Array.isArray(friends)).toBe(true);

		const teams = await socialManager.getTeams("nonexistent-user");
		expect(Array.isArray(teams)).toBe(true);

		const activity = await socialManager.getSocialActivity(
			"nonexistent-user",
			5,
		);
		expect(Array.isArray(activity)).toBe(true);
	});
});

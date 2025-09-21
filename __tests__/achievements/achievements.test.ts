import {
	ACHIEVEMENT_CATEGORIES,
	ACHIEVEMENT_RARITIES,
	DEFAULT_ACHIEVEMENTS,
	achievementManager,
} from "@/lib/achievements";

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
	supabase: {
		from: jest.fn(() => ({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			insert: jest
				.fn()
				.mockResolvedValue({ data: [{ id: "test-achievement" }], error: null }),
			update: jest
				.fn()
				.mockResolvedValue({
					data: { progress: 1, unlocked_at: new Date().toISOString() },
					error: null,
				}),
			order: jest.fn().mockReturnThis(),
			limit: jest.fn().mockResolvedValue({
				data: [
					{
						id: "ua1",
						user_id: "user-123",
						achievement_id: "first_referral",
						progress: 1,
						max_progress: 1,
						unlocked_at: new Date().toISOString(),
						last_progressed_at: new Date().toISOString(),
						achievement: {
							id: "first_referral",
							name: "First Steps",
							description: "Make your first successful referral",
							icon: "🎯",
							category: {
								id: "referral",
								name: "Referral Mastery",
								color: "#3B82F6",
								icon: "🎯",
							},
							rarity: {
								id: "common",
								name: "Common",
								color: "#6B7280",
								multiplier: 1,
								icon: "⭐",
							},
							points: 50,
							requirements: [
								{
									type: "referrals",
									target: 1,
									operator: "greater_equal",
									description: "Make 1 referral",
								},
							],
							rewards: [
								{ type: "xp", value: 100, description: "100 XP bonus" },
							],
							max_progress: 1,
							is_active: true,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						},
					},
				],
				error: null,
			}),
			not: jest.fn().mockReturnThis(),
		})),
		auth: {
			getUser: jest
				.fn()
				.mockResolvedValue({ data: { id: "user-123" }, error: null }),
		},
	},
}));

// Mock LevelingManager for reward granting
jest.mock("@/lib/leveling", () => ({
	LevelingManager: {
		addXP: jest.fn().mockResolvedValue(true),
	},
}));

describe("AchievementManager", () => {
	const testUserId = "user-123";

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Achievement Categories and Rarities", () => {
		test("should have predefined categories", () => {
			expect(ACHIEVEMENT_CATEGORIES).toHaveLength(6);
			expect(ACHIEVEMENT_CATEGORIES.map((c) => c.id)).toContain("referral");
			expect(ACHIEVEMENT_CATEGORIES.map((c) => c.id)).toContain("leveling");
			expect(ACHIEVEMENT_CATEGORIES.map((c) => c.id)).toContain("value");
		});

		test("should have predefined rarities", () => {
			expect(ACHIEVEMENT_RARITIES).toHaveLength(5);
			expect(ACHIEVEMENT_RARITIES.map((r) => r.id)).toContain("common");
			expect(ACHIEVEMENT_RARITIES.map((r) => r.id)).toContain("rare");
			expect(ACHIEVEMENT_RARITIES.map((r) => r.id)).toContain("epic");
			expect(ACHIEVEMENT_RARITIES.map((r) => r.id)).toContain("legendary");
			expect(ACHIEVEMENT_RARITIES.map((r) => r.id)).toContain("mythic");
		});

		test("rarities should have correct multipliers", () => {
			const multipliers = ACHIEVEMENT_RARITIES.map((r) => r.multiplier);
			expect(multipliers).toEqual([1, 1.5, 2, 3, 5]);
		});
	});

	describe("Default Achievements", () => {
		test("should have default achievements defined", () => {
			expect(DEFAULT_ACHIEVEMENTS).toHaveLength(10);
			expect(DEFAULT_ACHIEVEMENTS.map((a) => a.id)).toContain("first_referral");
			expect(DEFAULT_ACHIEVEMENTS.map((a) => a.id)).toContain(
				"referral_master",
			);
			expect(DEFAULT_ACHIEVEMENTS.map((a) => a.id)).toContain("level_25");
		});

		test("achievements should have required properties", () => {
			const achievement = DEFAULT_ACHIEVEMENTS[0];
			expect(achievement).toHaveProperty("id");
			expect(achievement).toHaveProperty("name");
			expect(achievement).toHaveProperty("description");
			expect(achievement).toHaveProperty("icon");
			expect(achievement).toHaveProperty("category");
			expect(achievement).toHaveProperty("rarity");
			expect(achievement).toHaveProperty("points");
			expect(achievement).toHaveProperty("requirements");
			expect(achievement).toHaveProperty("rewards");
			expect(achievement).toHaveProperty("isActive");
		});

		test("achievements should have valid requirements", () => {
			DEFAULT_ACHIEVEMENTS.forEach((achievement) => {
				expect(achievement.requirements).toHaveLengthGreaterThan(0);
				achievement.requirements.forEach((req) => {
					expect(req).toHaveProperty("type");
					expect(req).toHaveProperty("target");
					expect(req).toHaveProperty("operator");
					expect(req).toHaveProperty("description");
					expect([
						"equals",
						"greater_than",
						"less_than",
						"greater_equal",
						"less_equal",
					]).toContain(req.operator);
				});
			});
		});
	});

	describe("Achievement Operations", () => {
		test("should get all achievements", async () => {
			const achievements = await achievementManager.getAllAchievements();
			expect(achievements).toBeInstanceOf(Array);
			expect(achievements.length).toBeGreaterThan(0);
		});

		test("should get user achievements", async () => {
			const userAchievements =
				await achievementManager.getUserAchievements(testUserId);
			expect(userAchievements).toBeInstanceOf(Array);
		});

		test("should get achievement progress", async () => {
			const progress =
				await achievementManager.getAchievementProgress(testUserId);
			expect(progress).toBeInstanceOf(Array);

			if (progress.length > 0) {
				const item = progress[0];
				expect(item).toHaveProperty("achievementId");
				expect(item).toHaveProperty("current");
				expect(item).toHaveProperty("max");
				expect(item).toHaveProperty("percentage");
				expect(item).toHaveProperty("isUnlocked");
			}
		});

		test("should get achievement stats", async () => {
			const stats = await achievementManager.getAchievementStats(testUserId);
			expect(stats).toHaveProperty("totalAchievements");
			expect(stats).toHaveProperty("unlockedAchievements");
			expect(stats).toHaveProperty("totalPoints");
			expect(stats).toHaveProperty("byCategory");
			expect(stats).toHaveProperty("byRarity");
		});

		test("should get recent achievements", async () => {
			const recent = await achievementManager.getRecentAchievements(
				testUserId,
				5,
			);
			expect(recent).toBeInstanceOf(Array);
			expect(recent.length).toBeLessThanOrEqual(5);
		});
	});

	describe("Progress Updates", () => {
		test("should update progress for referral event", async () => {
			await expect(
				achievementManager.updateProgress(testUserId, "referral", 1),
			).resolves.not.toThrow();
		});

		test("should update progress for level up event", async () => {
			await expect(
				achievementManager.updateProgress(testUserId, "level_up", 5),
			).resolves.not.toThrow();
		});

		test("should update progress for XP gained event", async () => {
			await expect(
				achievementManager.updateProgress(testUserId, "xp_gained", 100),
			).resolves.not.toThrow();
		});

		test("should update progress for value generated event", async () => {
			await expect(
				achievementManager.updateProgress(testUserId, "value_generated", 1000),
			).resolves.not.toThrow();
		});

		test("should update progress for streak updated event", async () => {
			await expect(
				achievementManager.updateProgress(testUserId, "streak_updated", 7),
			).resolves.not.toThrow();
		});

		test("should handle invalid event type", async () => {
			await expect(
				achievementManager.updateProgress(
					testUserId,
					"invalid_event" as any,
					1,
				),
			).rejects.toThrow();
		});
	});

	describe("Requirement Checking", () => {
		test("should check equality requirement", () => {
			const manager = achievementManager as any;
			const requirement = {
				type: "level",
				target: 5,
				operator: "equals" as const,
			};

			expect(manager.checkRequirement(5, requirement)).toBe(true);
			expect(manager.checkRequirement(4, requirement)).toBe(false);
			expect(manager.checkRequirement(6, requirement)).toBe(false);
		});

		test("should check greater than requirement", () => {
			const manager = achievementManager as any;
			const requirement = {
				type: "level",
				target: 5,
				operator: "greater_than" as const,
			};

			expect(manager.checkRequirement(6, requirement)).toBe(true);
			expect(manager.checkRequirement(5, requirement)).toBe(false);
			expect(manager.checkRequirement(4, requirement)).toBe(false);
		});

		test("should check less than requirement", () => {
			const manager = achievementManager as any;
			const requirement = {
				type: "level",
				target: 5,
				operator: "less_than" as const,
			};

			expect(manager.checkRequirement(4, requirement)).toBe(true);
			expect(manager.checkRequirement(5, requirement)).toBe(false);
			expect(manager.checkRequirement(6, requirement)).toBe(false);
		});

		test("should check greater than or equal requirement", () => {
			const manager = achievementManager as any;
			const requirement = {
				type: "level",
				target: 5,
				operator: "greater_equal" as const,
			};

			expect(manager.checkRequirement(6, requirement)).toBe(true);
			expect(manager.checkRequirement(5, requirement)).toBe(true);
			expect(manager.checkRequirement(4, requirement)).toBe(false);
		});

		test("should check less than or equal requirement", () => {
			const manager = achievementManager as any;
			const requirement = {
				type: "level",
				target: 5,
				operator: "less_equal" as const,
			};

			expect(manager.checkRequirement(4, requirement)).toBe(true);
			expect(manager.checkRequirement(5, requirement)).toBe(true);
			expect(manager.checkRequirement(6, requirement)).toBe(false);
		});
	});

	describe("Achievement Progression Logic", () => {
		test("should correctly calculate progress percentage", async () => {
			const progress =
				await achievementManager.getAchievementProgress(testUserId);

			const progressItem = progress.find(
				(p) => p.achievementId === "first_referral",
			);
			if (progressItem) {
				expect(progressItem.percentage).toBeGreaterThanOrEqual(0);
				expect(progressItem.percentage).toBeLessThanOrEqual(100);
			}
		});

		test("should identify unlocked achievements", async () => {
			const progress =
				await achievementManager.getAchievementProgress(testUserId);

			const unlockedItems = progress.filter((p) => p.isUnlocked);
			unlockedItems.forEach((item) => {
				expect(item.unlockedAt).toBeDefined();
				expect(item.percentage).toBe(100);
			});
		});

		test("should calculate next milestone for locked achievements", async () => {
			const progress =
				await achievementManager.getAchievementProgress(testUserId);

			const lockedItems = progress.filter((p) => !p.isUnlocked);
			lockedItems.forEach((item) => {
				if (item.nextMilestone) {
					expect(item.nextMilestone).toBeGreaterThan(item.current);
				}
			});
		});
	});

	describe("Achievement Categories and Stats", () => {
		test("should provide stats by category", async () => {
			const stats = await achievementManager.getAchievementStats(testUserId);

			expect(Object.keys(stats.byCategory)).toContain("referral");
			expect(Object.keys(stats.byCategory)).toContain("leveling");
			expect(Object.keys(stats.byCategory)).toContain("value");

			Object.values(stats.byCategory).forEach((categoryStats) => {
				expect(categoryStats).toHaveProperty("total");
				expect(categoryStats).toHaveProperty("unlocked");
				expect(categoryStats.total).toBeGreaterThanOrEqual(0);
				expect(categoryStats.unlocked).toBeGreaterThanOrEqual(0);
				expect(categoryStats.unlocked).toBeLessThanOrEqual(categoryStats.total);
			});
		});

		test("should provide stats by rarity", async () => {
			const stats = await achievementManager.getAchievementStats(testUserId);

			expect(Object.keys(stats.byRarity)).toContain("common");
			expect(Object.keys(stats.byRarity)).toContain("rare");
			expect(Object.keys(stats.byRarity)).toContain("epic");
			expect(Object.keys(stats.byRarity)).toContain("legendary");
			expect(Object.keys(stats.byRarity)).toContain("mythic");

			Object.values(stats.byRarity).forEach((rarityStats) => {
				expect(rarityStats).toHaveProperty("total");
				expect(rarityStats).toHaveProperty("unlocked");
				expect(rarityStats.total).toBeGreaterThanOrEqual(0);
				expect(rarityStats.unlocked).toBeGreaterThanOrEqual(0);
				expect(rarityStats.unlocked).toBeLessThanOrEqual(rarityStats.total);
			});
		});

		test("should calculate total points correctly", async () => {
			const stats = await achievementManager.getAchievementStats(testUserId);

			expect(stats.totalPoints).toBeGreaterThanOrEqual(0);
			expect(stats.totalPoints).toBeLessThanOrEqual(
				DEFAULT_ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0),
			);
		});
	});

	describe("Error Handling", () => {
		test("should handle database errors gracefully", async () => {
			const { supabase } = require("@/lib/supabase");
			supabase.from.mockImplementation(() => ({
				select: jest.fn().mockRejectedValue(new Error("Database error")),
			}));

			await expect(
				achievementManager.getAllAchievements(),
			).resolves.not.toThrow();
		});

		test("should handle missing user achievements", async () => {
			const { supabase } = require("@/lib/supabase");
			supabase.from.mockImplementation(() => ({
				select: jest.fn().mockResolvedValue({ data: [], error: null }),
			}));

			const progress =
				await achievementManager.getAchievementProgress("nonexistent-user");
			expect(progress).toBeInstanceOf(Array);
		});

		test("should handle invalid user IDs", async () => {
			await expect(
				achievementManager.getUserAchievements(""),
			).resolves.not.toThrow();
		});
	});

	describe("Performance", () => {
		test("should handle concurrent progress updates", async () => {
			const updatePromises = [];
			const concurrentUpdates = 10;

			for (let i = 0; i < concurrentUpdates; i++) {
				updatePromises.push(
					achievementManager.updateProgress(testUserId, "referral", i + 1),
				);
			}

			await expect(Promise.all(updatePromises)).resolves.not.toThrow();
		});

		test("should handle large numbers of achievements", async () => {
			const progress =
				await achievementManager.getAchievementProgress(testUserId);
			expect(progress.length).toBe(DEFAULT_ACHIEVEMENTS.length);
		});
	});

	describe("Integration with Other Systems", () => {
		test("should integrate with leveling system for XP rewards", async () => {
			const { LevelingManager } = require("@/lib/leveling");

			await achievementManager.updateProgress(testUserId, "referral", 1);

			expect(LevelingManager.addXP).toHaveBeenCalled();
		});

		test("should grant titles and badges for achievements", async () => {
			const { supabase } = require("@/lib/supabase");

			// Mock an achievement with title and badge rewards
			const achievementWithRewards = {
				id: "test_achievement",
				name: "Test Achievement",
				description: "Test description",
				icon: "🏆",
				category: ACHIEVEMENT_CATEGORIES[0],
				rarity: ACHIEVEMENT_RARITIES[0],
				points: 100,
				requirements: [
					{
						type: "referrals",
						target: 1,
						operator: "greater_equal",
						description: "Make 1 referral",
					},
				],
				rewards: [
					{ type: "title", value: "Test Title", description: "Test title" },
					{ type: "badge", value: "test_badge", description: "Test badge" },
				],
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const manager = achievementManager as any;
			await manager.grantRewards(testUserId, achievementWithRewards);

			expect(supabase.from).toHaveBeenCalledWith("user_titles");
			expect(supabase.from).toHaveBeenCalledWith("user_badges");
		});
	});
});

import { QuestGenerator } from "@/lib/quest-system/quest-generator";
import type {
	QuestDifficulty,
	QuestTemplate,
	QuestType,
} from "@/lib/types/quest-types";

// Mock the SecurityValidator
jest.mock("@/lib/security/validation", () => ({
	SecurityValidator: {
		validateUserId: jest.fn(),
		validateCompanyId: jest.fn(),
	},
}));

// Mock the supabase client
jest.mock("@/lib/supabase-client", () => ({
	supabase: {
		from: jest.fn(),
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		eq: jest.fn(),
		single: jest.fn(),
	},
	supabaseService: {
		from: jest.fn(),
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		eq: jest.fn(),
		single: jest.fn(),
	},
}));

describe("QuestGenerator - Quest Generation Logic", () => {
	const mockUserId = "test-user-id";
	const mockCompanyId = "test-company-id";
	const mockSecurityValidator =
		require("@/lib/security/validation").SecurityValidator;

	// Mock supabaseService for testing
	const mockSupabaseService = require("@/lib/supabase-client").supabaseService;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup default validation responses
		mockSecurityValidator.validateUserId.mockReturnValue({
			isValid: true,
			errors: [],
		});

		mockSecurityValidator.validateCompanyId.mockReturnValue({
			isValid: true,
			errors: [],
		});

		// Setup supabaseService mocks
		const mockInsert = jest.fn().mockResolvedValue({ error: null });
		mockSupabaseService.from.mockReturnValue({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data: null, error: null }),
			insert: mockInsert,
		});
	});

	describe("Template-based Quest Generation", () => {
		const mockTemplates: QuestTemplate[] = [
			{
				id: "template-1",
				template_name: "Daily Referral Challenge",
				quest_type: "daily",
				difficulty: "easy" as QuestDifficulty,
				base_reward_xp: 100,
				requirements_template: {
					target_type: "referrals",
					base_target_value: 3,
					scaling_factor: 0.2,
				},
				is_active: true,
			},
			{
				id: "template-2",
				template_name: "Weekly Network Builder",
				quest_type: "weekly",
				difficulty: "medium" as QuestDifficulty,
				base_reward_xp: 250,
				requirements_template: {
					target_type: "referrals",
					base_target_value: 10,
					scaling_factor: 0.3,
				},
				is_active: true,
			},
			{
				id: "template-3",
				template_name: "Monthly Champion Challenge",
				quest_type: "monthly",
				difficulty: "hard" as QuestDifficulty,
				base_reward_xp: 500,
				requirements_template: {
					target_type: "referrals",
					base_target_value: 25,
					scaling_factor: 0.5,
				},
				is_active: true,
			},
		];

		it("should generate quests with appropriate difficulty scaling based on user level", async () => {
			const config = {
				company_id: mockCompanyId,
				user_id: mockUserId,
				user_level: 5,
				character_class: "scout",
				quest_type: "daily" as QuestType,
			};

			const quests = await QuestGenerator.generateQuestsForUser(config);

			expect(quests).toHaveLength(3);

			// Check that target values scale with user level
			const referralQuest = quests.find((q) => q.target_type === "referrals");
			expect(referralQuest?.target_value).toBeGreaterThan(3); // Base value is 3
			expect(referralQuest?.target_value).toBeLessThanOrEqual(6); // Level 5 scaling
		});

		it("should apply character class multipliers to rewards", () => {
			const config = {
				company_id: mockCompanyId,
				user_id: mockUserId,
				user_level: 5,
				character_class: "sage", // 1.2x commission multiplier
				quest_type: "weekly" as QuestType,
			};

			const quests = QuestGenerator.generateQuestsFromTemplates(
				config,
				mockTemplates,
			);

			const sageQuest = quests.find((q) => q.difficulty === "medium");
			expect(sageQuest?.reward_commission).toBeGreaterThan(1.0); // Should have commission boost
		});

		it("should filter inactive templates", () => {
			const inactiveTemplate = {
				...mockTemplates[0],
				is_active: false,
			};

			const quests = QuestGenerator.generateQuestsFromTemplates(
				{ ...mockTemplates[0], quest_type: "daily" as QuestType },
				[inactiveTemplate],
			);

			expect(quests).toHaveLength(0);
		});

		it("should filter templates by quest type", () => {
			const config = {
				company_id: mockCompanyId,
				user_id: mockUserId,
				user_level: 5,
				character_class: "scout",
				quest_type: "daily" as QuestType,
			};

			const quests = QuestGenerator.generateQuestsFromTemplates(
				config,
				mockTemplates,
			);

			quests.forEach((quest) => {
				expect(quest.quest_type).toBe("daily");
			});
		});

		it("should respect difficulty preferences", () => {
			const config = {
				company_id: mockCompanyId,
				user_id: mockUserId,
				user_level: 10,
				character_class: "champion",
				quest_type: "weekly" as QuestType,
				difficulty_preferences: ["hard", "epic"] as QuestDifficulty[],
			};

			const quests = QuestGenerator.generateQuestsFromTemplates(
				config,
				mockTemplates,
			);

			quests.forEach((quest) => {
				expect(["hard", "epic"].includes(quest.difficulty)).toBe(true);
			});
		});
	});

	describe("Dynamic Quest Generation", () => {
		it("should generate quests based on user progression", () => {
			const userStats = {
				level: 8,
				total_referrals: 15,
				total_commission: 75.5,
				character_class: "champion",
			};

			const quests = QuestGenerator.generateDynamicQuests(
				userStats,
				mockCompanyId,
			);

			expect(quests).toHaveLength(3);

			// Should generate harder quests for higher level users
			const hasHardQuest = quests.some(
				(q) => q.difficulty === "hard" || q.difficulty === "epic",
			);
			expect(hasHardQuest).toBe(true);
		});

		it("should balance quest rewards based on difficulty", () => {
			const easyQuest = QuestGenerator.createBalancedQuest(
				"easy",
				mockCompanyId,
			);
			const mediumQuest = QuestGenerator.createBalancedQuest(
				"medium",
				mockCompanyId,
			);
			const hardQuest = QuestGenerator.createBalancedQuest(
				"hard",
				mockCompanyId,
			);

			expect(easyQuest.reward_xp).toBeLessThan(mediumQuest.reward_xp);
			expect(mediumQuest.reward_xp).toBeLessThan(hardQuest.reward_xp);

			expect(easyQuest.reward_commission).toBeLessThan(
				mediumQuest.reward_commission,
			);
			expect(mediumQuest.reward_commission).toBeLessThan(
				hardQuest.reward_commission,
			);
		});

		it("should generate varied quest types", () => {
			const userStats = {
				level: 5,
				total_referrals: 10,
				total_commission: 50.0,
				character_class: "scout",
			};

			const quests = QuestGenerator.generateDynamicQuests(
				userStats,
				mockCompanyId,
			);

			const questTypes = [...new Set(quests.map((q) => q.target_type))];
			expect(questTypes.length).toBeGreaterThan(1);
		});
	});

	describe("Quest Validation", () => {
		it("should validate quest parameters", () => {
			const invalidConfig = {
				company_id: "",
				user_id: mockUserId,
				user_level: -1,
				character_class: "invalid_class",
				quest_type: "daily" as QuestType,
			};

			mockSecurityValidator.validateCompanyId.mockReturnValue({
				isValid: false,
				errors: ["Invalid company ID"],
			});

			expect(() => {
				QuestGenerator.generateQuestsFromTemplates(invalidConfig, []);
			}).toThrow("Invalid company ID");
		});

		it("should validate quest template structure", () => {
			const invalidTemplate = {
				id: "invalid-template",
				template_name: "Invalid Template",
				quest_type: "invalid_type" as QuestType,
				difficulty: "invalid_difficulty" as QuestDifficulty,
				base_reward_xp: -100,
				requirements_template: {
					target_type: "",
					base_target_value: -1,
					scaling_factor: -0.1,
				},
				is_active: true,
			};

			const config = {
				company_id: mockCompanyId,
				user_id: mockUserId,
				user_level: 5,
				character_class: "scout",
				quest_type: "daily" as QuestType,
			};

			expect(() => {
				QuestGenerator.generateQuestsFromTemplates(config, [invalidTemplate]);
			}).toThrow();
		});
	});

	describe("Quest Scaling Logic", () => {
		it("should scale target values appropriately with user level", () => {
			const level1Quest = QuestGenerator.scaleQuestToLevel(
				{
					base_target_value: 5,
					scaling_factor: 0.2,
				},
				1,
			);

			const level10Quest = QuestGenerator.scaleQuestToLevel(
				{
					base_target_value: 5,
					scaling_factor: 0.2,
				},
				10,
			);

			const level20Quest = QuestGenerator.scaleQuestToLevel(
				{
					base_target_value: 5,
					scaling_factor: 0.2,
				},
				20,
			);

			expect(level10Quest).toBeGreaterThan(level1Quest);
			expect(level20Quest).toBeGreaterThan(level10Quest);
		});

		it("should apply character class multipliers correctly", () => {
			const baseReward = { xp: 100, commission: 10.0 };

			const scoutReward = QuestGenerator.applyCharacterClassMultiplier(
				baseReward,
				"scout",
			);
			const sageReward = QuestGenerator.applyCharacterClassMultiplier(
				baseReward,
				"sage",
			);
			const championReward = QuestGenerator.applyCharacterClassMultiplier(
				baseReward,
				"champion",
			);

			// Scout: 1.1x XP, 1.1x commission
			expect(scoutReward.xp).toBe(110);
			expect(scoutReward.commission).toBe(11.0);

			// Sage: 1.0x XP, 1.2x commission
			expect(sageReward.xp).toBe(100);
			expect(sageReward.commission).toBe(12.0);

			// Champion: 1.15x XP, 1.1x commission
			expect(championReward.xp).toBe(115);
			expect(championReward.commission).toBe(11.0);
		});
	});

	describe("Quest Diversity", () => {
		it("should generate diverse quest objectives", () => {
			const config = {
				company_id: mockCompanyId,
				user_id: mockUserId,
				user_level: 5,
				character_class: "scout",
				quest_type: "daily" as QuestType,
			};

			const quest1 = QuestGenerator.createBalancedQuest("easy", mockCompanyId);
			const quest2 = QuestGenerator.createBalancedQuest(
				"medium",
				mockCompanyId,
			);
			const quest3 = QuestGenerator.createBalancedQuest("hard", mockCompanyId);

			const objectives = [quest1, quest2, quest3].map((q) => q.target_type);
			const uniqueObjectives = [...new Set(objectives)];

			expect(uniqueObjectives.length).toBeGreaterThan(1);
		});

		it("should ensure quests have meaningful time limits", () => {
			const dailyQuest = QuestGenerator.createBalancedQuest(
				"easy",
				mockCompanyId,
				"daily",
			);
			const weeklyQuest = QuestGenerator.createBalancedQuest(
				"medium",
				mockCompanyId,
				"weekly",
			);
			const monthlyQuest = QuestGenerator.createBalancedQuest(
				"hard",
				mockCompanyId,
				"monthly",
			);

			const dailyEnd = new Date(dailyQuest.end_date);
			const weeklyEnd = new Date(weeklyQuest.end_date);
			const monthlyEnd = new Date(monthlyQuest.end_date);
			const now = new Date();

			const dailyHours =
				(dailyEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
			const weeklyHours =
				(weeklyEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
			const monthlyHours =
				(monthlyEnd.getTime() - now.getTime()) / (1000 * 60 * 60);

			expect(dailyHours).toBeLessThan(48); // Should be less than 2 days
			expect(weeklyHours).toBeGreaterThan(120); // Should be more than 5 days
			expect(monthlyHours).toBeGreaterThan(600); // Should be more than 25 days
		});
	});

	describe("Edge Cases", () => {
		const mockTemplates: QuestTemplate[] = [
			{
				id: "template-1",
				template_name: "Daily Referral Challenge",
				quest_type: "daily",
				difficulty: "easy" as QuestDifficulty,
				base_reward_xp: 100,
				requirements_template: {
					target_type: "referrals",
					base_target_value: 3,
					scaling_factor: 0.2,
				},
				is_active: true,
			},
			{
				id: "template-2",
				template_name: "Weekly Network Builder",
				quest_type: "weekly",
				difficulty: "medium" as QuestDifficulty,
				base_reward_xp: 250,
				requirements_template: {
					target_type: "referrals",
					base_target_value: 10,
					scaling_factor: 0.3,
				},
				is_active: true,
			},
			{
				id: "template-3",
				template_name: "Monthly Champion Challenge",
				quest_type: "monthly",
				difficulty: "hard" as QuestDifficulty,
				base_reward_xp: 500,
				requirements_template: {
					target_type: "referrals",
					base_target_value: 25,
					scaling_factor: 0.5,
				},
				is_active: true,
			},
		];

		it("should handle empty template array", () => {
			const config = {
				company_id: mockCompanyId,
				user_id: mockUserId,
				user_level: 5,
				character_class: "scout",
				quest_type: "daily" as QuestType,
			};

			const quests = QuestGenerator.generateQuestsFromTemplates(config, []);

			expect(quests).toHaveLength(0);
		});

		it("should handle user level 0", () => {
			const config = {
				company_id: mockCompanyId,
				user_id: mockUserId,
				user_level: 0,
				character_class: "scout",
				quest_type: "daily" as QuestType,
			};

			const quests = QuestGenerator.generateQuestsFromTemplates(
				config,
				mockTemplates,
			);

			expect(quests).toHaveLength(3);
			// Should not throw errors for level 0
		});

		it("should handle very high user levels", () => {
			const config = {
				company_id: mockCompanyId,
				user_id: mockUserId,
				user_level: 100,
				character_class: "champion",
				quest_type: "monthly" as QuestType,
			};

			const quests = QuestGenerator.generateQuestsFromTemplates(
				config,
				mockTemplates,
			);

			expect(quests).toHaveLength(3);
			// Should not generate unreasonably high target values
			quests.forEach((quest) => {
				expect(quest.target_value).toBeLessThan(1000);
			});
		});
	});
});

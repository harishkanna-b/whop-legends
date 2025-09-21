import { QuestEngine } from "@/lib/quest-system/quest-engine";
import { SecurityValidator, ValidationError } from "@/lib/security/validation";
import { supabaseService } from "@/lib/supabase-client";

// Mock the Supabase client
jest.mock("@/lib/supabase-client", () => {
	const createMockQueryBuilder = () => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		single: jest.fn().mockReturnThis(),
		update: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		delete: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
	});

	const mockFrom = jest.fn(() => createMockQueryBuilder());
	const mockChannel = jest.fn();

	return {
		supabase: {
			from: mockFrom,
			channel: mockChannel,
			raw: jest.fn((value) => value),
		},
		supabaseService: {
			from: mockFrom,
			channel: mockChannel,
			raw: jest.fn((value) => value),
		},
	};
});

// Mock ValidationError and SecurityValidator
jest.mock("@/lib/security/validation", () => {
	const mockValidationError = jest.fn().mockImplementation((message, field) => {
		const error = new Error(message);
		error.name = "ValidationError";
		error.field = field;
		return error;
	});

	return {
		SecurityValidator: {
			validateUserId: jest.fn(),
			validateCompanyId: jest.fn(),
		},
		ValidationError: mockValidationError,
	};
});

describe("QuestEngine - Core Functionality", () => {
	const mockUserId = "test-user-id";
	const mockCompanyId = "test-company-id";
	const mockQuestConfig = {
		company_id: mockCompanyId,
		user_id: mockUserId,
		user_level: 5,
		character_class: "scout",
		quest_type: "daily" as const,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup default validation responses
		(SecurityValidator.validateUserId as jest.Mock).mockReturnValue({
			isValid: true,
			errors: [],
		});

		(SecurityValidator.validateCompanyId as jest.Mock).mockReturnValue({
			isValid: true,
			errors: [],
		});
	});

	describe("Quest Generation", () => {
		it("should generate daily quests with appropriate difficulty scaling", async () => {
			// Mock database responses
			const mockTemplateResponse = {
				data: {
					quest_templates: [
						{
							id: "template-1",
							template_name: "Daily Referral Challenge",
							quest_type: "daily",
							difficulty: "easy",
							base_reward_xp: 100,
							requirements_template: {
								target_type: "referrals",
								base_target_value: 3,
								scaling_factor: 0.2,
							},
							is_active: true,
						},
					],
				},
				error: null,
			};

			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue(mockTemplateResponse),
					}),
				}),
			});

			// Mock quest insertion
			(supabaseService.from as jest.Mock).mockReturnValue({
				insert: jest.fn().mockResolvedValue({ error: null }),
			});

			const quests = await QuestEngine.generateDailyQuests(mockQuestConfig);

			expect(quests).toHaveLength(3);
			expect(quests[0]).toEqual(
				expect.objectContaining({
					company_id: mockCompanyId,
					quest_type: "daily",
					difficulty: "easy",
				}),
			);
		});

		it("should generate weekly quests with higher rewards and complexity", async () => {
			const weeklyConfig = {
				...mockQuestConfig,
				quest_type: "weekly" as const,
			};

			const mockTemplateResponse = {
				data: {
					quest_templates: [
						{
							id: "template-2",
							template_name: "Weekly Network Builder",
							quest_type: "weekly",
							difficulty: "medium",
							base_reward_xp: 250,
							requirements_template: {
								target_type: "referrals",
								base_target_value: 10,
								scaling_factor: 0.3,
							},
							is_active: true,
						},
					],
				},
				error: null,
			};

			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue(mockTemplateResponse),
					}),
				}),
			});

			(supabaseService.from as jest.Mock).mockReturnValue({
				insert: jest.fn().mockResolvedValue({ error: null }),
			});

			const quests = await QuestEngine.generateWeeklyQuests(weeklyConfig);

			expect(quests).toHaveLength(2);
			expect(quests[0].difficulty).toBe("medium");
		});

		it("should generate monthly quests with prestige rewards", async () => {
			const monthlyConfig = {
				...mockQuestConfig,
				quest_type: "monthly" as const,
			};

			const mockTemplateResponse = {
				data: {
					quest_templates: [
						{
							id: "template-3",
							template_name: "Monthly Champion Challenge",
							quest_type: "monthly",
							difficulty: "hard",
							base_reward_xp: 500,
							requirements_template: {
								target_type: "referrals",
								base_target_value: 25,
								scaling_factor: 0.5,
							},
							is_active: true,
						},
					],
				},
				error: null,
			};

			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue(mockTemplateResponse),
					}),
				}),
			});

			(supabaseService.from as jest.Mock).mockReturnValue({
				insert: jest.fn().mockResolvedValue({ error: null }),
			});

			const quests = await QuestEngine.generateMonthlyQuests(monthlyConfig);

			expect(quests).toHaveLength(1);
			expect(quests[0].difficulty).toBe("hard");
		});

		it("should fallback to default quests when templates are not available", async () => {
			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest
							.fn()
							.mockResolvedValue({ data: null, error: "No templates found" }),
					}),
				}),
			});

			const quests = await QuestEngine.generateDailyQuests(mockQuestConfig);

			expect(quests).toHaveLength(3);
			expect(quests[0].title).toBe("First Steps");
		});

		it("should validate user ID before generating quests", async () => {
			(SecurityValidator.validateUserId as jest.Mock).mockReturnValue({
				isValid: false,
				errors: ["Invalid user ID format"],
			});

			await expect(
				QuestEngine.generateDailyQuests(mockQuestConfig),
			).rejects.toThrow("Invalid user ID");
		});

		it("should validate company ID before generating quests", async () => {
			(SecurityValidator.validateCompanyId as jest.Mock).mockReturnValue({
				isValid: false,
				errors: ["Invalid company ID format"],
			});

			await expect(
				QuestEngine.generateDailyQuests(mockQuestConfig),
			).rejects.toThrow("Invalid company ID");
		});
	});

	describe("User Quest Management", () => {
		it("should retrieve user active quests", async () => {
			const mockUserQuests = [
				{
					id: "user-quest-1",
					user_id: mockUserId,
					quest_id: "quest-1",
					progress_value: 3,
					is_completed: false,
					quest: {
						id: "quest-1",
						title: "Test Quest",
						target_type: "referrals",
						target_value: 10,
						reward_xp: 100,
						reward_commission: 10.0,
					},
				},
			];

			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						eq: jest.fn().mockReturnValue({
							order: jest
								.fn()
								.mockResolvedValue({ data: mockUserQuests, error: null }),
						}),
					}),
				}),
			});

			const quests = await QuestEngine.getUserActiveQuests(mockUserId);

			expect(quests).toHaveLength(1);
			expect(quests[0].quest.title).toBe("Test Quest");
		});

		it("should calculate quest progress correctly", async () => {
			const mockUserQuests = [
				{
					id: "user-quest-1",
					user_id: mockUserId,
					quest_id: "quest-1",
					progress_value: 3,
					is_completed: false,
					quest: {
						id: "quest-1",
						title: "Test Quest",
						target_type: "referrals",
						target_value: 10,
						reward_xp: 100,
						reward_commission: 10.0,
						end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
					},
				},
			];

			const mockUserStats = {
				total_referrals: 3,
				total_commission: 50,
				level: 5,
				total_achievements: 2,
			};

			// Mock the quest retrieval
			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						eq: jest.fn().mockReturnValue({
							order: jest
								.fn()
								.mockResolvedValue({ data: mockUserQuests, error: null }),
						}),
					}),
				}),
			});

			// Mock user stats retrieval
			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest
							.fn()
							.mockResolvedValue({ data: mockUserStats, error: null }),
					}),
				}),
			});

			const progress = await QuestEngine.getUserQuestProgress(mockUserId);

			expect(progress).toHaveLength(1);
			expect(progress[0]).toEqual(
				expect.objectContaining({
					current_value: 3,
					target_value: 10,
					percentage: 30,
					is_completed: false,
				}),
			);
		});

		it("should handle errors when fetching user quests", async () => {
			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						eq: jest.fn().mockReturnValue({
							order: jest
								.fn()
								.mockResolvedValue({ data: null, error: "Database error" }),
						}),
					}),
				}),
			});

			const quests = await QuestEngine.getUserActiveQuests(mockUserId);

			expect(quests).toHaveLength(0);
		});
	});

	describe("Quest Progress Updates", () => {
		it("should update quest progress based on user actions", async () => {
			const mockUserQuests = [
				{
					id: "user-quest-1",
					user_id: mockUserId,
					quest_id: "quest-1",
					progress_value: 3,
					is_completed: false,
					reward_claimed: false,
					quest: {
						id: "quest-1",
						title: "Referral Quest",
						target_type: "referrals",
						target_value: 10,
						reward_xp: 100,
						reward_commission: 10.0,
					},
				},
			];

			const mockUserStats = {
				total_referrals: 4,
				total_commission: 50,
				level: 5,
				total_achievements: 2,
			};

			// Mock quest retrieval
			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						eq: jest.fn().mockReturnValue({
							order: jest
								.fn()
								.mockResolvedValue({ data: mockUserQuests, error: null }),
						}),
					}),
				}),
			});

			// Mock user stats retrieval
			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest
							.fn()
							.mockResolvedValue({ data: mockUserStats, error: null }),
					}),
				}),
			});

			// Mock quest progress update
			(supabaseService.from as jest.Mock).mockReturnValue({
				update: jest.fn().mockReturnValue({
					eq: jest.fn().mockResolvedValue({ error: null }),
				}),
			});

			// Mock reward distribution
			(supabaseService.from as jest.Mock).mockReturnValue({
				update: jest.fn().mockReturnValue({
					eq: jest.fn().mockResolvedValue({ error: null }),
				}),
			});

			await QuestEngine.updateQuestProgress(mockUserId, "referral", 1);

			// Verify that the update was called
			expect(supabaseService.from).toHaveBeenCalledWith("user_quests");
		});

		it("should validate user ID before updating progress", async () => {
			(SecurityValidator.validateUserId as jest.Mock).mockReturnValue({
				isValid: false,
				errors: ["Invalid user ID format"],
			});

			await expect(
				QuestEngine.updateQuestProgress(mockUserId, "referral", 1),
			).rejects.toThrow("Invalid user ID");
		});

		it("should validate action type before updating progress", async () => {
			await expect(
				QuestEngine.updateQuestProgress(mockUserId, "invalid_action" as any, 1),
			).rejects.toThrow("Invalid action type");
		});

		it("should validate progress value before updating", async () => {
			await expect(
				QuestEngine.updateQuestProgress(mockUserId, "referral", -1),
			).rejects.toThrow("Progress value must be between 0 and 1000");

			await expect(
				QuestEngine.updateQuestProgress(mockUserId, "referral", 1001),
			).rejects.toThrow("Progress value must be between 0 and 1000");
		});
	});

	describe("Quest Reward Distribution", () => {
		it("should claim quest rewards successfully", async () => {
			const mockUserQuest = {
				id: "user-quest-1",
				user_id: mockUserId,
				is_completed: true,
				reward_claimed: false,
				quest: {
					id: "quest-1",
					reward_xp: 100,
					reward_commission: 10.0,
				},
			};

			// Mock user quest retrieval
			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						eq: jest.fn().mockReturnValue({
							single: jest
								.fn()
								.mockResolvedValue({ data: mockUserQuest, error: null }),
						}),
					}),
				}),
			});

			// Mock user update
			(supabaseService.from as jest.Mock).mockReturnValue({
				update: jest.fn().mockReturnValue({
					eq: jest.fn().mockResolvedValue({ error: null }),
				}),
			});

			// Mock reward claim update
			(supabaseService.from as jest.Mock).mockReturnValue({
				update: jest.fn().mockReturnValue({
					eq: jest.fn().mockResolvedValue({ error: null }),
				}),
			});

			const reward = await QuestEngine.claimQuestRewards(
				mockUserId,
				"user-quest-1",
			);

			expect(reward).toEqual({
				xp: 100,
				commission: 10.0,
			});
		});

		it("should return null for incomplete quests", async () => {
			const mockUserQuest = {
				id: "user-quest-1",
				user_id: mockUserId,
				is_completed: false,
				reward_claimed: false,
				quest: {
					id: "quest-1",
					reward_xp: 100,
					reward_commission: 10.0,
				},
			};

			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						eq: jest.fn().mockReturnValue({
							single: jest
								.fn()
								.mockResolvedValue({ data: mockUserQuest, error: null }),
						}),
					}),
				}),
			});

			const reward = await QuestEngine.claimQuestRewards(
				mockUserId,
				"user-quest-1",
			);

			expect(reward).toBeNull();
		});

		it("should return null for already claimed rewards", async () => {
			const mockUserQuest = {
				id: "user-quest-1",
				user_id: mockUserId,
				is_completed: true,
				reward_claimed: true,
				quest: {
					id: "quest-1",
					reward_xp: 100,
					reward_commission: 10.0,
				},
			};

			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						eq: jest.fn().mockReturnValue({
							single: jest
								.fn()
								.mockResolvedValue({ data: mockUserQuest, error: null }),
						}),
					}),
				}),
			});

			const reward = await QuestEngine.claimQuestRewards(
				mockUserId,
				"user-quest-1",
			);

			expect(reward).toBeNull();
		});
	});

	describe("Quest Statistics", () => {
		it("should calculate user quest statistics", async () => {
			const mockUserQuests = [
				{
					id: "user-quest-1",
					user_id: mockUserId,
					is_completed: true,
					created_at: new Date(
						Date.now() - 2 * 24 * 60 * 60 * 1000,
					).toISOString(),
					completed_at: new Date(
						Date.now() - 1 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
				{
					id: "user-quest-2",
					user_id: mockUserId,
					is_completed: false,
					created_at: new Date(
						Date.now() - 1 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
			];

			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						eq: jest
							.fn()
							.mockResolvedValue({ data: mockUserQuests, error: null }),
					}),
				}),
			});

			const stats = await QuestEngine.getUserQuestStats(mockUserId);

			expect(stats).toEqual(
				expect.objectContaining({
					total_completed: 1,
					completion_rate: 50,
				}),
			);
		});

		it("should return default stats when no quests found", async () => {
			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						eq: jest
							.fn()
							.mockResolvedValue({ data: null, error: "No quests found" }),
					}),
				}),
			});

			const stats = await QuestEngine.getUserQuestStats(mockUserId);

			expect(stats).toEqual(
				expect.objectContaining({
					total_completed: 0,
					completion_rate: 0,
				}),
			);
		});
	});

	describe("Scheduled Quest Generation", () => {
		it("should generate daily quests at midnight UTC", async () => {
			// Mock current time to be midnight UTC
			const mockDate = new Date();
			mockDate.setUTCHours(0, 1, 0, 0); // 00:01 UTC
			jest.spyOn(global, "Date").mockImplementation(() => mockDate);

			const mockUsers = [
				{
					id: mockUserId,
					company_id: mockCompanyId,
					level: 5,
					character_class: "scout",
				},
			];

			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest
							.fn()
							.mockResolvedValue({ data: null, error: "No templates" }),
					}),
				}),
			});

			// Mock user retrieval
			(supabaseService.from as jest.Mock).mockReturnValue({
				select: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
			});

			// Mock quest cleanup
			(supabaseService.from as jest.Mock).mockReturnValue({
				update: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						lt: jest.fn().mockResolvedValue({ error: null }),
					}),
				}),
			});

			(supabaseService.from as jest.Mock).mockReturnValue({
				delete: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						lt: jest.fn().mockResolvedValue({ error: null }),
					}),
				}),
			});

			await QuestEngine.autoGenerateScheduledQuests();

			// Verify that user retrieval was called
			expect(supabaseService.from).toHaveBeenCalledWith("users");

			jest.restoreAllMocks();
		});

		it("should clean up expired quests", async () => {
			const mockDate = new Date();
			mockDate.setUTCHours(0, 1, 0, 0); // 00:01 UTC
			jest.spyOn(global, "Date").mockImplementation(() => mockDate);

			(supabaseService.from as jest.Mock).mockReturnValue({
				update: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						lt: jest.fn().mockResolvedValue({ error: null }),
					}),
				}),
			});

			(supabaseService.from as jest.Mock).mockReturnValue({
				delete: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						lt: jest.fn().mockResolvedValue({ error: null }),
					}),
				}),
			});

			await QuestEngine.autoGenerateScheduledQuests();

			// Verify that cleanup was called
			expect(supabaseService.from).toHaveBeenCalledWith("user_quests");

			jest.restoreAllMocks();
		});
	});
});

import { SecurityValidator, ValidationError } from "@/lib/security/validation";
import { supabase, supabaseService, type Database } from "@/lib/supabase-client";
import {
	QUEST_CONFIG,
	type Quest,
	type QuestDifficulty,
	QuestFilters,
	type QuestGenerationConfig,
	type QuestProgress,
	type QuestReward,
	type QuestStats,
	type QuestStatus,
	type QuestTemplate,
	QuestType,
	RequirementType,
	type UserQuest,
} from "@/lib/types/quest-types";

export class QuestEngine {
	/**
	 * Generate quests for a user based on their level and character class
	 */
	static async generateUserQuests(
		config: QuestGenerationConfig,
	): Promise<Quest[]> {
		return QuestEngine.generateQuestsForType(config);
	}

	/**
	 * Generate daily quests with appropriate difficulty scaling
	 */
	static async generateDailyQuests(
		config: QuestGenerationConfig,
	): Promise<Quest[]> {
		const dailyConfig = {
			...config,
			quest_type: "daily" as "daily" | "weekly" | "monthly",
		};
		return QuestEngine.generateQuestsForType(dailyConfig);
	}

	/**
	 * Generate weekly quests with higher rewards and complexity
	 */
	static async generateWeeklyQuests(
		config: QuestGenerationConfig,
	): Promise<Quest[]> {
		const weeklyConfig = {
			...config,
			quest_type: "weekly" as "daily" | "weekly" | "monthly",
			difficulty_preferences: ["medium", "hard"] as QuestDifficulty[],
		};
		return QuestEngine.generateQuestsForType(weeklyConfig);
	}

	/**
	 * Generate monthly quests with significant challenges and prestige rewards
	 */
	static async generateMonthlyQuests(
		config: QuestGenerationConfig,
	): Promise<Quest[]> {
		const monthlyConfig = {
			...config,
			quest_type: "monthly" as "daily" | "weekly" | "monthly",
			difficulty_preferences: ["hard", "epic"] as QuestDifficulty[],
		};
		return QuestEngine.generateQuestsForType(monthlyConfig);
	}

	/**
	 * Auto-generate quests for all users based on schedule
	 */
	static async autoGenerateScheduledQuests(): Promise<void> {
		try {
			const now = new Date();

			// Daily quest generation (at midnight UTC)
			if (now.getUTCHours() === 0 && now.getUTCMinutes() < 5) {
				await QuestEngine.generateDailyQuestsForAllUsers();
			}

			// Weekly quest generation (Monday at midnight UTC)
			if (
				now.getUTCDay() === 1 &&
				now.getUTCHours() === 0 &&
				now.getUTCMinutes() < 5
			) {
				await QuestEngine.generateWeeklyQuestsForAllUsers();
			}

			// Monthly quest generation (1st of month at midnight UTC)
			if (
				now.getUTCDate() === 1 &&
				now.getUTCHours() === 0 &&
				now.getUTCMinutes() < 5
			) {
				await QuestEngine.generateMonthlyQuestsForAllUsers();
			}

			// Clean up expired quests
			await QuestEngine.expireOverdueQuests();
		} catch (error) {
			console.error("Error in auto-generating scheduled quests:", error);
		}
	}

	/**
	 * Generate quests for all users (bulk operation)
	 */
	private static async generateDailyQuestsForAllUsers(): Promise<void> {
		try {
			const { data: users, error } = await supabaseService()
				.from("users")
				.select("id, company_id, level, character_class");

			if (error) throw error;

			for (const user of users || []) {
				const config: QuestGenerationConfig = {
					company_id: user.company_id,
					user_level: user.level || 1,
					character_class: user.character_class || "scout",
					quest_type: "daily",
				};

				try {
					await QuestEngine.generateDailyQuests(config);
				} catch (error) {
					console.error(
						`Error generating daily quests for user ${user.id}:`,
						error,
					);
				}
			}
		} catch (error) {
			console.error("Error in daily quest generation for all users:", error);
		}
	}

	/**
	 * Generate weekly quests for all users
	 */
	private static async generateWeeklyQuestsForAllUsers(): Promise<void> {
		try {
			const { data: users, error } = await supabaseService()
				.from("users")
				.select("id, company_id, level, character_class");

			if (error) throw error;

			for (const user of users || []) {
				const config: QuestGenerationConfig = {
					company_id: user.company_id,
					user_level: user.level || 1,
					character_class: user.character_class || "scout",
					quest_type: "weekly",
				};

				try {
					await QuestEngine.generateWeeklyQuests(config);
				} catch (error) {
					console.error(
						`Error generating weekly quests for user ${user.id}:`,
						error,
					);
				}
			}
		} catch (error) {
			console.error("Error in weekly quest generation for all users:", error);
		}
	}

	/**
	 * Generate monthly quests for all users
	 */
	private static async generateMonthlyQuestsForAllUsers(): Promise<void> {
		try {
			const { data: users, error } = await supabaseService()
				.from("users")
				.select("id, company_id, level, character_class");

			if (error) throw error;

			for (const user of users || []) {
				const config: QuestGenerationConfig = {
					company_id: user.company_id,
					user_level: user.level || 1,
					character_class: user.character_class || "scout",
					quest_type: "monthly",
				};

				try {
					await QuestEngine.generateMonthlyQuests(config);
				} catch (error) {
					console.error(
						`Error generating monthly quests for user ${user.id}:`,
						error,
					);
				}
			}
		} catch (error) {
			console.error("Error in monthly quest generation for all users:", error);
		}
	}

	/**
	 * Expire overdue quests and cleanup expired data
	 */
	private static async expireOverdueQuests(): Promise<void> {
		try {
			const now = new Date().toISOString();

			// Mark expired quests
			const { error: expireError } = await supabaseService()
				.from("user_quests")
				.update({
					status: "expired" as QuestStatus,
					updated_at: now,
				})
				.eq("status", "active")
				.lt("end_date", now);

			if (expireError) throw expireError;

			// Clean up very old completed quests (older than 90 days)
			const cutoffDate = new Date(
				Date.now() - 90 * 24 * 60 * 60 * 1000,
			).toISOString();
			const { error: cleanupError } = await supabaseService()
				.from("user_quests")
				.delete()
				.eq("status", "completed")
				.lt("completed_at", cutoffDate);

			if (cleanupError) throw cleanupError;

			console.log("Quest cleanup completed successfully");
		} catch (error) {
			console.error("Error in quest cleanup:", error);
		}
	}

	/**
	 * Core quest generation logic for specific types
	 */
	private static async generateQuestsForType(
		config: QuestGenerationConfig,
	): Promise<Quest[]> {
		const {
			company_id,
			user_level,
			character_class,
			quest_type,
			difficulty_preferences,
		} = config;

		// Get quest templates for the company
		const { data: templates, error: templateError } = await supabaseService()
			.from("creator_settings")
			.select("quest_templates")
			.eq("company_id", company_id)
			.single();

		if (templateError || !templates?.quest_templates) {
			// Fallback to default templates
			return QuestEngine.generateDefaultQuests(config);
		}

		const generatedQuests: Quest[] = [];
		const templatesToUse = templates.quest_templates.filter(
			(t: QuestTemplate) => t.quest_type === quest_type && t.is_active,
		);

		// Calculate number of quests based on type
		const questCount = QuestEngine.getQuestCount(quest_type);
		const selectedTemplates = QuestEngine.selectTemplates(
			templatesToUse,
			questCount,
			difficulty_preferences,
		);

		for (const template of selectedTemplates) {
			const quest = await QuestEngine.createQuestFromTemplate(template, config);
			if (quest) {
				generatedQuests.push(quest);
			}
		}

		return generatedQuests;
	}

	/**
	 * Get user's active quests
	 */
	static async getUserActiveQuests(userId: string): Promise<UserQuest[]> {
		// Validate user ID
		const userValidation = SecurityValidator.validateUserId(userId);
		if (!userValidation.isValid) {
			throw new ValidationError(
				`Invalid user ID: ${userValidation.errors?.join(", ")}`,
				"user_id",
			);
		}

		const { data, error } = await supabaseService()
			.from("user_quests")
			.select(`
        *,
        quest:quests(*)
      `)
			.eq("user_id", userId)
			.eq("is_completed", false)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error fetching user quests:", error);
			return [] as UserQuest[];
		}

		return (data as UserQuest[]) || [];
	}

	/**
	 * Get user's quest progress
	 */
	static async getUserQuestProgress(userId: string): Promise<QuestProgress[]> {
		const userQuests = await QuestEngine.getUserActiveQuests(userId);
		const userStats = await QuestEngine.getUserStats(userId);

		const result: QuestProgress[] = [];
		for (const userQuest of userQuests) {
			const current_value = QuestEngine.getCurrentProgress(
				userQuest.quest!,
				userStats,
			);
			const percentage = Math.min(
				(current_value / (userQuest.quest?.target_value || 1)) * 100,
				100,
			);

			let time_remaining: number | undefined;
			if (userQuest.quest?.end_date) {
				const end = new Date(userQuest.quest?.end_date);
				const now = new Date();
				const diff = end.getTime() - now.getTime();

				if (diff > 0) {
					time_remaining = Math.floor(diff / 1000); // Convert to seconds
				}
			}

			result.push({
				quest_id: userQuest.quest_id,
				user_id: userId,
				current_progress: current_value,
				target_value: userQuest.quest?.target_value || 0,
				percentage_complete: percentage,
				status:
					percentage >= 100
						? ("completed" as QuestStatus)
						: (userQuest.status as QuestStatus),
				time_remaining,
			});
		}

		return result;
	}

	/**
	 * Update quest progress based on user actions
	 */
	static async updateQuestProgress(
		userId: string,
		actionType: "referral" | "commission" | "level" | "achievement",
		value = 1,
	): Promise<void> {
		// Validate input parameters to prevent cheating
		const userValidation = SecurityValidator.validateUserId(userId);
		if (!userValidation.isValid) {
			throw new ValidationError(
				`Invalid user ID: ${userValidation.errors?.join(", ")}`,
				"user_id",
			);
		}

		// Validate action type
		const validActionTypes = ["referral", "commission", "level", "achievement"];
		if (!validActionTypes.includes(actionType)) {
			throw new ValidationError(
				`Invalid action type: ${actionType}`,
				"actionType",
			);
		}

		// Validate value to prevent unreasonable progress jumps
		if (typeof value !== "number" || value < 0 || value > 1000) {
			throw new ValidationError(
				"Progress value must be between 0 and 1000",
				"value",
			);
		}

		const userQuests = await QuestEngine.getUserActiveQuests(userId);
		const userStats = await QuestEngine.getUserStats(userId);

		for (const userQuest of userQuests) {
			if (QuestEngine.shouldUpdateQuest(userQuest.quest!, actionType)) {
				const currentProgress = QuestEngine.getCurrentProgress(
					userQuest.quest!,
					userStats,
				);
				const newProgress = Math.min(
					currentProgress + value,
					userQuest.quest?.target_value || Infinity,
				);
				const isCompleted = newProgress >= (userQuest.quest?.target_value || 0);

				// Update user quest progress
				const { error } = await supabaseService()
					.from("user_quests")
					.update({
						progress_value: newProgress,
						isCompleted,
						completed_at: isCompleted ? new Date().toISOString() : null,
						updated_at: new Date().toISOString(),
					})
					.eq("id", userQuest.id);

				if (error) {
					console.error("Error updating quest progress:", error);
					continue;
				}

				// If quest is completed, trigger reward distribution
				if (isCompleted && !userQuest.reward_claimed) {
					await QuestEngine.distributeQuestRewards(userId, userQuest.quest_id);
				}
			}
		}
	}

	/**
	 * Claim quest rewards
	 */
	static async claimQuestRewards(
		userId: string,
		userQuestId: string,
	): Promise<QuestReward | null> {
		const { data: userQuest, error } = await supabaseService()
			.from("user_quests")
			.select("*, quest:quests(*)")
			.eq("id", userQuestId)
			.eq("user_id", userId)
			.single();

		if (error || !userQuest) {
			console.error("Error fetching user quest:", error);
			return null;
		}

		if (!userQuest.is_completed || userQuest.reward_claimed) {
			return null;
		}

		const reward: QuestReward = {
			xp: userQuest.quest.reward_xp,
			commission: userQuest.quest.reward_commission,
		};

		// Update user with rewards
		const { error: updateError } = await supabaseService()
			.from("users")
			.update({
				experience_points: userQuest.quest.reward_xp,
				total_commission: userQuest.quest.reward_commission,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);

		if (updateError) {
			console.error("Error updating user rewards:", updateError);
			return null;
		}

		// Mark reward as claimed
		await supabaseService()
			.from("user_quests")
			.update({
				reward_claimed: true,
				reward_claimed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", userQuestId);

		return reward;
	}

	/**
	 * Get user quest statistics
	 */
	static async getUserQuestStats(userId: string): Promise<QuestStats> {
		const { data: userQuests, error } = await supabaseService()
			.from("user_quests")
			.select("*")
			.eq("user_id", userId);

		if (error) {
			console.error("Error fetching user quest stats:", error);
			return QuestEngine.getDefaultQuestStats();
		}

		const completedQuests = userQuests.filter((q: Database["public"]["Tables"]["user_quests"]["Row"]) => q.is_completed);
		const totalQuests = userQuests.length;

		return {
			total_completed: completedQuests.length,
			completion_rate:
				totalQuests > 0 ? (completedQuests.length / totalQuests) * 100 : 0,
			average_completion_time:
				QuestEngine.calculateAverageCompletionTime(completedQuests),
			favorite_quest_type: QuestEngine.getFavoriteQuestType(completedQuests),
			total_xp_earned: completedQuests.reduce((sum: number, q: Database["public"]["Tables"]["user_quests"]["Row"]) => {
				// Note: This would need to join with quests table to get reward_xp
				return sum + 100; // Placeholder
			}, 0),
			total_commission_earned: completedQuests.reduce((sum: number, q: Database["public"]["Tables"]["user_quests"]["Row"]) => {
				// Note: This would need to join with quests table to get reward_commission
				return sum + 5; // Placeholder
			}, 0),
			current_streak: QuestEngine.calculateCurrentStreak(completedQuests),
			longest_streak: QuestEngine.calculateLongestStreak(completedQuests),
		};
	}

	// Private helper methods
	private static getQuestCount(
		questType: "daily" | "weekly" | "monthly",
	): number {
		switch (questType) {
			case "daily":
				return 3;
			case "weekly":
				return 2;
			case "monthly":
				return 1;
			default:
				return 1;
		}
	}

	private static generateDefaultQuests(config: QuestGenerationConfig): Quest[] {
		const baseQuests = [
			{
				title: "First Steps",
				description: "Complete your first referral to get started",
				target_type: "referrals" as const,
				target_value: 1,
				reward_xp: 100,
				reward_commission: 5.0,
			},
			{
				title: "Network Builder",
				description: "Refer 3 new users to expand your network",
				target_type: "referrals" as const,
				target_value: 3,
				reward_xp: 250,
				reward_commission: 15.0,
			},
			{
				title: "Commission Champion",
				description: "Earn $50 in commission from referrals",
				target_type: "commission" as const,
				target_value: 50,
				reward_xp: 500,
				reward_commission: 25.0,
			},
		];

		return baseQuests.map((quest, index) => ({
			id: `generated_${Date.now()}_${index}`,
			company_id: config.company_id,
			title: quest.title,
			description: quest.description,
			quest_type: config.quest_type,
			difficulty: "easy" as const,
			target_type: quest.target_type,
			target_value: quest.target_value,
			reward_xp: quest.reward_xp,
			reward_commission: quest.reward_commission,
			is_active: true,
			start_date: new Date().toISOString(),
			end_date: QuestEngine.getQuestEndDate(config.quest_type),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		}));
	}

	private static selectTemplates(
		templates: QuestTemplate[],
		count: number,
		preferences?: string[],
	): QuestTemplate[] {
		let availableTemplates = templates;

		if (preferences && preferences.length > 0) {
			availableTemplates = templates.filter((t) =>
				preferences.includes(t.difficulty),
			);
		}

		// Shuffle and select
		const shuffled = [...availableTemplates].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, Math.min(count, shuffled.length));
	}

	private static async createQuestFromTemplate(
		template: QuestTemplate,
		config: QuestGenerationConfig,
	): Promise<Quest | null> {
		const targetValue = Math.round(
			template.requirements_template.base_target_value *
				(1 +
					(config.user_level - 1) *
						template.requirements_template.scaling_factor),
		);

		const quest: Quest = {
			id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			company_id: config.company_id,
			title: `${template.template_name} - Level ${config.user_level}`,
			description: `Complete ${targetValue} ${template.requirements_template.target_type}`,
			quest_type: template.quest_type,
			difficulty: template.difficulty,
			target_type: template.requirements_template.target_type,
			target_value: targetValue,
			reward_xp: Math.round(
				template.base_reward_xp * (1 + config.user_level * 0.1),
			),
			reward_commission: targetValue * 0.1, // 10% of target value
			is_active: true,
			start_date: new Date().toISOString(),
			end_date: QuestEngine.getQuestEndDate(template.quest_type),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Save quest to database
		const { error } = await supabaseService().from("quests").insert(quest);

		if (error) {
			console.error("Error creating quest:", error);
			return null;
		}

		return quest;
	}

	private static getQuestEndDate(
		questType: "daily" | "weekly" | "monthly" | "special",
	): string {
		const now = new Date();
		switch (questType) {
			case "daily":
				now.setHours(23, 59, 59, 999);
				break;
			case "weekly":
				now.setDate(now.getDate() + 7);
				break;
			case "monthly":
				now.setMonth(now.getMonth() + 1);
				break;
			case "special":
				now.setDate(now.getDate() + 30); // 30 days for special quests
				break;
		}
		return now.toISOString();
	}

	private static async getUserStats(userId: string): Promise<any> {
		const { data: user, error } = await supabaseService()
			.from("users")
			.select("*")
			.eq("id", userId)
			.single();

		if (error || !user) {
			return {};
		}

		return user;
	}

	private static getCurrentProgress(quest: Quest, userStats: Database["public"]["Tables"]["users"]["Row"]): number {
		switch (quest.target_type) {
			case "referrals":
				return userStats.total_referrals || 0;
			case "commission":
				return userStats.total_commission || 0;
			case "level":
				return userStats.level || 1;
			case "achievements":
				return userStats.total_achievements || 0;
			default:
				return 0;
		}
	}

	private static shouldUpdateQuest(quest: Quest, actionType: string): boolean {
		const mapping: Record<string, string[]> = {
			referral: ["referrals"],
			commission: ["commission"],
			level: ["level"],
			achievement: ["achievements"],
		};

		return mapping[actionType]?.includes(quest.target_type) || false;
	}

	private static async distributeQuestRewards(
		userId: string,
		questId: string,
	): Promise<void> {
		// This would handle automatic reward distribution
		// For now, we'll just log it
		console.log(`Distributing rewards for quest ${questId} to user ${userId}`);
	}

	private static calculateAverageCompletionTime(
		completedQuests: Database["public"]["Tables"]["user_quests"]["Row"][],
	): number {
		if (completedQuests.length === 0) return 0;

		const totalTime = completedQuests.reduce((sum, quest) => {
			const start = new Date(quest.created_at);
			const end = new Date(quest.completed_at || quest.updated_at);
			return sum + (end.getTime() - start.getTime());
		}, 0);

		return totalTime / completedQuests.length / (1000 * 60 * 60); // Convert to hours
	}

	private static getFavoriteQuestType(completedQuests: Database["public"]["Tables"]["user_quests"]["Row"][]): string {
		if (completedQuests.length === 0) return "none";

		const typeCount: Record<string, number> = {};
		completedQuests.forEach((quest) => {
			// This would need to join with quests table
			typeCount.daily = (typeCount.daily || 0) + 1;
		});

		return (
			Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "none"
		);
	}

	private static calculateCurrentStreak(completedQuests: Database["public"]["Tables"]["user_quests"]["Row"][]): number {
		// Simplified streak calculation
		const recentQuests = completedQuests.filter(
			(q) =>
				new Date(q.completed_at || q.updated_at) >
				new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
		).length;

		return recentQuests > 0 ? recentQuests : 0;
	}

	private static calculateLongestStreak(completedQuests: Database["public"]["Tables"]["user_quests"]["Row"][]): number {
		// Simplified longest streak calculation
		return completedQuests.length > 0
			? Math.min(completedQuests.length, 30)
			: 0;
	}

	private static getDefaultQuestStats(): QuestStats {
		return {
			total_completed: 0,
			completion_rate: 0,
			average_completion_time: 0,
			favorite_quest_type: "none",
			total_xp_earned: 0,
			total_commission_earned: 0,
			current_streak: 0,
			longest_streak: 0,
		};
	}
}

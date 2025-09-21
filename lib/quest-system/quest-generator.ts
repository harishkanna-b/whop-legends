import { supabaseService, type Database } from "@/lib/supabase-client";
import type {
	Quest,
	QuestGenerationConfig,
	QuestTemplate,
} from "@/lib/types/quest-types";

export class QuestGenerator {
	/**
	 * Generate daily quests for all users in a company
	 */
	static async generateDailyQuests(companyId: string): Promise<void> {
		const { data: users, error: userError } = await supabaseService()
			.from("users")
			.select("*")
			.eq("company_id", companyId);

		if (userError || !users) {
			console.error(
				"Error fetching users for daily quest generation:",
				userError,
			);
			return;
		}

		for (const user of users) {
			const config: QuestGenerationConfig = {
				company_id: companyId,
				user_level: user.level,
				character_class: user.character_class,
				quest_type: "daily",
			};

			const quests = await QuestGenerator.generateQuestsForUser(config);
			await QuestGenerator.assignQuestsToUser(user.id, quests);
		}
	}

	/**
	 * Generate weekly quests for all users in a company
	 */
	static async generateWeeklyQuests(companyId: string): Promise<void> {
		const { data: users, error: userError } = await supabaseService()
			.from("users")
			.select("*")
			.eq("company_id", companyId);

		if (userError || !users) {
			console.error(
				"Error fetching users for weekly quest generation:",
				userError,
			);
			return;
		}

		for (const user of users) {
			const config: QuestGenerationConfig = {
				company_id: companyId,
				user_level: user.level,
				character_class: user.character_class,
				quest_type: "weekly",
			};

			const quests = await QuestGenerator.generateQuestsForUser(config);
			await QuestGenerator.assignQuestsToUser(user.id, quests);
		}
	}

	/**
	 * Generate monthly quests for all users in a company
	 */
	static async generateMonthlyQuests(companyId: string): Promise<void> {
		const { data: users, error: userError } = await supabaseService()
			.from("users")
			.select("*")
			.eq("company_id", companyId);

		if (userError || !users) {
			console.error(
				"Error fetching users for monthly quest generation:",
				userError,
			);
			return;
		}

		for (const user of users) {
			const config: QuestGenerationConfig = {
				company_id: companyId,
				user_level: user.level,
				character_class: user.character_class,
				quest_type: "monthly",
			};

			const quests = await QuestGenerator.generateQuestsForUser(config);
			await QuestGenerator.assignQuestsToUser(user.id, quests);
		}
	}

	/**
	 * Generate quests for a specific user based on configuration
	 */
	static async generateQuestsForUser(
		config: QuestGenerationConfig,
	): Promise<Quest[]> {
		const quests: Quest[] = [];

		// Get company-specific quest templates
		const { data: companySettings, error: settingsError } =
			await supabaseService()
				.from("creator_settings")
				.select("quest_templates")
				.eq("company_id", config.company_id)
				.single();

		if (settingsError || !companySettings?.quest_templates) {
			// Use default quest templates
			return QuestGenerator.generateDefaultQuests(config);
		}

		const templates = companySettings.quest_templates.filter(
			(t: QuestTemplate) => t.quest_type === config.quest_type && t.is_active,
		);

		// Select appropriate templates based on user level and preferences
		const selectedTemplates = QuestGenerator.selectTemplatesForUser(
			templates,
			config,
		);

		for (const template of selectedTemplates) {
			const quest = await QuestGenerator.createQuestFromTemplate(
				template,
				config,
			);
			if (quest) {
				quests.push(quest);
			}
		}

		return quests;
	}

	/**
	 * Create quest templates for a company
	 */
	static async createQuestTemplates(companyId: string): Promise<void> {
		const defaultTemplates = QuestGenerator.getDefaultQuestTemplates();

		const { error } = await supabaseService().from("creator_settings").upsert({
			company_id: companyId,
			quest_templates: defaultTemplates,
			updated_at: new Date().toISOString(),
		});

		if (error) {
			console.error("Error creating quest templates:", error);
		}
	}

	/**
	 * Get available quest types for a company
	 */
	static async getAvailableQuestTypes(companyId: string): Promise<string[]> {
		const { data: settings, error } = await supabaseService()
			.from("creator_settings")
			.select("quest_templates")
			.eq("company_id", companyId)
			.single();

		if (error || !settings?.quest_templates) {
			return ["daily", "weekly", "monthly"];
		}

		const types = new Set<string>();
		settings.quest_templates.forEach((template: QuestTemplate) => {
			if (template.is_active) {
				types.add(template.quest_type);
			}
		});

		return Array.from(types);
	}

	// Private helper methods
	private static async assignQuestsToUser(
		userId: string,
		quests: Quest[],
	): Promise<void> {
		for (const quest of quests) {
			const { error } = await supabaseService().from("user_quests").insert({
				user_id: userId,
				quest_id: quest.id,
				progress_value: 0,
				is_completed: false,
				reward_claimed: false,
			});

			if (error) {
				console.error("Error assigning quest to user:", error);
			}
		}
	}

	private static selectTemplatesForUser(
		templates: QuestTemplate[],
		config: QuestGenerationConfig,
	): QuestTemplate[] {
		const questCount = QuestGenerator.getQuestCount(config.quest_type);
		const suitableTemplates = templates.filter((template) => {
			// Filter templates based on user level and difficulty appropriateness
			const difficultyLevel = QuestGenerator.getDifficultyLevel(
				template.difficulty,
			);
			const userLevel = config.user_level;

			// Allow templates within 2 levels of user's current level
			return Math.abs(difficultyLevel - userLevel) <= 2;
		});

		// Shuffle and select the required number
		const shuffled = suitableTemplates.sort(() => Math.random() - 0.5);
		return shuffled.slice(0, Math.min(questCount, shuffled.length));
	}

	private static async createQuestFromTemplate(
		template: QuestTemplate,
		config: QuestGenerationConfig,
	): Promise<Quest | null> {
		// Calculate target value based on user level and scaling
		const baseValue = template.requirements_template.base_target_value;
		const scalingFactor = template.requirements_template.scaling_factor;
		const levelBonus = (config.user_level - 1) * scalingFactor;
		const targetValue = Math.round(baseValue * (1 + levelBonus));

		// Calculate rewards based on difficulty and user level
		const baseReward = template.base_reward_xp;
		const rewardMultiplier = QuestGenerator.getRewardMultiplier(
			config.character_class,
		);
		const rewardXP = Math.round(
			baseReward * rewardMultiplier * (1 + config.user_level * 0.1),
		);

		const quest: Quest = {
			id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			company_id: config.company_id,
			title: QuestGenerator.generateQuestTitle(template, config),
			description: QuestGenerator.generateQuestDescription(
				template,
				targetValue,
			),
			quest_type: template.quest_type,
			difficulty: template.difficulty,
			target_type: template.requirements_template.target_type,
			target_value: targetValue,
			reward_xp: rewardXP,
			reward_commission: targetValue * 0.05, // 5% of target value as commission
			is_active: true,
			start_date: new Date().toISOString(),
			end_date: QuestGenerator.getQuestEndDate(template.quest_type),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Save quest to database
		const { error } = await supabaseService().from("quests").insert(quest);

		if (error) {
			console.error("Error creating quest from template:", error);
			return null;
		}

		return quest;
	}

	private static generateDefaultQuests(config: QuestGenerationConfig): Quest[] {
		const defaultQuestDefs = QuestGenerator.getDefaultQuestDefinitions(
			config.quest_type,
		);
		const quests: Quest[] = [];

		for (
			let i = 0;
			i <
			Math.min(
				defaultQuestDefs.length,
				QuestGenerator.getQuestCount(config.quest_type),
			);
			i++
		) {
			const questDef = defaultQuestDefs[i];
			const quest: Quest = {
				id: `default_quest_${Date.now()}_${i}`,
				company_id: config.company_id,
				title: questDef.title,
				description: questDef.description,
				quest_type: config.quest_type,
				difficulty: questDef.difficulty,
				target_type: questDef.target_type,
				target_value: questDef.target_value,
				reward_xp: questDef.reward_xp,
				reward_commission: questDef.reward_commission,
				is_active: true,
				start_date: new Date().toISOString(),
				end_date: QuestGenerator.getQuestEndDate(config.quest_type),
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			quests.push(quest);
		}

		return quests;
	}

	private static getDefaultQuestDefinitions(
		questType: "daily" | "weekly" | "monthly",
	): Array<{
		title: string;
		description: string;
		difficulty: "easy" | "medium" | "hard" | "epic";
		target_type: "referrals" | "commission";
		target_value: number;
		reward_xp: number;
		reward_commission: number;
	}> {
		const baseDefinitions = {
			daily: [
				{
					title: "Daily Referral",
					description: "Refer at least 1 new user today",
					difficulty: "easy" as const,
					target_type: "referrals" as const,
					target_value: 1,
					reward_xp: 50,
					reward_commission: 2.5,
				},
				{
					title: "Quick Commission",
					description: "Earn $10 in referral commission today",
					difficulty: "easy" as const,
					target_type: "commission" as const,
					target_value: 10,
					reward_xp: 75,
					reward_commission: 5.0,
				},
				{
					title: "Network Expander",
					description: "Refer 3 new users today",
					difficulty: "medium" as const,
					target_type: "referrals" as const,
					target_value: 3,
					reward_xp: 150,
					reward_commission: 7.5,
				},
			],
			weekly: [
				{
					title: "Weekly Goal",
					description: "Refer 10 new users this week",
					difficulty: "medium" as const,
					target_type: "referrals" as const,
					target_value: 10,
					reward_xp: 300,
					reward_commission: 25.0,
				},
				{
					title: "Commission Master",
					description: "Earn $100 in commission this week",
					difficulty: "hard" as const,
					target_type: "commission" as const,
					target_value: 100,
					reward_xp: 500,
					reward_commission: 50.0,
				},
			],
			monthly: [
				{
					title: "Monthly Champion",
					description: "Refer 50 new users this month",
					difficulty: "hard" as const,
					target_type: "referrals" as const,
					target_value: 50,
					reward_xp: 1500,
					reward_commission: 150.0,
				},
				{
					title: "Revenue Leader",
					description: "Earn $500 in commission this month",
					difficulty: "epic" as const,
					target_type: "commission" as const,
					target_value: 500,
					reward_xp: 3000,
					reward_commission: 250.0,
				},
			],
		};

		return baseDefinitions[questType] || baseDefinitions.daily;
	}

	private static getDefaultQuestTemplates(): QuestTemplate[] {
		return [
			{
				id: "template_daily_referral",
				template_name: "Daily Referral Challenge",
				quest_type: "daily",
				difficulty: "easy",
				base_reward_xp: 50,
				requirements_template: {
					target_type: "referrals",
					base_target_value: 1,
					scaling_factor: 0.2,
				},
				is_active: true,
			},
			{
				id: "template_daily_commission",
				template_name: "Daily Commission Goal",
				quest_type: "daily",
				difficulty: "easy",
				base_reward_xp: 75,
				requirements_template: {
					target_type: "commission",
					base_target_value: 10,
					scaling_factor: 0.3,
				},
				is_active: true,
			},
			{
				id: "template_weekly_network",
				template_name: "Weekly Network Builder",
				quest_type: "weekly",
				difficulty: "medium",
				base_reward_xp: 300,
				requirements_template: {
					target_type: "referrals",
					base_target_value: 10,
					scaling_factor: 0.5,
				},
				is_active: true,
			},
			{
				id: "template_monthly_champion",
				template_name: "Monthly Champion Quest",
				quest_type: "monthly",
				difficulty: "hard",
				base_reward_xp: 1500,
				requirements_template: {
					target_type: "referrals",
					base_target_value: 50,
					scaling_factor: 1.0,
				},
				is_active: true,
			},
		];
	}

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

	private static getDifficultyLevel(difficulty: string): number {
		const levels: Record<string, number> = {
			easy: 1,
			medium: 5,
			hard: 10,
			epic: 15,
		};
		return levels[difficulty] || 1;
	}

	private static getRewardMultiplier(characterClass: string): number {
		const multipliers: Record<string, number> = {
			scout: 1.1,
			sage: 1.2,
			champion: 1.3,
		};
		return multipliers[characterClass] || 1.0;
	}

	private static generateQuestTitle(
		template: QuestTemplate,
		config: QuestGenerationConfig,
	): string {
		const titles = [
			`${template.template_name}`,
			`${template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)} ${template.quest_type} Challenge`,
			`${config.character_class.charAt(0).toUpperCase() + config.character_class.slice(1)}'s ${template.quest_type} Quest`,
		];
		return titles[Math.floor(Math.random() * titles.length)];
	}

	private static generateQuestDescription(
		template: QuestTemplate,
		targetValue: number,
	): string {
		const descriptions = [
			`Complete ${targetValue} ${template.requirements_template.target_type}`,
			`Achieve ${targetValue} ${template.requirements_template.target_type} to succeed`,
			`Reach the goal of ${targetValue} ${template.requirements_template.target_type}`,
			`Master ${targetValue} ${template.requirements_template.target_type} in this quest`,
		];
		return descriptions[Math.floor(Math.random() * descriptions.length)];
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
				now.setDate(now.getDate() + 30);
				break;
		}
		return now.toISOString();
	}

	// Additional public methods for testing
	public static async generateQuestsFromTemplates(
		config: QuestGenerationConfig,
		templates: QuestTemplate[],
	): Promise<Quest[]> {
		const filteredTemplates = templates.filter(
			(t: QuestTemplate) => t.quest_type === config.quest_type && t.is_active,
		);

		const quests: Quest[] = [];
		for (const template of filteredTemplates) {
			const quest = await QuestGenerator.createQuestFromTemplate(
				template,
				config,
			);
			if (quest) {
				quests.push(quest);
			}
		}

		return quests;
	}

	public static generateDynamicQuests(
		userStats: Database["public"]["Tables"]["users"]["Row"],
		companyId: string,
	): Quest[] {
		const quests: Quest[] = [];

		// Generate quests based on user level
		const questCount = Math.min(3, Math.floor(userStats.level / 3) + 1);

		for (let i = 0; i < questCount; i++) {
			const difficulty = QuestGenerator.getDifficultyFromLevel(userStats.level);
			const quest = QuestGenerator.createBalancedQuest(difficulty, companyId);
			quests.push(quest);
		}

		return quests;
	}

	public static createBalancedQuest(
		difficulty: string,
		companyId: string,
		questType: "daily" | "weekly" | "monthly" = "daily",
	): Quest {
		const baseRewards = {
			easy: { xp: 50, commission: 2.5 },
			medium: { xp: 150, commission: 7.5 },
			hard: { xp: 300, commission: 15.0 },
			epic: { xp: 500, commission: 25.0 },
		};

		const baseTargets = {
			easy: { referrals: 1, commission: 10 },
			medium: { referrals: 3, commission: 25 },
			hard: { referrals: 5, commission: 50 },
			epic: { referrals: 10, commission: 100 },
		};

		const rewards =
			baseRewards[difficulty as keyof typeof baseRewards] || baseRewards.easy;
		const targets =
			baseTargets[difficulty as keyof typeof baseTargets] || baseTargets.easy;

		return {
			id: `balanced_quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			company_id: companyId,
			title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${questType} Quest`,
			description: `Complete ${targets.referrals} referrals or earn $${targets.commission} in commission`,
			quest_type: questType,
			difficulty: difficulty as any,
			target_type: Math.random() > 0.5 ? "referrals" : "commission",
			target_value:
				Math.random() > 0.5 ? targets.referrals : targets.commission,
			reward_xp: rewards.xp,
			reward_commission: rewards.commission,
			is_active: true,
			start_date: new Date().toISOString(),
			end_date: QuestGenerator.getQuestEndDate(questType),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
	}

	public static scaleQuestToLevel(
		requirements: { base_target_value: number; scaling_factor: number },
		level: number,
	): number {
		const levelBonus = (level - 1) * requirements.scaling_factor;
		return Math.round(requirements.base_target_value * (1 + levelBonus));
	}

	public static applyCharacterClassMultiplier(
		baseReward: { xp: number; commission: number },
		characterClass: string,
	): { xp: number; commission: number } {
		const multiplier = QuestGenerator.getRewardMultiplier(characterClass);
		return {
			xp: Math.round(baseReward.xp * multiplier),
			commission: baseReward.commission * multiplier,
		};
	}

	private static getDifficultyFromLevel(level: number): string {
		if (level <= 3) return "easy";
		if (level <= 7) return "medium";
		if (level <= 12) return "hard";
		return "epic";
	}
}

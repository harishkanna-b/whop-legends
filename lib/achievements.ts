import { supabase } from "./supabase-client";

export interface Achievement {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: AchievementCategory;
	rarity: AchievementRarity;
	points: number;
	requirements: AchievementRequirement[];
	rewards: AchievementReward[];
	maxProgress?: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface AchievementCategory {
	id: string;
	name: string;
	description: string;
	color: string;
	icon: string;
}

export interface AchievementRarity {
	id: string;
	name: string;
	description: string;
	color: string;
	multiplier: number;
	icon: string;
}

export interface AchievementRequirement {
	type: "referrals" | "level" | "xp" | "value" | "streak" | "custom";
	target: number;
	operator:
		| "equals"
		| "greater_than"
		| "less_than"
		| "greater_equal"
		| "less_equal";
	description: string;
}

export interface AchievementReward {
	type: "xp" | "level" | "title" | "badge" | "item" | "custom";
	value: number | string;
	description: string;
}

export interface UserAchievement {
	id: string;
	userId: string;
	achievementId: string;
	progress: number;
	maxProgress: number;
	unlockedAt?: string;
	lastProgressedAt: string;
	metadata?: any;
}

export interface AchievementProgress {
	achievementId: string;
	current: number;
	max: number;
	percentage: number;
	isUnlocked: boolean;
	unlockedAt?: string;
	nextMilestone?: number;
}

// Achievement categories
export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
	{
		id: "referral",
		name: "Referral Mastery",
		description: "Achievements related to referral performance",
		color: "#3B82F6",
		icon: "🎯",
	},
	{
		id: "leveling",
		name: "Level Progression",
		description: "Achievements for reaching level milestones",
		color: "#10B981",
		icon: "⬆️",
	},
	{
		id: "value",
		name: "Value Generation",
		description: "Achievements for generating high-value referrals",
		color: "#F59E0B",
		icon: "💰",
	},
	{
		id: "streak",
		name: "Consistency",
		description: "Achievements for maintaining referral streaks",
		color: "#EF4444",
		icon: "🔥",
	},
	{
		id: "social",
		name: "Social Impact",
		description: "Achievements for social interactions and community",
		color: "#8B5CF6",
		icon: "👥",
	},
	{
		id: "special",
		name: "Special Events",
		description: "Limited-time and special achievements",
		color: "#EC4899",
		icon: "⭐",
	},
];

// Achievement rarities
export const ACHIEVEMENT_RARITIES: AchievementRarity[] = [
	{
		id: "common",
		name: "Common",
		description: "Standard achievements",
		color: "#6B7280",
		multiplier: 1,
		icon: "⭐",
	},
	{
		id: "rare",
		name: "Rare",
		description: "Harder to obtain achievements",
		color: "#3B82F6",
		multiplier: 1.5,
		icon: "💎",
	},
	{
		id: "epic",
		name: "Epic",
		description: "Challenging achievements",
		color: "#8B5CF6",
		multiplier: 2,
		icon: "🌟",
	},
	{
		id: "legendary",
		name: "Legendary",
		description: "Extremely rare achievements",
		color: "#F59E0B",
		multiplier: 3,
		icon: "👑",
	},
	{
		id: "mythic",
		name: "Mythic",
		description: "Nearly impossible achievements",
		color: "#EF4444",
		multiplier: 5,
		icon: "🏆",
	},
];

// Pre-defined achievements
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
	// Referral Achievements
	{
		id: "first_referral",
		name: "First Steps",
		description: "Make your first successful referral",
		icon: "🎯",
		category: ACHIEVEMENT_CATEGORIES[0], // referral
		rarity: ACHIEVEMENT_RARITIES[0], // common
		points: 50,
		requirements: [
			{
				type: "referrals",
				target: 1,
				operator: "greater_equal",
				description: "Make 1 referral",
			},
		],
		rewards: [{ type: "xp", value: 100, description: "100 XP bonus" }],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "referral_novice",
		name: "Referral Novice",
		description: "Refer 5 users to the platform",
		icon: "🌟",
		category: ACHIEVEMENT_CATEGORIES[0], // referral
		rarity: ACHIEVEMENT_RARITIES[1], // rare
		points: 200,
		requirements: [
			{
				type: "referrals",
				target: 5,
				operator: "greater_equal",
				description: "Make 5 referrals",
			},
		],
		rewards: [
			{ type: "xp", value: 500, description: "500 XP bonus" },
			{ type: "title", value: "Referral Novice", description: "Special title" },
		],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "referral_master",
		name: "Referral Master",
		description: "Refer 25 users to the platform",
		icon: "👑",
		category: ACHIEVEMENT_CATEGORIES[0], // referral
		rarity: ACHIEVEMENT_RARITIES[3], // legendary
		points: 1000,
		requirements: [
			{
				type: "referrals",
				target: 25,
				operator: "greater_equal",
				description: "Make 25 referrals",
			},
		],
		rewards: [
			{ type: "xp", value: 2500, description: "2500 XP bonus" },
			{
				type: "title",
				value: "Referral Master",
				description: "Prestigious title",
			},
			{
				type: "badge",
				value: "master_referrer",
				description: "Exclusive badge",
			},
		],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	// Level Achievements
	{
		id: "level_5",
		name: "Getting Started",
		description: "Reach level 5",
		icon: "⬆️",
		category: ACHIEVEMENT_CATEGORIES[1], // leveling
		rarity: ACHIEVEMENT_RARITIES[0], // common
		points: 100,
		requirements: [
			{
				type: "level",
				target: 5,
				operator: "greater_equal",
				description: "Reach level 5",
			},
		],
		rewards: [{ type: "xp", value: 200, description: "200 XP bonus" }],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "level_10",
		name: "Rising Star",
		description: "Reach level 10",
		icon: "⭐",
		category: ACHIEVEMENT_CATEGORIES[1], // leveling
		rarity: ACHIEVEMENT_RARITIES[1], // rare
		points: 250,
		requirements: [
			{
				type: "level",
				target: 10,
				operator: "greater_equal",
				description: "Reach level 10",
			},
		],
		rewards: [
			{ type: "xp", value: 500, description: "500 XP bonus" },
			{ type: "title", value: "Rising Star", description: "Special title" },
		],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "level_25",
		name: "Legend in the Making",
		description: "Reach level 25",
		icon: "🌟",
		category: ACHIEVEMENT_CATEGORIES[1], // leveling
		rarity: ACHIEVEMENT_RARITIES[2], // epic
		points: 500,
		requirements: [
			{
				type: "level",
				target: 25,
				operator: "greater_equal",
				description: "Reach level 25",
			},
		],
		rewards: [
			{ type: "xp", value: 1000, description: "1000 XP bonus" },
			{
				type: "title",
				value: "Legend in the Making",
				description: "Prestigious title",
			},
			{ type: "badge", value: "level_25", description: "Exclusive badge" },
		],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	// Value Achievements
	{
		id: "value_generator",
		name: "Value Generator",
		description: "Generate $1000 in total referral value",
		icon: "💰",
		category: ACHIEVEMENT_CATEGORIES[2], // value
		rarity: ACHIEVEMENT_RARITIES[1], // rare
		points: 300,
		requirements: [
			{
				type: "value",
				target: 1000,
				operator: "greater_equal",
				description: "Generate $1000 in value",
			},
		],
		rewards: [{ type: "xp", value: 750, description: "750 XP bonus" }],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "value_master",
		name: "Value Master",
		description: "Generate $10,000 in total referral value",
		icon: "💎",
		category: ACHIEVEMENT_CATEGORIES[2], // value
		rarity: ACHIEVEMENT_RARITIES[3], // legendary
		points: 1000,
		requirements: [
			{
				type: "value",
				target: 10000,
				operator: "greater_equal",
				description: "Generate $10,000 in value",
			},
		],
		rewards: [
			{ type: "xp", value: 2500, description: "2500 XP bonus" },
			{
				type: "title",
				value: "Value Master",
				description: "Prestigious title",
			},
			{ type: "badge", value: "value_master", description: "Exclusive badge" },
		],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	// Streak Achievements
	{
		id: "streak_7",
		name: "Week Warrior",
		description: "Maintain a 7-day referral streak",
		icon: "🔥",
		category: ACHIEVEMENT_CATEGORIES[3], // streak
		rarity: ACHIEVEMENT_RARITIES[1], // rare
		points: 300,
		requirements: [
			{
				type: "streak",
				target: 7,
				operator: "greater_equal",
				description: "7-day streak",
			},
		],
		rewards: [
			{ type: "xp", value: 500, description: "500 XP bonus" },
			{ type: "title", value: "Week Warrior", description: "Special title" },
		],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "streak_30",
		name: "Monthly Master",
		description: "Maintain a 30-day referral streak",
		icon: "🏆",
		category: ACHIEVEMENT_CATEGORIES[3], // streak
		rarity: ACHIEVEMENT_RARITIES[3], // legendary
		points: 1000,
		requirements: [
			{
				type: "streak",
				target: 30,
				operator: "greater_equal",
				description: "30-day streak",
			},
		],
		rewards: [
			{ type: "xp", value: 2000, description: "2000 XP bonus" },
			{
				type: "title",
				value: "Monthly Master",
				description: "Prestigious title",
			},
			{ type: "badge", value: "streak_master", description: "Exclusive badge" },
		],
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

export class AchievementManager {
	private achievements: Achievement[] = DEFAULT_ACHIEVEMENTS;

	constructor() {
		this.initializeAchievements();
	}

	private async initializeAchievements(): Promise<void> {
		try {
			// Check if achievements exist in database, if not insert them
			const { data: existingAchievements } = await supabase()
				.from("achievements")
				.select("id");

			if (!existingAchievements || existingAchievements.length === 0) {
				// Insert default achievements
				for (const achievement of this.achievements) {
					await supabase().from("achievements").insert({
						id: achievement.id,
						name: achievement.name,
						description: achievement.description,
						icon: achievement.icon,
						category_id: achievement.category.id,
						rarity_id: achievement.rarity.id,
						points: achievement.points,
						requirements: achievement.requirements,
						rewards: achievement.rewards,
						max_progress: achievement.maxProgress,
						is_active: achievement.isActive,
						created_at: achievement.createdAt,
						updated_at: achievement.updatedAt,
					});
				}
			}
		} catch (error) {
			console.error("Error initializing achievements:", error);
		}
	}

	async getAllAchievements(): Promise<Achievement[]> {
		try {
			const { data, error } = await supabase()
				.from("achievements")
				.select(`
          *,
          category:achievement_categories(*),
          rarity:achievement_rarities(*)
        `)
				.eq("is_active", true);

			if (error) throw error;

			return data.map((ach: any) => ({
				id: ach.id,
				name: ach.name,
				description: ach.description,
				icon: ach.icon,
				category: ach.category,
				rarity: ach.rarity,
				points: ach.points,
				requirements: ach.requirements,
				rewards: ach.rewards,
				maxProgress: ach.max_progress,
				isActive: ach.is_active,
				createdAt: ach.created_at,
				updatedAt: ach.updated_at,
			}));
		} catch (error) {
			console.error("Error getting achievements:", error);
			return this.achievements;
		}
	}

	async getUserAchievements(userId: string): Promise<UserAchievement[]> {
		try {
			const { data, error } = await supabase()
				.from("user_achievements")
				.select("*")
				.eq("user_id", userId);

			if (error) throw error;

			return data.map((ua: any) => ({
				id: ua.id,
				userId: ua.user_id,
				achievementId: ua.achievement_id,
				progress: ua.progress,
				maxProgress: ua.max_progress,
				unlockedAt: ua.unlocked_at,
				lastProgressedAt: ua.last_progressed_at,
				metadata: ua.metadata,
			}));
		} catch (error) {
			console.error("Error getting user achievements:", error);
			return [];
		}
	}

	async getAchievementProgress(userId: string): Promise<AchievementProgress[]> {
		try {
			const achievements = await this.getAllAchievements();
			const userAchievements = await this.getUserAchievements(userId);

			const userAchievementMap = new Map(
				userAchievements.map((ua) => [ua.achievementId, ua]),
			);

			return achievements.map((achievement) => {
				const userAchievement = userAchievementMap.get(achievement.id);
				const progress = userAchievement?.progress || 0;
				const maxProgress =
					userAchievement?.maxProgress || achievement.maxProgress || 1;
				const percentage = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;
				const isUnlocked = !!userAchievement?.unlockedAt;

				// Calculate next milestone
				let nextMilestone: number | undefined;
				if (!isUnlocked && achievement.requirements.length > 0) {
					const mainRequirement = achievement.requirements[0];
					if (progress < mainRequirement.target) {
						nextMilestone = mainRequirement.target;
					}
				}

				return {
					achievementId: achievement.id,
					current: progress,
					max: maxProgress,
					percentage,
					isUnlocked,
					unlockedAt: userAchievement?.unlockedAt,
					nextMilestone,
				};
			});
		} catch (error) {
			console.error("Error getting achievement progress:", error);
			return [];
		}
	}

	async updateProgress(
		userId: string,
		eventType:
			| "referral"
			| "level_up"
			| "xp_gained"
			| "value_generated"
			| "streak_updated",
		value: number,
		metadata?: any,
	): Promise<void> {
		try {
			const achievements = await this.getAllAchievements();
			const userAchievements = await this.getUserAchievements(userId);

			const userAchievementMap = new Map(
				userAchievements.map((ua) => [ua.achievementId, ua]),
			);

			const relevantAchievements = achievements.filter((achievement) => {
				return achievement.requirements.some((req) => {
					switch (req.type) {
						case "referrals":
							return eventType === "referral";
						case "level":
							return eventType === "level_up";
						case "xp":
							return eventType === "xp_gained";
						case "value":
							return eventType === "value_generated";
						case "streak":
							return eventType === "streak_updated";
						default:
							return false;
					}
				});
			});

			for (const achievement of relevantAchievements) {
				const userAchievement = userAchievementMap.get(achievement.id);
				const mainRequirement = achievement.requirements[0];

				if (!userAchievement) {
					// Create new user achievement
					await this.createUserAchievement(
						userId,
						achievement.id,
						value,
						achievement.maxProgress || mainRequirement.target,
					);
				} else if (!userAchievement.unlockedAt) {
					// Update existing achievement progress
					const newProgress = Math.min(
						value,
						achievement.maxProgress || mainRequirement.target,
					);

					await supabase()
						.from("user_achievements")
						.update({
							progress: newProgress,
							last_progressed_at: new Date().toISOString(),
							metadata: { ...userAchievement.metadata, ...metadata },
						})
						.eq("id", userAchievement.id);

					// Check if achievement should be unlocked
					if (this.checkRequirement(newProgress, mainRequirement)) {
						await this.unlockAchievement(
							userId,
							userAchievement.id,
							achievement,
						);
					}
				}
			}
		} catch (error) {
			console.error("Error updating achievement progress:", error);
		}
	}

	private async createUserAchievement(
		userId: string,
		achievementId: string,
		progress: number,
		maxProgress: number,
	): Promise<void> {
		try {
			const { data, error } = await supabase()
				.from("user_achievements")
				.insert({
					user_id: userId,
					achievement_id: achievementId,
					progress,
					max_progress: maxProgress,
					last_progressed_at: new Date().toISOString(),
				})
				.select();

			if (error) throw error;

			// Check if achievement should be unlocked immediately
			const achievement = this.achievements.find((a) => a.id === achievementId);
			if (
				achievement &&
				this.checkRequirement(progress, achievement.requirements[0])
			) {
				await this.unlockAchievement(userId, data[0].id, achievement);
			}
		} catch (error) {
			console.error("Error creating user achievement:", error);
		}
	}

	private async unlockAchievement(
		userId: string,
		userAchievementId: string,
		achievement: Achievement,
	): Promise<void> {
		try {
			await supabase()
				.from("user_achievements")
				.update({
					unlocked_at: new Date().toISOString(),
					progress:
						achievement.maxProgress || achievement.requirements[0].target,
				})
				.eq("id", userAchievementId);

			// Grant rewards
			await this.grantRewards(userId, achievement);

			console.log(
				`Achievement unlocked: ${achievement.name} for user ${userId}`,
			);
		} catch (error) {
			console.error("Error unlocking achievement:", error);
		}
	}

	private async grantRewards(
		userId: string,
		achievement: Achievement,
	): Promise<void> {
		try {
			for (const reward of achievement.rewards) {
				switch (reward.type) {
					case "xp":
						await this.grantXP(userId, Number(reward.value));
						break;
					case "title":
						await this.grantTitle(userId, String(reward.value));
						break;
					case "badge":
						await this.grantBadge(userId, String(reward.value));
						break;
					// Add more reward types as needed
				}
			}
		} catch (error) {
			console.error("Error granting rewards:", error);
		}
	}

	private async grantXP(userId: string, amount: number): Promise<void> {
		try {
			// Update user's XP (implement based on your leveling system)
			const { LevelingManager } = await import("./leveling");
			await LevelingManager.addXP(
				userId,
				amount,
				"achievement",
				"Achievement unlocked",
			);
		} catch (error) {
			console.error("Error granting XP:", error);
		}
	}

	private async grantTitle(userId: string, title: string): Promise<void> {
		try {
			// Grant title to user (implement based on your system)
			await supabase().from("user_titles").insert({
				user_id: userId,
				title,
				granted_at: new Date().toISOString(),
			});
		} catch (error) {
			console.error("Error granting title:", error);
		}
	}

	private async grantBadge(userId: string, badge: string): Promise<void> {
		try {
			// Grant badge to user (implement based on your system)
			await supabase().from("user_badges").insert({
				user_id: userId,
				badge,
				granted_at: new Date().toISOString(),
			});
		} catch (error) {
			console.error("Error granting badge:", error);
		}
	}

	private checkRequirement(
		value: number,
		requirement: AchievementRequirement,
	): boolean {
		switch (requirement.operator) {
			case "equals":
				return value === requirement.target;
			case "greater_than":
				return value > requirement.target;
			case "less_than":
				return value < requirement.target;
			case "greater_equal":
				return value >= requirement.target;
			case "less_equal":
				return value <= requirement.target;
			default:
				return false;
		}
	}

	async getAchievementStats(userId: string): Promise<{
		totalAchievements: number;
		unlockedAchievements: number;
		totalPoints: number;
		byCategory: Record<string, { total: number; unlocked: number }>;
		byRarity: Record<string, { total: number; unlocked: number }>;
	}> {
		try {
			const achievements = await this.getAllAchievements();
			const userAchievements = await this.getUserAchievements(userId);

			const unlockedAchievements = userAchievements.filter(
				(ua) => ua.unlockedAt,
			);
			const unlockedIds = new Set(
				unlockedAchievements.map((ua) => ua.achievementId),
			);

			const stats = {
				totalAchievements: achievements.length,
				unlockedAchievements: unlockedAchievements.length,
				totalPoints: unlockedAchievements.reduce((sum, ua) => {
					const achievement = achievements.find(
						(a) => a.id === ua.achievementId,
					);
					return sum + (achievement?.points || 0);
				}, 0),
				byCategory: {} as Record<string, { total: number; unlocked: number }>,
				byRarity: {} as Record<string, { total: number; unlocked: number }>,
			};

			// Calculate category stats
			for (const category of ACHIEVEMENT_CATEGORIES) {
				const categoryAchievements = achievements.filter(
					(a) => a.category.id === category.id,
				);
				const categoryUnlocked = categoryAchievements.filter((a) =>
					unlockedIds.has(a.id),
				);

				stats.byCategory[category.id] = {
					total: categoryAchievements.length,
					unlocked: categoryUnlocked.length,
				};
			}

			// Calculate rarity stats
			for (const rarity of ACHIEVEMENT_RARITIES) {
				const rarityAchievements = achievements.filter(
					(a) => a.rarity.id === rarity.id,
				);
				const rarityUnlocked = rarityAchievements.filter((a) =>
					unlockedIds.has(a.id),
				);

				stats.byRarity[rarity.id] = {
					total: rarityAchievements.length,
					unlocked: rarityUnlocked.length,
				};
			}

			return stats;
		} catch (error) {
			console.error("Error getting achievement stats:", error);
			return {
				totalAchievements: 0,
				unlockedAchievements: 0,
				totalPoints: 0,
				byCategory: {},
				byRarity: {},
			};
		}
	}

	async getRecentAchievements(
		userId: string,
		limit = 10,
	): Promise<
		Array<{
			achievement: Achievement;
			unlockedAt: string;
		}>
	> {
		try {
			const { data, error } = await supabase()
				.from("user_achievements")
				.select(`
          *,
          achievement:achievements(
            *,
            category:achievement_categories(*),
            rarity:achievement_rarities(*)
          )
        `)
				.eq("user_id", userId)
				.not("unlocked_at", "is", null)
				.order("unlocked_at", { ascending: false })
				.limit(limit);

			if (error) throw error;

			return data.map((item: any) => ({
				achievement: {
					id: item.achievement.id,
					name: item.achievement.name,
					description: item.achievement.description,
					icon: item.achievement.icon,
					category: item.achievement.category,
					rarity: item.achievement.rarity,
					points: item.achievement.points,
					requirements: item.achievement.requirements,
					rewards: item.achievement.rewards,
					maxProgress: item.achievement.max_progress,
					isActive: item.achievement.is_active,
					createdAt: item.achievement.created_at,
					updatedAt: item.achievement.updated_at,
				},
				unlockedAt: item.unlocked_at,
			}));
		} catch (error) {
			console.error("Error getting recent achievements:", error);
			return [];
		}
	}
}

// Export singleton instance
export const achievementManager = new AchievementManager();

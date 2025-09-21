import { supabaseService } from "@/lib/supabase-client";
import type { DatabaseUser } from "@/types/whop";

// XP calculation constants
export const XP_CONSTANTS = {
	BASE_XP_PER_REFERRAL: 100,
	XP_PER_DOLLAR: 10,
	COMPLETION_BONUS_MULTIPLIER: 1.5,
	LEVEL_MULTIPLIER: 1.15,
};

// Calculate XP for a completed referral
export const calculateXPForReferral = (
	commissionAmount: number,
	paymentAmount: number,
): number => {
	// Base XP from the referral
	let xp = XP_CONSTANTS.BASE_XP_PER_REFERRAL;

	// Additional XP based on commission amount
	xp += commissionAmount * XP_CONSTANTS.XP_PER_DOLLAR;

	// Bonus XP based on payment amount (if available)
	if (paymentAmount > 0) {
		xp += paymentAmount * XP_CONSTANTS.XP_PER_DOLLAR * 0.5;
	}

	// Apply completion bonus
	xp *= XP_CONSTANTS.COMPLETION_BONUS_MULTIPLIER;

	return Math.round(xp);
};

// Calculate user level based on XP
export const calculateLevel = (xp: number): number => {
	if (xp <= 0) return 1;

	let level = 1;
	let xpRequired = 100;

	while (xp >= xpRequired) {
		level++;
		xpRequired = Math.floor(xpRequired * XP_CONSTANTS.LEVEL_MULTIPLIER);
	}

	return level - 1;
};

// Calculate XP required for next level
export const getXPForNextLevel = (currentLevel: number): number => {
	if (currentLevel <= 0) return 100;

	let xpRequired = 100;
	for (let i = 1; i < currentLevel; i++) {
		xpRequired = Math.floor(xpRequired * XP_CONSTANTS.LEVEL_MULTIPLIER);
	}

	return xpRequired;
};

// Calculate XP progress to next level
export const getXPProgress = (
	user: DatabaseUser,
): {
	currentXP: number;
	nextLevelXP: number;
	progressPercentage: number;
	currentLevel: number;
} => {
	const currentLevel = calculateLevel(user.experience_points);
	const nextLevelXP = getXPForNextLevel(currentLevel);
	const currentLevelXP = getXPForNextLevel(currentLevel - 1);
	const progressXP = user.experience_points - currentLevelXP;
	const progressPercentage = Math.round(
		(progressXP / (nextLevelXP - currentLevelXP)) * 100,
	);

	return {
		currentXP: user.experience_points,
		nextLevelXP,
		progressPercentage,
		currentLevel,
	};
};

// Apply character class XP multiplier
export const applyCharacterClassMultiplier = (
	baseXP: number,
	characterClass: DatabaseUser["character_class"],
): number => {
	const multipliers = {
		scout: 1.2,
		sage: 1.1,
		champion: 1.3,
	};

	const multiplier = multipliers[characterClass] || 1.0;
	return Math.round(baseXP * multiplier);
};

// Calculate total XP including all bonuses
export const calculateTotalXP = (
	baseXP: number,
	characterClass: DatabaseUser["character_class"],
	bonuses: {
		questBonus?: number;
		guildBonus?: number;
		achievementBonus?: number;
	} = {},
): number => {
	let totalXP = baseXP;

	// Apply character class multiplier
	totalXP = applyCharacterClassMultiplier(totalXP, characterClass);

	// Apply additional bonuses
	if (bonuses.questBonus) totalXP += bonuses.questBonus;
	if (bonuses.guildBonus) totalXP = Math.round(totalXP * bonuses.guildBonus);
	if (bonuses.achievementBonus) totalXP += bonuses.achievementBonus;

	return totalXP;
};

// Check if user should level up and handle level up rewards
export const checkLevelUp = async (
	userId: string,
	newXPGained: number,
): Promise<{
	leveledUp: boolean;
	newLevel: number;
	rewards: string[];
}> => {
	// Get current user data
	const { data: user, error: userError } = await supabaseService()
		.from("users")
		.select("experience_points, level, character_class")
		.eq("id", userId)
		.single();

	if (userError || !user) {
		throw new Error("User not found");
	}

	const newTotalXP = user.experience_points + newXPGained;
	const newLevel = calculateLevel(newTotalXP);
	const oldLevel = user.level;

	if (newLevel > oldLevel) {
		// User leveled up!
		const rewards = await getLevelUpRewards(newLevel, user.character_class);

		// Update user level
		await supabaseService()
			.from("users")
			.update({ level: newLevel })
			.eq("id", userId);

		console.log(`User ${userId} leveled up from ${oldLevel} to ${newLevel}`);

		return {
			leveledUp: true,
			newLevel,
			rewards,
		};
	}

	return {
		leveledUp: false,
		newLevel: oldLevel,
		rewards: [],
	};
};

// Get rewards for leveling up
const getLevelUpRewards = async (
	level: number,
	characterClass: DatabaseUser["character_class"],
): Promise<string[]> => {
	const rewards: string[] = [];

	// Base rewards for certain levels
	if (level === 5) rewards.push("Achievement: Level 5 Reached");
	if (level === 10) rewards.push("Achievement: Level 10 Reached");
	if (level === 25) rewards.push("Achievement: Level 25 Reached");
	if (level === 50) rewards.push("Achievement: Level 50 Reached");

	// Character class specific rewards
	if (level === 15) {
		rewards.push(`${characterClass} ability unlocked`);
	}

	if (level === 30) {
		rewards.push(`${characterClass} mastery bonus`);
	}

	return rewards;
};

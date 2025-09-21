import { supabaseService, type Database } from "@/lib/supabase-client";
import { calculateLevel, checkLevelUp } from "@/lib/xp-calculator";
import { type DatabaseUser, UserUpdateData } from "@/types/whop";

// Create or update user profile from webhook data
export const createOrUpdateUser = async (
	userId: string,
	userData: {
		username?: string;
		email?: string;
		avatar_url?: string;
		whop_user_id?: string;
	},
): Promise<DatabaseUser> => {
	try {
		// Check if user exists
		const { data: existingUser, error: fetchError } = await supabaseService()
			.from("users")
			.select("*")
			.eq("id", userId)
			.single();

		if (fetchError && fetchError.code !== "PGRST116") {
			throw fetchError;
		}

		if (existingUser) {
			// Update existing user
			const { data: updatedUser, error: updateError } = await supabaseService()
				.from("users")
				.update({
					username: userData.username || existingUser.username,
					email: userData.email || existingUser.email,
					avatar_url: userData.avatar_url || existingUser.avatar_url,
					whop_user_id: userData.whop_user_id || existingUser.whop_user_id,
					updated_at: new Date().toISOString(),
				})
				.eq("id", userId)
				.select()
				.single();

			if (updateError) throw updateError;
			return updatedUser;
		}
		// Create new user with default character class
		const { data: newUser, error: insertError } = await supabaseService()
			.from("users")
			.insert({
				id: userId,
				username: userData.username || `user_${userId.slice(0, 8)}`,
				email: userData.email,
				avatar_url: userData.avatar_url,
				whop_user_id: userData.whop_user_id,
				character_class: "scout", // Default character class
				level: 1,
				experience_points: 0,
				total_referrals: 0,
				total_commission: 0,
				guild_id: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.select()
			.single();

		if (insertError) throw insertError;
		return newUser;
	} catch (error) {
		console.error("Error in createOrUpdateUser:", error);
		throw error;
	}
};

// Update user stats with XP, referrals, and commission
export const updateUserStats = async (
	userId: string,
	updates: {
		experience_points?: number;
		total_referrals?: number;
		total_commission?: number;
	},
): Promise<{ success: boolean; levelUp?: { oldLevel: number; newLevel: number; xpGained: number }; newStats?: Database["public"]["Tables"]["users"]["Row"] }> => {
	try {
		// Get current user stats
		const { data: currentUser, error: fetchError } = await supabaseService()
			.from("users")
			.select("experience_points, total_referrals, total_commission, level")
			.eq("id", userId)
			.single();

		if (fetchError) throw fetchError;

		// Calculate new values
		const newXP =
			(currentUser.experience_points || 0) + (updates.experience_points || 0);
		const newReferrals =
			(currentUser.total_referrals || 0) + (updates.total_referrals || 0);
		const newCommission =
			(currentUser.total_commission || 0) + (updates.total_commission || 0);

		// Update user stats
		const { data: updatedUser, error: updateError } = await supabaseService()
			.from("users")
			.update({
				experience_points: newXP,
				total_referrals: newReferrals,
				total_commission: newCommission,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId)
			.select()
			.single();

		if (updateError) throw updateError;

		// Check for level up
		const levelUpResult = await checkLevelUp(
			userId,
			updates.experience_points || 0,
		);

		return {
			success: true,
			levelUp: levelUpResult.leveledUp ? levelUpResult : undefined,
			newStats: updatedUser,
		};
	} catch (error) {
		console.error("Error in updateUserStats:", error);
		throw error;
	}
};

// Check and unlock achievements based on user stats
export const checkAndUnlockAchievements = async (
	userId: string,
): Promise<string[]> => {
	try {
		const unlockedAchievements: string[] = [];

		// Get current user stats
		const { data: user, error: userError } = await supabaseService()
			.from("users")
			.select("total_referrals, total_commission, level")
			.eq("id", userId)
			.single();

		if (userError) throw userError;

		// Get existing achievements
		const { data: existingAchievements, error: achievementError } =
			await supabaseService()
				.from("user_achievements")
				.select("achievement_id")
				.eq("user_id", userId);

		if (achievementError) throw achievementError;

		const existingIds =
			existingAchievements?.map((a: Database["public"]["Tables"]["user_achievements"]["Row"]) => a.achievement_id) || [];

		// Check referral-based achievements
		if (user.total_referrals >= 1 && !existingIds.includes("first_referral")) {
			await unlockAchievement(userId, "first_referral");
			unlockedAchievements.push("First Referral");
		}

		if (user.total_referrals >= 10 && !existingIds.includes("ten_referrals")) {
			await unlockAchievement(userId, "ten_referrals");
			unlockedAchievements.push("Ten Referrals");
		}

		if (
			user.total_referrals >= 50 &&
			!existingIds.includes("fifty_referrals")
		) {
			await unlockAchievement(userId, "fifty_referrals");
			unlockedAchievements.push("Fifty Referrals");
		}

		// Check commission-based achievements
		if (
			user.total_commission >= 100 &&
			!existingIds.includes("commission_100")
		) {
			await unlockAchievement(userId, "commission_100");
			unlockedAchievements.push("$100 Commission");
		}

		if (
			user.total_commission >= 1000 &&
			!existingIds.includes("commission_1000")
		) {
			await unlockAchievement(userId, "commission_1000");
			unlockedAchievements.push("$1000 Commission");
		}

		// Check level-based achievements
		if (user.level >= 5 && !existingIds.includes("level_5")) {
			await unlockAchievement(userId, "level_5");
			unlockedAchievements.push("Level 5");
		}

		if (user.level >= 10 && !existingIds.includes("level_10")) {
			await unlockAchievement(userId, "level_10");
			unlockedAchievements.push("Level 10");
		}

		return unlockedAchievements;
	} catch (error) {
		console.error("Error in checkAndUnlockAchievements:", error);
		throw error;
	}
};

// Helper function to unlock an achievement
const unlockAchievement = async (userId: string, achievementId: string) => {
	try {
		// Get achievement details
		const { data: achievement, error: achievementError } =
			await supabaseService()
				.from("achievements")
				.select("xp_reward, title, description")
				.eq("id", achievementId)
				.single();

		if (achievementError) throw achievementError;

		// Award the achievement
		const { error: insertError } = await supabaseService()
			.from("user_achievements")
			.insert({
				user_id: userId,
				achievement_id: achievementId,
				unlocked_at: new Date().toISOString(),
			});

		if (insertError) throw insertError;

		// Award XP reward
		if (achievement.xp_reward > 0) {
			await updateUserStats(userId, {
				experience_points: achievement.xp_reward,
			});
		}

		console.log(`User ${userId} unlocked achievement: ${achievement.title}`);
	} catch (error) {
		console.error("Error unlocking achievement:", error);
		throw error;
	}
};

// Get user referral history
export const getUserReferralHistory = async (
	userId: string,
	limit = 10,
	offset = 0,
) => {
	try {
		const { data: referrals, error } = await supabaseService()
			.from("referrals")
			.select(`
        *,
        referred_user:users!referrals_referred_id_fkey (
          username,
          avatar_url
        )
      `)
			.eq("referrer_id", userId)
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) throw error;

		return referrals;
	} catch (error) {
		console.error("Error getting user referral history:", error);
		throw error;
	}
};

// Get user achievements
export const getUserAchievements = async (userId: string) => {
	try {
		const { data: achievements, error } = await supabaseService()
			.from("user_achievements")
			.select(`
        *,
        achievement:achievements (
          title,
          description,
          icon,
          category,
          xp_reward
        )
      `)
			.eq("user_id", userId)
			.order("unlocked_at", { ascending: false });

		if (error) throw error;

		return achievements;
	} catch (error) {
		console.error("Error getting user achievements:", error);
		throw error;
	}
};

// Get user leaderboard ranking
export const getUserLeaderboardRank = async (userId: string) => {
	try {
		// Get user's current XP
		const { data: user, error: userError } = await supabaseService()
			.from("users")
			.select("experience_points")
			.eq("id", userId)
			.single();

		if (userError) throw userError;

		// Count users with higher XP
		const { data: higherRankedUsers, error: rankError } =
			await supabaseService()
				.from("users")
				.select("id", { count: "exact", head: true })
				.gt("experience_points", user.experience_points);

		if (rankError) throw rankError;

		// Rank is count of users with higher XP + 1
		const rank = (higherRankedUsers?.length || 0) + 1;

		return rank;
	} catch (error) {
		console.error("Error getting user leaderboard rank:", error);
		throw error;
	}
};

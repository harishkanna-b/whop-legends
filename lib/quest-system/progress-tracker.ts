import { supabase, type Database } from "@/lib/supabase-client";
import type {
	QuestProgress,
	QuestStatus,
	UserQuest,
} from "@/lib/types/quest-types";
import type { RealtimeChannel } from "@supabase/supabase-js";

export class ProgressTracker {
	private static realtimeChannels: Map<string, RealtimeChannel> = new Map();

	/**
	 * Track quest progress for a user with real-time updates
	 */
	static async trackUserProgress(
		userId: string,
		callback: (progress: QuestProgress[]) => void,
	): Promise<RealtimeChannel> {
		const channel = supabase()
			.channel(`user_progress_${userId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "user_quests",
					filter: `user_id=eq.${userId}`,
				},
				async (payload: Database["public"]["Tables"]["user_quests"]["Row"]) => {
					const progress = await ProgressTracker.getUserQuestProgress(userId);
					callback(progress);
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "users",
					filter: `id=eq.${userId}`,
				},
				async (payload: Database["public"]["Tables"]["user_quests"]["Row"]) => {
					const progress = await ProgressTracker.getUserQuestProgress(userId);
					callback(progress);
				},
			)
			.subscribe();

		ProgressTracker.realtimeChannels.set(userId, channel);

		// Send initial progress
		const initialProgress = await ProgressTracker.getUserQuestProgress(userId);
		callback(initialProgress);

		return channel;
	}

	/**
	 * Stop tracking progress for a user
	 */
	static stopTracking(userId: string): void {
		const channel = ProgressTracker.realtimeChannels.get(userId);
		if (channel) {
			supabase().removeChannel(channel);
			ProgressTracker.realtimeChannels.delete(userId);
		}
	}

	/**
	 * Get current quest progress for a user
	 */
	static async getUserQuestProgress(userId: string): Promise<QuestProgress[]> {
		const { data: userQuests, error } = await supabase()
			.from("user_quests")
			.select(`
        *,
        quest:quests(*)
      `)
			.eq("user_id", userId)
			.eq("is_completed", false);

		if (error) {
			console.error("Error fetching user quests for progress:", error);
			return [];
		}

		const userStats = await ProgressTracker.getUserStats(userId);

		return userQuests.map((userQuest: any) => {
			const current_value = ProgressTracker.calculateCurrentProgress(
				userQuest.quest!,
				userStats,
			);
			const percentage = Math.min(
				(current_value / userQuest.quest?.target_value) * 100,
				100,
			);

			let time_remaining: string | undefined;
			if (userQuest.quest?.end_date) {
				const end = new Date(userQuest.quest?.end_date);
				const now = new Date();
				const diff = end.getTime() - now.getTime();

				if (diff > 0) {
					const days = Math.floor(diff / (1000 * 60 * 60 * 24));
					const hours = Math.floor(
						(diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
					);
					const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

					if (days > 0) {
						time_remaining = `${days}d ${hours}h`;
					} else if (hours > 0) {
						time_remaining = `${hours}h ${minutes}m`;
					} else {
						time_remaining = `${minutes}m`;
					}
				}
			}

			return {
				quest_id: userQuest.quest_id,
				user_id: userId,
				current_progress: current_value,
				target_value: userQuest.quest?.target_value,
				percentage_complete: percentage,
				status:
					percentage >= 100
						? ("completed" as QuestStatus)
						: (userQuest.status as QuestStatus),
				time_remaining: time_remaining
					? Number.parseInt(time_remaining) * 60
					: undefined, // convert minutes to seconds
			};
		});
	}

	/**
	 * Update progress for multiple quests at once
	 */
	static async bulkUpdateProgress(
		userId: string,
		questIds: string[],
	): Promise<void> {
		const userStats = await ProgressTracker.getUserStats(userId);

		for (const questId of questIds) {
			const { data: userQuest, error } = await supabase()
				.from("user_quests")
				.select("*, quest:quests(*)")
				.eq("id", questId)
				.eq("user_id", userId)
				.single();

			if (error || !userQuest) {
				continue;
			}

			const currentProgress = ProgressTracker.calculateCurrentProgress(
				userQuest.quest!,
				userStats,
			);
			const isCompleted = currentProgress >= userQuest.quest?.target_value;

			await supabase()
				.from("user_quests")
				.update({
					progress_value: currentProgress,
					is_completed: isCompleted,
					completed_at: isCompleted ? new Date().toISOString() : null,
					updated_at: new Date().toISOString(),
				})
				.eq("id", questId);
		}
	}

	/**
	 * Check for quest completion and trigger rewards
	 */
	static async checkQuestCompletions(userId: string): Promise<UserQuest[]> {
		const { data: completedQuests, error } = await supabase()
			.from("user_quests")
			.select(`
        *,
        quest:quests(*)
      `)
			.eq("user_id", userId)
			.eq("is_completed", true)
			.eq("reward_claimed", false);

		if (error || !completedQuests) {
			return [];
		}

		const newlyCompleted: UserQuest[] = [];

		for (const userQuest of completedQuests) {
			if (
				userQuest.quest?.reward_xp > 0 ||
				userQuest.quest?.reward_commission > 0
			) {
				newlyCompleted.push(userQuest);
			}
		}

		return newlyCompleted;
	}

	/**
	 * Get progress summary for a user
	 */
	static async getProgressSummary(userId: string): Promise<{
		total_quests: number;
		completed_quests: number;
		in_progress_quests: number;
		completion_rate: number;
		total_xp_earned: number;
		total_commission_earned: number;
		current_streak: number;
	}> {
		const { data: userQuests, error } = await supabase()
			.from("user_quests")
			.select("*")
			.eq("user_id", userId);

		if (error || !userQuests) {
			return {
				total_quests: 0,
				completed_quests: 0,
				in_progress_quests: 0,
				completion_rate: 0,
				total_xp_earned: 0,
				total_commission_earned: 0,
				current_streak: 0,
			};
		}

		const completedQuests = userQuests.filter((q: any) => q.is_completed);
		const inProgressQuests = userQuests.filter((q: any) => !q.is_completed);

		// Calculate rewards from completed quests (would need to join with quests table)
		const total_xp_earned = completedQuests.reduce(
			(sum: number, q: any) => sum + 100,
			0,
		); // Placeholder
		const total_commission_earned = completedQuests.reduce(
			(sum: number, q: any) => sum + 5,
			0,
		); // Placeholder

		return {
			total_quests: userQuests.length,
			completed_quests: completedQuests.length,
			in_progress_quests: inProgressQuests.length,
			completion_rate:
				userQuests.length > 0
					? (completedQuests.length / userQuests.length) * 100
					: 0,
			total_xp_earned,
			total_commission_earned,
			current_streak: ProgressTracker.calculateCurrentStreak(completedQuests),
		};
	}

	/**
	 * Get quest progress history for analytics
	 */
	static async getProgressHistory(
		userId: string,
		days = 30,
	): Promise<
		{
			date: string;
			completed_quests: number;
			total_progress: number;
		}[]
	> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		const { data: userQuests, error } = await supabase()
			.from("user_quests")
			.select("*")
			.eq("user_id", userId)
			.gte("created_at", cutoffDate.toISOString())
			.order("created_at", { ascending: true });

		if (error || !userQuests) {
			return [];
		}

		// Group by date
		const history: Record<
			string,
			{ completed_quests: number; total_progress: number }
		> = {};

		userQuests.forEach((userQuest: any) => {
			const date = new Date(userQuest.created_at).toISOString().split("T")[0];

			if (!history[date]) {
				history[date] = {
					completed_quests: 0,
					total_progress: 0,
				};
			}

			history[date].total_progress += userQuest.progress_value;

			if (userQuest.is_completed) {
				history[date].completed_quests += 1;
			}
		});

		return Object.entries(history).map(([date, stats]) => ({
			date,
			completed_quests: stats.completed_quests,
			total_progress: stats.total_progress,
		}));
	}

	/**
	 * Auto-expire quests that have passed their end date
	 */
	static async expireOverdueQuests(): Promise<void> {
		const now = new Date().toISOString();

		// Use a more direct approach to avoid JSON path issues
		const { data: overdueQuests, error } = await supabase().rpc(
			"expire_overdue_quests",
			{ current_time: now },
		);

		if (error) {
			console.error("Error expiring overdue quests:", error);
			// Fallback to manual processing if RPC doesn't exist
			await ProgressTracker.expireOverdueQuestsFallback(now);
		} else {
			console.log(`Expired ${overdueQuests?.length || 0} overdue quests`);
		}
	}

	/**
	 * Fallback method for expiring overdue quests
	 */
	private static async expireOverdueQuestsFallback(now: string): Promise<void> {
		try {
			// Get user quests with their quest end dates
			const { data: userQuests, error } = await supabase()
				.from("user_quests")
				.select(`
          *,
          quest:end_date
        `)
				.eq("is_completed", false);

			if (error || !userQuests) {
				return;
			}

			// Filter and update in application logic
			const overdueQuests = userQuests.filter(
				(uq: any) => uq.quest && new Date(uq.quest.end_date) < new Date(now),
			);

			for (const quest of overdueQuests) {
				await supabase()
					.from("user_quests")
					.update({
						is_completed: true,
						completed_at: now,
						updated_at: now,
					})
					.eq("id", quest.id);
			}

			console.log(
				`Expired ${overdueQuests.length} overdue quests (fallback method)`,
			);
		} catch (error) {
			console.error("Error in fallback quest expiration:", error);
		}
	}

	// Private helper methods
	private static async getUserStats(userId: string): Promise<any> {
		const { data: user, error } = await supabase()
			.from("users")
			.select("*")
			.eq("id", userId)
			.single();

		if (error || !user) {
			return {};
		}

		return user;
	}

	private static calculateCurrentProgress(quest: any, userStats: any): number {
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

	private static calculateCurrentStreak(completedQuests: any[]): number {
		if (completedQuests.length === 0) return 0;

		const sortedQuests = completedQuests.sort(
			(a: any, b: any) =>
				new Date(b.completed_at || b.updated_at).getTime() -
				new Date(a.completed_at || a.updated_at).getTime(),
		);

		let streak = 0;
		let currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);

		for (const quest of sortedQuests) {
			const questDate = new Date(quest.completed_at || quest.updated_at);
			questDate.setHours(0, 0, 0, 0);

			const diffDays = Math.floor(
				(currentDate.getTime() - questDate.getTime()) / (1000 * 60 * 60 * 24),
			);

			if (diffDays === 0 || diffDays === 1) {
				streak++;
				currentDate = questDate;
			} else {
				break;
			}
		}

		return streak;
	}

	/**
	 * Clean up old quest progress data
	 */
	static async cleanupOldData(daysToKeep = 90): Promise<void> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

		const { error } = await supabase()
			.from("user_quests")
			.delete()
			.lt("created_at", cutoffDate.toISOString())
			.eq("is_completed", true)
			.eq("reward_claimed", true);

		if (error) {
			console.error("Error cleaning up old quest data:", error);
		} else {
			console.log("Cleaned up old quest data");
		}
	}
}

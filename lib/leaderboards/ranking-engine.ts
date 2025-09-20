import { supabase } from "@/lib/supabase-client";
import { SecurityValidator, ValidationError } from "@/lib/security/validation";

export interface RankingEntry {
  id: string;
  user_id: string;
  username: string;
  avatar?: string;
  character_class: string;
  level: number;
  rank: number;
  score: number;
  previous_rank?: number;
  change?: "up" | "down" | "new" | "same";
  metrics: {
    total_referrals: number;
    total_commission: number;
    conversion_rate: number;
    engagement_score: number;
    quest_completion_rate: number;
    retention_rate: number;
  };
  badges: string[];
  join_date: string;
  last_active: string;
}

export interface LeaderboardConfig {
  id: string;
  name: string;
  description: string;
  category:
    | "overall"
    | "referrals"
    | "commission"
    | "engagement"
    | "quests"
    | "retention";
  timeframe: "daily" | "weekly" | "monthly" | "all_time";
  scoring_method: "weighted" | "simple" | "percentile";
  weights?: {
    referrals?: number;
    commission?: number;
    engagement?: number;
    quests?: number;
    retention?: number;
  };
  filters?: {
    min_level?: number;
    character_classes?: string[];
    min_activity?: number;
  };
  max_entries?: number;
  reset_schedule?: string;
  enabled: boolean;
}

export interface RankingHistory {
  id: string;
  user_id: string;
  leaderboard_id: string;
  rank: number;
  score: number;
  date: string;
  metrics: any;
}

export class RankingEngine {
  private readonly CHARACTER_CLASS_MULTIPLIERS = {
    scout: 1.2,
    sage: 1.5,
    champion: 1.3,
    merchant: 1.1,
  };

  private readonly TIMEFRAME_WEIGHTS = {
    daily: { recent: 0.8, medium: 0.15, old: 0.05 },
    weekly: { recent: 0.6, medium: 0.3, old: 0.1 },
    monthly: { recent: 0.4, medium: 0.4, old: 0.2 },
    all_time: { recent: 0.2, medium: 0.3, old: 0.5 },
  };

  async calculateLeaderboard(
    config: LeaderboardConfig,
  ): Promise<RankingEntry[]> {
    // Validate config parameters
    const companyId = config.id.split("_")[0];
    const companyValidation = SecurityValidator.validateCompanyId(companyId);
    if (!companyValidation.isValid) {
      throw new ValidationError(
        `Invalid company ID: ${companyValidation.errors?.join(", ")}`,
        "company_id",
      );
    }

    // Validate leaderboard category
    const validCategories = [
      "overall",
      "referrals",
      "commission",
      "engagement",
      "quests",
      "retention",
    ];
    if (!validCategories.includes(config.category)) {
      throw new ValidationError(
        `Invalid category: ${config.category}`,
        "category",
      );
    }

    // Validate timeframe
    const validTimeframes = ["daily", "weekly", "monthly", "all_time"];
    if (!validTimeframes.includes(config.timeframe)) {
      throw new ValidationError(
        `Invalid timeframe: ${config.timeframe}`,
        "timeframe",
      );
    }

    const { data: members, error } = await supabase
      .from("member_performance_stats")
      .select("*")
      .eq("company_id", companyId);

    if (error) throw error;

    if (!members || members.length === 0) {
      return [];
    }

    // Apply filters
    let filteredMembers = members.filter((member) => {
      if (
        config.filters?.min_level &&
        (member.level || 0) < config.filters.min_level
      ) {
        return false;
      }
      if (
        config.filters?.character_classes &&
        !config.filters.character_classes.includes(member.character_class)
      ) {
        return false;
      }
      if (
        config.filters?.min_activity &&
        (member.engagement_score || 0) < config.filters.min_activity
      ) {
        return false;
      }
      return true;
    });

    // Calculate scores based on category
    const scoredMembers = filteredMembers.map((member) => {
      const baseScore = this.calculateCategoryScore(member, config);
      const classMultiplier =
        this.CHARACTER_CLASS_MULTIPLIERS[
          member.character_class as keyof typeof this.CHARACTER_CLASS_MULTIPLIERS
        ] || 1;
      const timeframeWeight = this.getTimeframeWeight(member, config.timeframe);

      return {
        ...member,
        score: baseScore * classMultiplier * timeframeWeight,
      };
    });

    // Sort by score and assign ranks
    scoredMembers.sort((a, b) => b.score - a.score);

    // Get previous ranks for change calculation
    const previousRanks = await this.getPreviousRanks(
      config.id,
      scoredMembers.map((m) => m.user_id),
    );

    // Create ranking entries
    const rankingEntries: RankingEntry[] = scoredMembers.map(
      (member, index) => {
        const currentRank = index + 1;
        const previousRank = previousRanks[member.user_id];
        let change: "up" | "down" | "new" | "same" = "same";

        if (!previousRank) {
          change = "new";
        } else if (previousRank > currentRank) {
          change = "up";
        } else if (previousRank < currentRank) {
          change = "down";
        }

        return {
          id: `${config.id}_${member.user_id}`,
          user_id: member.user_id,
          username: member.username,
          avatar: member.avatar,
          character_class: member.character_class,
          level: member.level || 1,
          rank: currentRank,
          score: member.score,
          previous_rank: previousRank,
          change,
          metrics: {
            total_referrals: member.total_referrals || 0,
            total_commission: member.total_commission || 0,
            conversion_rate: member.conversion_rate || 0,
            engagement_score: member.engagement_score || 0,
            quest_completion_rate: member.quest_completion_rate || 0,
            retention_rate: member.retention_rate || 0,
          },
          badges: [], // Will be populated from achievements
          join_date: member.join_date,
          last_active: member.last_active,
        };
      },
    );

    // Limit entries if specified
    if (config.max_entries) {
      return rankingEntries.slice(0, config.max_entries);
    }

    return rankingEntries;
  }

  private calculateCategoryScore(
    member: any,
    config: LeaderboardConfig,
  ): number {
    const weights = config.weights || this.getDefaultWeights(config.category);

    switch (config.category) {
      case "referrals":
        return (member.total_referrals || 0) * (weights.referrals || 1);

      case "commission":
        return (member.total_commission || 0) * (weights.commission || 1);

      case "engagement":
        return (member.engagement_score || 0) * (weights.engagement || 1);

      case "quests":
        return (member.quest_completion_rate || 0) * (weights.quests || 1);

      case "retention":
        return (member.retention_rate || 0) * (weights.retention || 1);

      case "overall":
      default:
        return this.calculateOverallScore(member, weights);
    }
  }

  private calculateOverallScore(member: any, weights: any): number {
    return (
      (member.total_referrals || 0) * (weights.referrals || 0.3) +
      (member.total_commission || 0) * (weights.commission || 0.4) +
      (member.engagement_score || 0) * (weights.engagement || 0.2) +
      (member.quest_completion_rate || 0) * (weights.quests || 0.1) +
      (member.retention_rate || 0) * (weights.retention || 0.1)
    );
  }

  private getDefaultWeights(category: string): any {
    switch (category) {
      case "referrals":
        return {
          referrals: 1,
          commission: 0,
          engagement: 0,
          quests: 0,
          retention: 0,
        };
      case "commission":
        return {
          referrals: 0,
          commission: 1,
          engagement: 0,
          quests: 0,
          retention: 0,
        };
      case "engagement":
        return {
          referrals: 0,
          commission: 0,
          engagement: 1,
          quests: 0,
          retention: 0,
        };
      case "quests":
        return {
          referrals: 0,
          commission: 0,
          engagement: 0,
          quests: 1,
          retention: 0,
        };
      case "retention":
        return {
          referrals: 0,
          commission: 0,
          engagement: 0,
          quests: 0,
          retention: 1,
        };
      default:
        return {
          referrals: 0.3,
          commission: 0.4,
          engagement: 0.2,
          quests: 0.1,
          retention: 0.1,
        };
    }
  }

  private getTimeframeWeight(member: any, timeframe: string): number {
    // This would calculate weight based on recent activity vs timeframe
    // For now, return 1.0
    return 1.0;
  }

  private async getPreviousRanks(
    leaderboardId: string,
    userIds: string[],
  ): Promise<Record<string, number>> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: history, error } = await supabase
      .from("ranking_history")
      .select("user_id, rank")
      .eq("leaderboard_id", leaderboardId)
      .gte("date", yesterday.toISOString())
      .in("user_id", userIds);

    if (error) return {};

    const ranks: Record<string, number> = {};
    history?.forEach((entry) => {
      ranks[entry.user_id] = entry.rank;
    });

    return ranks;
  }

  async saveRankingHistory(
    leaderboardId: string,
    entries: RankingEntry[],
  ): Promise<void> {
    const historyRecords = entries.map((entry) => ({
      leaderboard_id: leaderboardId,
      user_id: entry.user_id,
      rank: entry.rank,
      score: entry.score,
      date: new Date().toISOString(),
      metrics: entry.metrics,
    }));

    const { error } = await supabase
      .from("ranking_history")
      .insert(historyRecords);

    if (error) {
      console.error("Error saving ranking history:", error);
    }
  }

  async getUserRankings(
    userId: string,
    companyIds: string[],
  ): Promise<Record<string, any>> {
    const rankings: Record<string, any> = {};

    for (const companyId of companyIds) {
      const configs = await this.getLeaderboardConfigs(companyId);

      for (const config of configs) {
        if (!config.enabled) continue;

        const entries = await this.calculateLeaderboard(config);
        const userEntry = entries.find((e) => e.user_id === userId);

        if (userEntry) {
          rankings[config.id] = {
            rank: userEntry.rank,
            score: userEntry.score,
            change: userEntry.change,
            total_participants: entries.length,
            percentile:
              ((entries.length - userEntry.rank) / entries.length) * 100,
          };
        }
      }
    }

    return rankings;
  }

  async getLeaderboardConfigs(companyId: string): Promise<LeaderboardConfig[]> {
    const defaultConfigs: LeaderboardConfig[] = [
      {
        id: `${companyId}_overall_daily`,
        name: "Daily Overall",
        description: "Top performers across all metrics today",
        category: "overall",
        timeframe: "daily",
        scoring_method: "weighted",
        max_entries: 100,
        enabled: true,
      },
      {
        id: `${companyId}_overall_weekly`,
        name: "Weekly Overall",
        description: "Top performers across all metrics this week",
        category: "overall",
        timeframe: "weekly",
        scoring_method: "weighted",
        max_entries: 100,
        enabled: true,
      },
      {
        id: `${companyId}_referrals_monthly`,
        name: "Monthly Referrals",
        description: "Top referrers this month",
        category: "referrals",
        timeframe: "monthly",
        scoring_method: "simple",
        max_entries: 50,
        enabled: true,
      },
      {
        id: `${companyId}_commission_all_time`,
        name: "All-Time Commission",
        description: "Highest commission earners of all time",
        category: "commission",
        timeframe: "all_time",
        scoring_method: "simple",
        max_entries: 100,
        enabled: true,
      },
      {
        id: `${companyId}_engagement_weekly`,
        name: "Weekly Engagement",
        description: "Most engaged members this week",
        category: "engagement",
        timeframe: "weekly",
        scoring_method: "simple",
        max_entries: 50,
        enabled: true,
      },
    ];

    // In a real implementation, you'd fetch these from the database
    return defaultConfigs;
  }

  async getRankingHistory(
    userId: string,
    leaderboardId: string,
    days: number = 30,
  ): Promise<RankingHistory[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: history, error } = await supabase
      .from("ranking_history")
      .select("*")
      .eq("user_id", userId)
      .eq("leaderboard_id", leaderboardId)
      .gte("date", startDate.toISOString())
      .order("date", { ascending: true });

    if (error) throw error;

    return history || [];
  }

  async getLeaderboardStatistics(leaderboardId: string): Promise<{
    total_entries: number;
    average_score: number;
    top_score: number;
    score_distribution: any[];
    class_distribution: any[];
    recent_activity: any[];
  }> {
    const entries = await this.calculateLeaderboard({
      id: leaderboardId,
      name: "",
      description: "",
      category: "overall",
      timeframe: "weekly",
      scoring_method: "weighted",
      enabled: true,
    });

    if (entries.length === 0) {
      return {
        total_entries: 0,
        average_score: 0,
        top_score: 0,
        score_distribution: [],
        class_distribution: [],
        recent_activity: [],
      };
    }

    const scores = entries.map((e) => e.score);
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const topScore = Math.max(...scores);

    // Calculate score distribution
    const scoreRanges = [
      { min: 0, max: averageScore * 0.5, label: "Low" },
      { min: averageScore * 0.5, max: averageScore, label: "Medium" },
      { min: averageScore, max: averageScore * 1.5, label: "High" },
      { min: averageScore * 1.5, max: Infinity, label: "Top" },
    ];

    const score_distribution = scoreRanges.map((range) => ({
      range: range.label,
      count: entries.filter((e) => e.score >= range.min && e.score < range.max)
        .length,
      percentage:
        (entries.filter((e) => e.score >= range.min && e.score < range.max)
          .length /
          entries.length) *
        100,
    }));

    // Calculate class distribution
    const classCounts = entries.reduce(
      (acc, entry) => {
        acc[entry.character_class] = (acc[entry.character_class] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const class_distribution = Object.entries(classCounts).map(
      ([cls, count]) => ({
        class: cls,
        count,
        percentage: (count / entries.length) * 100,
      }),
    );

    // Get recent activity (mock data)
    const recent_activity = entries.slice(0, 10).map((entry) => ({
      user_id: entry.user_id,
      username: entry.username,
      action: "rank_change",
      value: entry.change,
      timestamp: entry.last_active,
    }));

    return {
      total_entries: entries.length,
      average_score: Math.round(averageScore),
      top_score: Math.round(topScore),
      score_distribution,
      class_distribution,
      recent_activity,
    };
  }

  async refreshLeaderboard(leaderboardId: string): Promise<RankingEntry[]> {
    const config = await this.getLeaderboardConfig(leaderboardId);
    if (!config) {
      throw new Error("Leaderboard config not found");
    }

    const entries = await this.calculateLeaderboard(config);
    await this.saveRankingHistory(leaderboardId, entries);

    return entries;
  }

  private async getLeaderboardConfig(
    leaderboardId: string,
  ): Promise<LeaderboardConfig | null> {
    const companyId = leaderboardId.split("_")[0];
    const configs = await this.getLeaderboardConfigs(companyId);
    return configs.find((c) => c.id === leaderboardId) || null;
  }
}

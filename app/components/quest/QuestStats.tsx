"use client";

import React, { useState, useEffect } from "react";

interface QuestStatsProps {
	userId: string;
}

interface Stats {
	total_quests: number;
	completed_quests: number;
	in_progress_quests: number;
	completion_rate: number;
	total_xp_earned: number;
	total_commission_earned: number;
	current_streak: number;
}

interface RewardStats {
	total_xp_earned: number;
	total_commission_earned: number;
	total_quests_completed: number;
	average_xp_per_quest: number;
	average_commission_per_quest: number;
	most_profitable_quest_type: string;
	reward_streak: number;
}

interface ProgressHistory {
	date: string;
	completed_quests: number;
	total_progress: number;
}

interface RewardHistory {
	id: string;
	quest_title: string;
	quest_type: string;
	xp_earned: number;
	commission_earned: number;
	claimed_at: string;
	character_class: string;
}

export function QuestStats({ userId }: QuestStatsProps) {
	const [stats, setStats] = useState<Stats | null>(null);
	const [rewardStats, setRewardStats] = useState<RewardStats | null>(null);
	const [progressHistory, setProgressHistory] = useState<ProgressHistory[]>([]);
	const [rewardHistory, setRewardHistory] = useState<RewardHistory[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"overview" | "rewards" | "history"
	>("overview");

	useEffect(() => {
		fetchStats();
	}, [userId]);

	const fetchStats = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/quests/history?userId=${userId}&limit=100`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				throw new Error("Failed to fetch quest stats");
			}

			const data = await response.json();
			setStats(data.stats);
			setRewardStats(data.reward_stats);
			setProgressHistory(data.progress_history || []);
			setRewardHistory(data.reward_history || []);
			setError(null);
		} catch (err) {
			console.error("Error fetching quest stats:", err);
			setError("Failed to load statistics");
		} finally {
			setLoading(false);
		}
	};

	const getStreakColor = (streak: number) => {
		if (streak >= 7) return "text-red-600";
		if (streak >= 3) return "text-orange-600";
		if (streak >= 1) return "text-green-600";
		return "text-gray-600";
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	const formatNumber = (num: number) => {
		return new Intl.NumberFormat("en-US").format(num);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-4">
				<p className="text-red-800">{error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Tabs */}
			<div className="border-b border-gray-200">
				<nav className="-mb-px flex space-x-8">
					{[
						{ key: "overview", label: "Overview" },
						{ key: "rewards", label: "Rewards" },
						{ key: "history", label: "Progress History" },
					].map(({ key, label }) => (
						<button
							key={key}
							onClick={() => setActiveTab(key as any)}
							className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${
									activeTab === key
										? "border-blue-500 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}
              `}
						>
							{label}
						</button>
					))}
				</nav>
			</div>

			{/* Tab Content */}
			{activeTab === "overview" && stats && (
				<div className="space-y-6">
					{/* Main Stats Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="bg-white rounded-lg shadow p-6">
							<div className="flex items-center">
								<div className="p-3 bg-blue-100 rounded-lg">
									<span className="text-2xl">📊</span>
								</div>
								<div className="ml-4">
									<p className="text-sm text-gray-600">Total Quests</p>
									<p className="text-2xl font-bold text-gray-900">
										{stats.total_quests}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white rounded-lg shadow p-6">
							<div className="flex items-center">
								<div className="p-3 bg-green-100 rounded-lg">
									<span className="text-2xl">✅</span>
								</div>
								<div className="ml-4">
									<p className="text-sm text-gray-600">Completed</p>
									<p className="text-2xl font-bold text-gray-900">
										{stats.completed_quests}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white rounded-lg shadow p-6">
							<div className="flex items-center">
								<div className="p-3 bg-purple-100 rounded-lg">
									<span className="text-2xl">⭐</span>
								</div>
								<div className="ml-4">
									<p className="text-sm text-gray-600">Total XP</p>
									<p className="text-2xl font-bold text-gray-900">
										{formatNumber(stats.total_xp_earned)}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white rounded-lg shadow p-6">
							<div className="flex items-center">
								<div className="p-3 bg-yellow-100 rounded-lg">
									<span className="text-2xl">🔥</span>
								</div>
								<div className="ml-4">
									<p className="text-sm text-gray-600">Current Streak</p>
									<p
										className={`text-2xl font-bold ${getStreakColor(stats.current_streak)}`}
									>
										{stats.current_streak} days
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Progress Overview */}
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Progress Overview
						</h3>
						<div className="space-y-4">
							<div>
								<div className="flex justify-between text-sm text-gray-600 mb-1">
									<span>Completion Rate</span>
									<span>{stats.completion_rate.toFixed(1)}%</span>
								</div>
								<div className="w-full bg-gray-200 rounded-full h-3">
									<div
										className="bg-blue-500 h-3 rounded-full transition-all duration-300"
										style={{
											width: `${Math.min(stats.completion_rate, 100)}%`,
										}}
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="bg-gray-50 rounded-lg p-4">
									<p className="text-sm text-gray-600">In Progress</p>
									<p className="text-xl font-bold text-gray-900">
										{stats.in_progress_quests}
									</p>
								</div>
								<div className="bg-gray-50 rounded-lg p-4">
									<p className="text-sm text-gray-600">Total Commission</p>
									<p className="text-xl font-bold text-gray-900">
										{formatCurrency(stats.total_commission_earned)}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{activeTab === "rewards" && rewardStats && (
				<div className="space-y-6">
					{/* Reward Summary */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="bg-white rounded-lg shadow p-6">
							<div className="text-center">
								<div className="text-3xl mb-2">⭐</div>
								<p className="text-sm text-gray-600">Total XP Earned</p>
								<p className="text-2xl font-bold text-gray-900">
									{formatNumber(rewardStats.total_xp_earned)}
								</p>
							</div>
						</div>

						<div className="bg-white rounded-lg shadow p-6">
							<div className="text-center">
								<div className="text-3xl mb-2">💰</div>
								<p className="text-sm text-gray-600">Total Commission</p>
								<p className="text-2xl font-bold text-gray-900">
									{formatCurrency(rewardStats.total_commission_earned)}
								</p>
							</div>
						</div>

						<div className="bg-white rounded-lg shadow p-6">
							<div className="text-center">
								<div className="text-3xl mb-2">🏆</div>
								<p className="text-sm text-gray-600">Reward Streak</p>
								<p
									className={`text-2xl font-bold ${getStreakColor(rewardStats.reward_streak)}`}
								>
									{rewardStats.reward_streak} days
								</p>
							</div>
						</div>
					</div>

					{/* Reward Averages */}
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Reward Averages
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="bg-blue-50 rounded-lg p-4">
								<p className="text-sm text-blue-600 mb-1">
									Average XP per Quest
								</p>
								<p className="text-xl font-bold text-blue-900">
									{formatNumber(Math.round(rewardStats.average_xp_per_quest))}{" "}
									XP
								</p>
							</div>
							<div className="bg-green-50 rounded-lg p-4">
								<p className="text-sm text-green-600 mb-1">
									Average Commission per Quest
								</p>
								<p className="text-xl font-bold text-green-900">
									{formatCurrency(rewardStats.average_commission_per_quest)}
								</p>
							</div>
						</div>
						<div className="mt-4 p-4 bg-purple-50 rounded-lg">
							<p className="text-sm text-purple-600 mb-1">
								Most Profitable Quest Type
							</p>
							<p className="text-lg font-bold text-purple-900 capitalize">
								{rewardStats.most_profitable_quest_type}
							</p>
						</div>
					</div>

					{/* Recent Rewards */}
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Recent Rewards
						</h3>
						<div className="space-y-3">
							{rewardHistory.slice(0, 5).map((reward) => (
								<div
									key={reward.id}
									className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
								>
									<div>
										<p className="font-medium text-gray-900">
											{reward.quest_title}
										</p>
										<p className="text-sm text-gray-600">
											{reward.quest_type} • {reward.character_class}
										</p>
									</div>
									<div className="text-right">
										<div className="text-sm text-blue-600">
											⭐ {reward.xp_earned} XP
										</div>
										<div className="text-sm text-green-600">
											💰 {formatCurrency(reward.commission_earned)}
										</div>
									</div>
								</div>
							))}
							{rewardHistory.length === 0 && (
								<p className="text-center text-gray-500 py-4">
									No rewards claimed yet
								</p>
							)}
						</div>
					</div>
				</div>
			)}

			{activeTab === "history" && (
				<div className="bg-white rounded-lg shadow p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Progress History (Last 30 Days)
					</h3>
					{progressHistory.length > 0 ? (
						<div className="space-y-3">
							{progressHistory
								.slice(-7)
								.reverse()
								.map((day) => (
									<div
										key={day.date}
										className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
									>
										<div>
											<p className="font-medium text-gray-900">{day.date}</p>
										</div>
										<div className="text-right">
											<div className="text-sm text-green-600">
												✅ {day.completed_quests} completed
											</div>
											<div className="text-sm text-blue-600">
												📊 {day.total_progress} progress
											</div>
										</div>
									</div>
								))}
						</div>
					) : (
						<p className="text-center text-gray-500 py-4">
							No progress history available
						</p>
					)}
				</div>
			)}
		</div>
	);
}

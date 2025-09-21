"use client";

import React, { useState, useEffect } from "react";

interface QuestHistoryProps {
	userId: string;
}

interface HistoryQuest {
	id: string;
	user_id: string;
	quest_id: string;
	progress_value: number;
	is_completed: boolean;
	completed_at: string | null;
	reward_claimed: boolean;
	reward_claimed_at: string | null;
	created_at: string;
	updated_at: string;
	quest?: {
		id: string;
		title: string;
		description: string;
		quest_type: "daily" | "weekly" | "monthly" | "special";
		difficulty: "easy" | "medium" | "hard" | "epic";
		target_type: "referrals" | "commission" | "level" | "achievements";
		target_value: number;
		reward_xp: number;
		reward_commission: number;
	};
}

export function QuestHistory({ userId }: QuestHistoryProps) {
	const [history, setHistory] = useState<HistoryQuest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);

	useEffect(() => {
		fetchHistory();
	}, [page]);

	const fetchHistory = async () => {
		try {
			setLoading(true);
			const limit = 20;
			const offset = (page - 1) * limit;

			const response = await fetch(
				`/api/quests/history?userId=${userId}&limit=${limit}&offset=${offset}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				throw new Error("Failed to fetch quest history");
			}

			const data = await response.json();

			if (page === 1) {
				setHistory(data.quests || []);
			} else {
				setHistory((prev) => [...prev, ...(data.quests || [])]);
			}

			setHasMore((data.quests || []).length === limit);
			setError(null);
		} catch (err) {
			console.error("Error fetching quest history:", err);
			setError("Failed to load quest history");
		} finally {
			setLoading(false);
		}
	};

	const loadMore = () => {
		if (hasMore && !loading) {
			setPage((prev) => prev + 1);
		}
	};

	const getQuestTypeIcon = (type: string) => {
		const icons = {
			daily: "📅",
			weekly: "📊",
			monthly: "📈",
			special: "⭐",
		};
		return icons[type as keyof typeof icons] || "📋";
	};

	const getDifficultyColor = (difficulty: string) => {
		const colors = {
			easy: "text-green-600 bg-green-100",
			medium: "text-yellow-600 bg-yellow-100",
			hard: "text-orange-600 bg-orange-100",
			epic: "text-purple-600 bg-purple-100",
		};
		return (
			colors[difficulty as keyof typeof colors] || "text-gray-600 bg-gray-100"
		);
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (loading && page === 1) {
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
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold text-gray-900">Quest History</h3>
				<div className="text-sm text-gray-600">
					Showing {history.length} completed quests
				</div>
			</div>

			{history.length === 0 ? (
				<div className="text-center py-12">
					<div className="text-6xl mb-4">📜</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						No Quest History
					</h3>
					<p className="text-gray-600">
						Complete some quests to see your history here!
					</p>
				</div>
			) : (
				<>
					<div className="space-y-3">
						{history.map((historyQuest) => {
							if (!historyQuest.quest) return null;

							return (
								<div
									key={historyQuest.id}
									className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
								>
									<div className="flex justify-between items-start">
										<div className="flex items-start space-x-3">
											<div className="text-xl mt-1">
												{getQuestTypeIcon(historyQuest.quest.quest_type)}
											</div>
											<div className="flex-1">
												<h4 className="font-medium text-gray-900">
													{historyQuest.quest.title}
												</h4>
												<p className="text-sm text-gray-600 mt-1">
													{historyQuest.quest.description}
												</p>
												<div className="flex items-center space-x-3 mt-2">
													<span
														className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(historyQuest.quest.difficulty)}`}
													>
														{historyQuest.quest.difficulty
															.charAt(0)
															.toUpperCase() +
															historyQuest.quest.difficulty.slice(1)}
													</span>
													<span className="text-xs text-gray-500">
														Completed:{" "}
														{historyQuest.completed_at
															? formatDate(historyQuest.completed_at)
															: "Unknown"}
													</span>
												</div>
											</div>
										</div>
										<div className="text-right">
											<div className="text-sm text-gray-600">Progress</div>
											<div className="text-lg font-semibold text-gray-900">
												{historyQuest.progress_value} /{" "}
												{historyQuest.quest.target_value}
											</div>
											<div className="mt-2 space-y-1">
												<div className="text-xs text-blue-600">
													⭐ {historyQuest.quest.reward_xp} XP
												</div>
												<div className="text-xs text-green-600">
													💰 ${historyQuest.quest.reward_commission.toFixed(2)}
												</div>
												{historyQuest.reward_claimed && (
													<div className="text-xs text-purple-600">
														💎 Claimed:{" "}
														{historyQuest.reward_claimed_at
															? formatDate(historyQuest.reward_claimed_at)
															: "Unknown"}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{hasMore && (
						<div className="text-center pt-4">
							<button
								onClick={loadMore}
								disabled={loading}
								className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? "Loading..." : "Load More"}
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}

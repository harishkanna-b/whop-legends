"use client";

import type { RankingEntry } from "@/lib/leaderboards/ranking-engine";
import React, { useState, useMemo } from "react";

interface LeaderboardTableProps {
	entries: RankingEntry[];
	currentUserId?: string;
	category: string;
	showUserHighlight?: boolean;
	onPageChange?: (page: number) => void;
	pagination?: {
		currentPage: number;
		totalPages: number;
		totalEntries: number;
	};
}

export function LeaderboardTable({
	entries,
	currentUserId,
	category,
	showUserHighlight = true,
	onPageChange,
	pagination,
}: LeaderboardTableProps) {
	const [sortConfig, setSortConfig] = useState<{
		key: keyof RankingEntry | "score";
		direction: "asc" | "desc";
	}>({
		key: "rank",
		direction: "asc",
	});

	// Sort entries
	const sortedEntries = useMemo(() => {
		const sortableEntries = [...entries];
		if (sortConfig.key === "score") {
			sortableEntries.sort((a, b) => {
				return sortConfig.direction === "desc"
					? b.score - a.score
					: a.score - b.score;
			});
		} else {
			sortableEntries.sort((a, b) => {
				const aValue = a[sortConfig.key];
				const bValue = b[sortConfig.key];

				if (aValue === undefined || bValue === undefined) return 0;
				if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
				if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
				return 0;
			});
		}
		return sortableEntries;
	}, [entries, sortConfig]);

	const getRankIcon = (rank: number) => {
		if (rank === 1) return "🥇";
		if (rank === 2) return "🥈";
		if (rank === 3) return "🥉";
		if (rank <= 10) return "⭐";
		if (rank <= 50) return "🎯";
		return "📊";
	};

	const getChangeIcon = (change?: string) => {
		switch (change) {
			case "up":
				return "📈";
			case "down":
				return "📉";
			case "new":
				return "🆕";
			default:
				return "➡️";
		}
	};

	const getChangeColor = (change?: string) => {
		switch (change) {
			case "up":
				return "text-green-600";
			case "down":
				return "text-red-600";
			case "new":
				return "text-blue-600";
			default:
				return "text-gray-600";
		}
	};

	const getClassIcon = (characterClass: string) => {
		const icons: { [key: string]: string } = {
			scout: "🔍",
			sage: "📚",
			champion: "🏆",
			merchant: "💰",
		};
		return icons[characterClass] || "👤";
	};

	const getPerformanceMetric = (entry: RankingEntry) => {
		switch (category) {
			case "referrals":
				return `${entry.metrics.total_referrals} referrals`;
			case "commission":
				return `$${entry.metrics.total_commission.toLocaleString()}`;
			case "engagement":
				return `${entry.metrics.engagement_score.toFixed(1)}% engagement`;
			case "quests":
				return `${entry.metrics.quest_completion_rate.toFixed(1)}% completion`;
			case "retention":
				return `${entry.metrics.retention_rate.toFixed(1)}% retention`;
			default:
				return "Overall performance";
		}
	};

	const handleSort = (key: keyof RankingEntry | "score") => {
		setSortConfig((prev) => ({
			key,
			direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
		}));
	};

	const getSortIndicator = (key: keyof RankingEntry | "score") => {
		if (sortConfig.key !== key) return null;
		return sortConfig.direction === "asc" ? " ↑" : " ↓";
	};

	const isCurrentUser = (entry: RankingEntry) =>
		currentUserId && entry.user_id === currentUserId;

	return (
		<div className="bg-white rounded-lg shadow overflow-hidden">
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => handleSort("rank")}
							>
								Rank{getSortIndicator("rank")}
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Member
							</th>
							<th
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => handleSort("score")}
							>
								Score{getSortIndicator("score")}
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Performance
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Change
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{sortedEntries.map((entry) => (
							<tr
								key={entry.id}
								className={`
                  hover:bg-gray-50 transition-colors
                  ${entry.rank <= 3 ? "bg-yellow-50" : ""}
                  ${showUserHighlight && isCurrentUser(entry) ? "bg-blue-100 border-2 border-blue-300" : ""}
                `}
							>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="flex items-center space-x-2">
										<span className="text-2xl">{getRankIcon(entry.rank)}</span>
										<span className="text-lg font-bold text-gray-900">
											#{entry.rank}
										</span>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="flex items-center">
										<div className="flex-shrink-0 h-10 w-10">
											{entry.avatar ? (
												<img
													className="h-10 w-10 rounded-full"
													src={entry.avatar}
													alt={entry.username}
												/>
											) : (
												<div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
													<span className="text-gray-600 font-medium">
														{entry.username.charAt(0).toUpperCase()}
													</span>
												</div>
											)}
										</div>
										<div className="ml-4">
											<div className="flex items-center space-x-2">
												<div className="text-sm font-medium text-gray-900">
													{entry.username}
												</div>
												{showUserHighlight && isCurrentUser(entry) && (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
														You
													</span>
												)}
											</div>
											<div className="flex items-center space-x-2 text-xs text-gray-500">
												<span className="flex items-center">
													{getClassIcon(entry.character_class)}{" "}
													{entry.character_class}
												</span>
												<span>•</span>
												<span>Lvl {entry.level}</span>
											</div>
										</div>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-lg font-bold text-gray-900">
										{Math.round(entry.score).toLocaleString()}
									</div>
									<div className="text-xs text-gray-500">
										{entry.rank === 1
											? "👑 Champion"
											: entry.rank <= 10
												? "⭐ Top 10"
												: entry.rank <= 50
													? "🎯 Top 50"
													: "Contender"}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-900">
										{getPerformanceMetric(entry)}
									</div>
									<div className="text-xs text-gray-500">
										{entry.metrics.conversion_rate.toFixed(1)}% conversion
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="flex items-center space-x-2">
										<span className={getChangeColor(entry.change)}>
											{getChangeIcon(entry.change)}
										</span>
										{entry.previous_rank && (
											<span
												className={`text-sm ${getChangeColor(entry.change)}`}
											>
												{entry.change === "up"
													? `+${entry.previous_rank - entry.rank}`
													: entry.change === "down"
														? `-${entry.rank - entry.previous_rank}`
														: entry.change === "new"
															? "New"
															: "Same"}
											</span>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			{pagination && pagination.totalPages > 1 && (
				<div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
					<div className="flex-1 flex justify-between sm:hidden">
						<button
							onClick={() => onPageChange?.(pagination.currentPage - 1)}
							disabled={pagination.currentPage === 1}
							className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
						>
							Previous
						</button>
						<button
							onClick={() => onPageChange?.(pagination.currentPage + 1)}
							disabled={pagination.currentPage >= pagination.totalPages}
							className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
						>
							Next
						</button>
					</div>
					<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p className="text-sm text-gray-700">
								Showing{" "}
								<span className="font-medium">
									{(pagination.currentPage - 1) * entries.length + 1}
								</span>{" "}
								to{" "}
								<span className="font-medium">
									{Math.min(
										pagination.currentPage * entries.length,
										pagination.totalEntries,
									)}
								</span>{" "}
								of{" "}
								<span className="font-medium">
									{pagination.totalEntries.toLocaleString()}
								</span>{" "}
								results
							</p>
						</div>
						<div>
							<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
								<button
									onClick={() => onPageChange?.(pagination.currentPage - 1)}
									disabled={pagination.currentPage === 1}
									className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									Previous
								</button>
								{Array.from(
									{ length: Math.min(5, pagination.totalPages) },
									(_, i) => {
										const pageNum =
											Math.max(
												1,
												Math.min(
													pagination.totalPages - 4,
													pagination.currentPage - 2,
												),
											) + i;
										return (
											<button
												key={pageNum}
												onClick={() => onPageChange?.(pageNum)}
												className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
													pagination.currentPage === pageNum
														? "z-10 bg-blue-50 border-blue-500 text-blue-600"
														: "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
												}`}
											>
												{pageNum}
											</button>
										);
									},
								)}
								<button
									onClick={() => onPageChange?.(pagination.currentPage + 1)}
									disabled={pagination.currentPage >= pagination.totalPages}
									className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									Next
								</button>
							</nav>
						</div>
					</div>
				</div>
			)}

			{/* Empty State */}
			{entries.length === 0 && (
				<div className="text-center py-12">
					<div className="text-6xl mb-4">🏆</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						No Rankings Yet
					</h3>
					<p className="text-gray-600">
						Complete activities to appear on the leaderboard!
					</p>
				</div>
			)}
		</div>
	);
}

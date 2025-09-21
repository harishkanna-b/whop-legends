"use client";

import type { RankingEntry } from "@/lib/leaderboards/ranking-engine";
import { useLeaderboardUpdates } from "@/lib/websocket/hooks";
import React, { useState, useEffect, useCallback } from "react";

interface LiveRankingUpdatesProps {
	leaderboardId: string;
	currentUserId?: string;
	onRankUpdate?: (updates: RankingUpdate[]) => void;
}

interface RankingUpdate {
	userId: string;
	username: string;
	oldRank: number;
	newRank: number;
	scoreChange: number;
	changeType: "up" | "down" | "new";
	timestamp: Date;
}

interface LiveRankingEvent {
	type: "rank_change" | "score_update" | "new_entry";
	data: RankingUpdate | RankingEntry;
}

export function LiveRankingUpdates({
	leaderboardId,
	currentUserId,
	onRankUpdate,
}: LiveRankingUpdatesProps) {
	const { leaderboardData, isConnected } = useLeaderboardUpdates(leaderboardId);
	const [userRankUpdate, setUserRankUpdate] = useState<RankingUpdate | null>(
		null,
	);

	// Convert WebSocket messages to ranking updates
	useEffect(() => {
		const rankingUpdates: RankingUpdate[] = leaderboardData.rankUpdates.map(
			(update) => {
				const payload = update.payload;
				return {
					userId: payload.userId || "unknown",
					username: payload.username || "Unknown User",
					oldRank: payload.oldRank || 0,
					newRank: payload.newRank || 0,
					scoreChange: payload.scoreChange || 0,
					changeType: payload.changeType || "same",
					timestamp: update.timestamp,
				};
			},
		);

		// Check if any update affects the current user
		const currentUserUpdate = rankingUpdates.find(
			(update) => update.userId === currentUserId,
		);
		if (currentUserUpdate) {
			setUserRankUpdate(currentUserUpdate);
			// Clear user rank update after 5 seconds
			setTimeout(() => setUserRankUpdate(null), 5000);
		}

		// Notify parent component of updates
		if (rankingUpdates.length > 0) {
			onRankUpdate?.(rankingUpdates);
		}
	}, [leaderboardData.rankUpdates, currentUserId, onRankUpdate]);

	// Get recent updates from the leaderboard data
	const recentUpdates = leaderboardData.rankUpdates.slice(-10).map((update) => {
		const payload = update.payload;
		return {
			userId: payload.userId || "unknown",
			username: payload.username || "Unknown User",
			oldRank: payload.oldRank || 0,
			newRank: payload.newRank || 0,
			scoreChange: payload.scoreChange || 0,
			changeType: payload.changeType || "same",
			timestamp: update.timestamp,
		};
	});

	const getChangeIcon = (changeType: string) => {
		switch (changeType) {
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

	const getChangeColor = (changeType: string) => {
		switch (changeType) {
			case "up":
				return "text-green-600 bg-green-50 border-green-200";
			case "down":
				return "text-red-600 bg-red-50 border-red-200";
			case "new":
				return "text-blue-600 bg-blue-50 border-blue-200";
			default:
				return "text-gray-600 bg-gray-50 border-gray-200";
		}
	};

	const formatTimeAgo = (date: Date) => {
		const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

		if (seconds < 60) return "just now";
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return `${Math.floor(seconds / 86400)}d ago`;
	};

	return (
		<div className="space-y-4">
			{/* Connection Status */}
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-900">Live Updates</h3>
				<div className="flex items-center space-x-2">
					<div
						className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
					/>
					<span className="text-sm text-gray-600">
						{isConnected ? "Connected" : "Disconnected"}
					</span>
				</div>
			</div>

			{/* User Rank Update Notification */}
			{userRankUpdate && (
				<div
					className={`p-4 rounded-lg border-2 ${getChangeColor(userRankUpdate.changeType)} animate-pulse`}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<span className="text-2xl">
								{getChangeIcon(userRankUpdate.changeType)}
							</span>
							<div>
								<p className="font-medium text-gray-900">Your rank changed!</p>
								<p className="text-sm text-gray-600">
									#{userRankUpdate.oldRank} → #{userRankUpdate.newRank}
									{userRankUpdate.scoreChange !== 0 && (
										<span className="ml-2">
											({userRankUpdate.scoreChange > 0 ? "+" : ""}
											{userRankUpdate.scoreChange})
										</span>
									)}
								</p>
							</div>
						</div>
						<span className="text-xs text-gray-500">
							{formatTimeAgo(userRankUpdate.timestamp)}
						</span>
					</div>
				</div>
			)}

			{/* Recent Updates */}
			<div className="bg-white rounded-lg shadow border border-gray-200">
				<div className="p-4 border-b border-gray-200">
					<h4 className="font-medium text-gray-900">Recent Activity</h4>
				</div>

				<div className="max-h-64 overflow-y-auto">
					{recentUpdates.length === 0 ? (
						<div className="p-6 text-center text-gray-500">
							<div className="text-4xl mb-2">📊</div>
							<p className="text-sm">No recent updates</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200">
							{recentUpdates.map((update, index) => (
								<div
									key={`${update.userId}-${index}`}
									className="p-3 hover:bg-gray-50 transition-colors"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-3">
											<span className="text-lg">
												{getChangeIcon(update.changeType)}
											</span>
											<div>
												<p className="text-sm font-medium text-gray-900">
													{update.username}
													{currentUserId === update.userId && (
														<span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
															You
														</span>
													)}
												</p>
												<p className="text-xs text-gray-600">
													Rank #{update.oldRank} → #{update.newRank}
													{update.scoreChange !== 0 && (
														<span className="ml-1">
															({update.scoreChange > 0 ? "+" : ""}
															{update.scoreChange} pts)
														</span>
													)}
												</p>
											</div>
										</div>
										<span className="text-xs text-gray-500">
											{formatTimeAgo(update.timestamp)}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Ranking Milestones */}
			<div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
				<h4 className="font-medium text-purple-900 mb-2">Ranking Milestones</h4>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
					<div className="text-center p-2 bg-white rounded border border-purple-100">
						<div className="text-lg">🥇</div>
						<div className="text-xs text-purple-700">Top 1</div>
					</div>
					<div className="text-center p-2 bg-white rounded border border-purple-100">
						<div className="text-lg">🏆</div>
						<div className="text-xs text-purple-700">Top 10</div>
					</div>
					<div className="text-center p-2 bg-white rounded border border-purple-100">
						<div className="text-lg">⭐</div>
						<div className="text-xs text-purple-700">Top 50</div>
					</div>
					<div className="text-center p-2 bg-white rounded border border-purple-100">
						<div className="text-lg">🎯</div>
						<div className="text-xs text-purple-700">Top 100</div>
					</div>
				</div>
			</div>

			{/* Performance Tips */}
			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<h4 className="font-medium text-yellow-900 mb-2">💡 Pro Tips</h4>
				<ul className="text-sm text-yellow-800 space-y-1">
					<li>• Check back regularly to see how you rank against others</li>
					<li>
						• Focus on activities that boost your score in your preferred
						category
					</li>
					<li>
						• Character class multipliers can significantly impact your ranking
					</li>
					<li>• Consistency is key - maintain steady progress over time</li>
				</ul>
			</div>
		</div>
	);
}

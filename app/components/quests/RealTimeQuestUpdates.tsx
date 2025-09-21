"use client";

import { useQuestUpdates } from "@/lib/websocket/hooks";
import { useConnectionStatus } from "@/lib/websocket/hooks";
import React, { useState, useEffect } from "react";

interface RealTimeQuestUpdatesProps {
	userId: string;
	onQuestUpdate?: (updates: any[]) => void;
}

interface QuestUpdate {
	questId: string;
	title: string;
	progress: number;
	target: number;
	isCompleted: boolean;
	timestamp: Date;
}

export function RealTimeQuestUpdates({
	userId,
	onQuestUpdate,
}: RealTimeQuestUpdatesProps) {
	const { questUpdates, isConnected, clearUpdates } = useQuestUpdates(userId);
	const { connect, disconnect } = useConnectionStatus();
	const [recentQuestUpdates, setRecentQuestUpdates] = useState<QuestUpdate[]>(
		[],
	);

	// Convert WebSocket messages to quest updates
	useEffect(() => {
		const questUpdateList: QuestUpdate[] = questUpdates.map((update) => {
			const payload = update.payload;
			return {
				questId: payload.questId || payload.new?.quest_id || "unknown",
				title: payload.title || payload.new?.title || "Unknown Quest",
				progress: payload.progress || payload.new?.progress_value || 0,
				target: payload.target || payload.new?.target_value || 100,
				isCompleted: payload.isCompleted || payload.new?.is_completed || false,
				timestamp: update.timestamp,
			};
		});

		setRecentQuestUpdates((prev) => {
			const updates = [...questUpdateList, ...prev].slice(0, 10); // Keep last 10 updates
			return updates;
		});

		// Notify parent component of updates
		if (questUpdateList.length > 0) {
			onQuestUpdate?.(questUpdateList);
		}
	}, [questUpdates, onQuestUpdate]);

	const getProgressPercentage = (progress: number, target: number) => {
		return Math.min((progress / target) * 100, 100);
	};

	const getQuestIcon = (isCompleted: boolean) => {
		return isCompleted ? "✅" : "📋";
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
				<h3 className="text-lg font-semibold text-gray-900">
					Live Quest Updates
				</h3>
				<div className="flex items-center space-x-2">
					<div
						className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
					/>
					<span className="text-sm text-gray-600">
						{isConnected ? "Connected" : "Disconnected"}
					</span>
					<button
						onClick={isConnected ? disconnect : connect}
						className="px-3 py-1 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
					>
						{isConnected ? "Disconnect" : "Connect"}
					</button>
				</div>
			</div>

			{/* Recent Quest Updates */}
			<div className="bg-white rounded-lg shadow border border-gray-200">
				<div className="p-4 border-b border-gray-200">
					<h4 className="font-medium text-gray-900">Recent Quest Activity</h4>
				</div>

				<div className="max-h-64 overflow-y-auto">
					{recentQuestUpdates.length === 0 ? (
						<div className="p-6 text-center text-gray-500">
							<div className="text-4xl mb-2">🎯</div>
							<p className="text-sm">No recent quest updates</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200">
							{recentQuestUpdates.map((update, index) => (
								<div
									key={`${update.questId}-${index}`}
									className="p-3 hover:bg-gray-50 transition-colors"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-3">
											<span className="text-lg">
												{getQuestIcon(update.isCompleted)}
											</span>
											<div>
												<p className="text-sm font-medium text-gray-900">
													{update.title}
												</p>
												<div className="flex items-center space-x-2 text-xs text-gray-600">
													<div className="w-24 bg-gray-200 rounded-full h-2">
														<div
															className="bg-blue-600 h-2 rounded-full transition-all duration-300"
															style={{
																width: `${getProgressPercentage(update.progress, update.target)}%`,
															}}
														/>
													</div>
													<span>
														{update.progress}/{update.target}
													</span>
												</div>
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

			{/* Quest Completion Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-green-50 p-4 rounded-lg border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-green-600">
								Completed Today
							</p>
							<p className="text-lg font-bold text-green-900">
								{recentQuestUpdates.filter((u) => u.isCompleted).length}
							</p>
						</div>
						<div className="text-2xl">🎉</div>
					</div>
				</div>

				<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-blue-600">In Progress</p>
							<p className="text-lg font-bold text-blue-900">
								{
									recentQuestUpdates.filter(
										(u) => !u.isCompleted && u.progress > 0,
									).length
								}
							</p>
						</div>
						<div className="text-2xl">🔄</div>
					</div>
				</div>

				<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Updates</p>
							<p className="text-lg font-bold text-gray-900">
								{recentQuestUpdates.length}
							</p>
						</div>
						<div className="text-2xl">📊</div>
					</div>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-between">
				<button
					onClick={clearUpdates}
					className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
				>
					Clear Updates
				</button>
				<button
					onClick={() => {
						// Trigger a manual refresh or notification test
						console.log("Manual refresh triggered");
					}}
					className="px-4 py-2 text-sm rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
				>
					Refresh Now
				</button>
			</div>
		</div>
	);
}

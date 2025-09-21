"use client";

import { useWhopUser } from "@/app/hooks/useWhopUser";
import React, { useState, useEffect } from "react";
import { QuestCard } from "./QuestCard";
import { QuestHistory } from "./QuestHistory";
import { QuestStats } from "./QuestStats";

interface QuestDashboardProps {
	companyId: string;
}

interface UserQuest {
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
		start_date: string | null;
		end_date: string | null;
	};
	progress?: {
		quest_id: string;
		current_value: number;
		target_value: number;
		percentage: number;
		is_completed: boolean;
		time_remaining?: string;
	};
}

export function QuestDashboard({ companyId }: QuestDashboardProps) {
	const [activeQuests, setActiveQuests] = useState<UserQuest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"active" | "history" | "stats">(
		"active",
	);
	const { user } = useWhopUser();

	useEffect(() => {
		if (user?.id) {
			fetchActiveQuests();
		}
	}, [user, companyId]);

	const fetchActiveQuests = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/quests/active?userId=${user?.id}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to fetch active quests");
			}

			const data = await response.json();
			setActiveQuests(data.quests || []);
			setError(null);
		} catch (err) {
			console.error("Error fetching active quests:", err);
			setError("Failed to load quests");
		} finally {
			setLoading(false);
		}
	};

	const handleQuestUpdate = (questId: string, updatedQuest: UserQuest) => {
		setActiveQuests((prev) =>
			prev.map((quest) => (quest.id === questId ? updatedQuest : quest)),
		);
	};

	const generateNewQuests = async () => {
		try {
			const response = await fetch("/api/quests/active", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: user?.id,
					companyId,
					userLevel: 1, // This should come from user profile
					characterClass: "scout", // This should come from user profile
					questType: "daily",
				}),
			});

			if (response.ok) {
				await fetchActiveQuests();
			}
		} catch (err) {
			console.error("Error generating new quests:", err);
		}
	};

	const renderQuestTypeIcon = (questType: string) => {
		const icons = {
			daily: "📅",
			weekly: "📊",
			monthly: "📈",
			special: "⭐",
		};
		return icons[questType as keyof typeof icons] || "📋";
	};

	const renderDifficultyBadge = (difficulty: string) => {
		const colors = {
			easy: "bg-green-100 text-green-800",
			medium: "bg-yellow-100 text-yellow-800",
			hard: "bg-orange-100 text-orange-800",
			epic: "bg-purple-100 text-purple-800",
		};
		const labels = {
			easy: "Easy",
			medium: "Medium",
			hard: "Hard",
			epic: "Epic",
		};

		return (
			<span
				className={`px-2 py-1 rounded-full text-xs font-medium ${colors[difficulty as keyof typeof colors]}`}
			>
				{labels[difficulty as keyof typeof labels]}
			</span>
		);
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
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">Quest Dashboard</h2>
					<p className="text-gray-600">
						Complete quests to earn XP and rewards
					</p>
				</div>
				<button
					onClick={generateNewQuests}
					className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
				>
					Generate New Quests
				</button>
			</div>

			{/* Stats Overview */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center">
						<div className="p-2 bg-blue-100 rounded-lg">
							<span className="text-2xl">📋</span>
						</div>
						<div className="ml-4">
							<p className="text-sm text-gray-600">Active Quests</p>
							<p className="text-2xl font-bold text-gray-900">
								{activeQuests.length}
							</p>
						</div>
					</div>
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center">
						<div className="p-2 bg-green-100 rounded-lg">
							<span className="text-2xl">✅</span>
						</div>
						<div className="ml-4">
							<p className="text-sm text-gray-600">Completed Today</p>
							<p className="text-2xl font-bold text-gray-900">
								{activeQuests.filter((q) => q.is_completed).length}
							</p>
						</div>
					</div>
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center">
						<div className="p-2 bg-purple-100 rounded-lg">
							<span className="text-2xl">💎</span>
						</div>
						<div className="ml-4">
							<p className="text-sm text-gray-600">Total Rewards</p>
							<p className="text-2xl font-bold text-gray-900">
								{activeQuests.reduce(
									(sum, q) => sum + (q.quest?.reward_xp || 0),
									0,
								)}{" "}
								XP
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200">
				<nav className="-mb-px flex space-x-8">
					{[
						{
							key: "active",
							label: "Active Quests",
							count: activeQuests.length,
						},
						{ key: "history", label: "History", count: 0 },
						{ key: "stats", label: "Statistics", count: 0 },
					].map(({ key, label, count }) => (
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
							{count > 0 && (
								<span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
									{count}
								</span>
							)}
						</button>
					))}
				</nav>
			</div>

			{/* Tab Content */}
			<div className="mt-6">
				{activeTab === "active" && (
					<div className="space-y-4">
						{activeQuests.length === 0 ? (
							<div className="text-center py-12">
								<div className="text-6xl mb-4">📝</div>
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									No Active Quests
								</h3>
								<p className="text-gray-600 mb-4">
									Generate new quests to start earning rewards!
								</p>
								<button
									onClick={generateNewQuests}
									className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
								>
									Generate Quests
								</button>
							</div>
						) : (
							<div className="grid gap-4">
								{activeQuests.map((userQuest) => (
									<QuestCard
										key={userQuest.id}
										quest={userQuest}
										onUpdate={handleQuestUpdate}
										userId={user?.id || ""}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{activeTab === "history" && <QuestHistory userId={user?.id || ""} />}

				{activeTab === "stats" && <QuestStats userId={user?.id || ""} />}
			</div>
		</div>
	);
}

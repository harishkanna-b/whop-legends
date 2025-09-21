"use client";

import { LeaderboardDisplay } from "@/app/components/leaderboards/LeaderboardDisplay";
import { useWhopUser } from "@/app/hooks/useWhopUser";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

type LeaderboardCategory =
	| "overall"
	| "referrals"
	| "commission"
	| "engagement"
	| "quests"
	| "retention";
type LeaderboardTimeframe = "daily" | "weekly" | "monthly" | "all_time";

export default function LeaderboardsPage() {
	const { user, isLoading } = useWhopUser();
	const router = useRouter();
	const [activeCategory, setActiveCategory] =
		useState<LeaderboardCategory>("overall");
	const [activeTimeframe, setActiveTimeframe] =
		useState<LeaderboardTimeframe>("weekly");

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
			</div>
		);
	}

	if (!user) {
		router.push("/login");
		return null;
	}

	const companyId =
		user?.metadata?.companyId ||
		process.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID ||
		"default";

	const categories: Array<{
		value: LeaderboardCategory;
		label: string;
		icon: string;
		description: string;
	}> = [
		{
			value: "overall",
			label: "Overall",
			icon: "🏆",
			description: "Complete performance ranking across all metrics",
		},
		{
			value: "referrals",
			label: "Referrals",
			icon: "👥",
			description: "Top referrers by number of successful referrals",
		},
		{
			value: "commission",
			label: "Commission",
			icon: "💰",
			description: "Highest commission earners",
		},
		{
			value: "engagement",
			label: "Engagement",
			icon: "💬",
			description: "Most engaged and active community members",
		},
		{
			value: "quests",
			label: "Quests",
			icon: "📝",
			description: "Top quest completers and achievement earners",
		},
		{
			value: "retention",
			label: "Retention",
			icon: "🔄",
			description: "Members with highest retention and loyalty",
		},
	];

	const timeframes: Array<{
		value: LeaderboardTimeframe;
		label: string;
		icon: string;
	}> = [
		{ value: "daily", label: "Daily", icon: "📅" },
		{ value: "weekly", label: "Weekly", icon: "📊" },
		{ value: "monthly", label: "Monthly", icon: "📈" },
		{ value: "all_time", label: "All Time", icon: "⏰" },
	];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<h1 className="text-2xl font-bold text-gray-900">Leaderboards</h1>
							<p className="ml-2 text-gray-600">Compete and climb the ranks</p>
						</div>
						<div className="flex items-center space-x-4">
							<div className="flex items-center space-x-2 text-sm text-gray-600">
								<span className="font-medium">{user?.username}</span>
								<span>•</span>
								<span>Member</span>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Category Selection */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<nav className="flex space-x-8 overflow-x-auto py-4">
						{categories.map((category) => (
							<button
								key={category.value}
								onClick={() => setActiveCategory(category.value)}
								className={`
                  flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
										activeCategory === category.value
											? "border-blue-500 text-blue-600"
											: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
									}
                `}
							>
								<span>{category.icon}</span>
								<span>{category.label}</span>
							</button>
						))}
					</nav>
				</div>
			</div>

			{/* Timeframe Selection */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between py-4">
						<div className="flex items-center space-x-4">
							<span className="text-sm font-medium text-gray-700">
								Timeframe:
							</span>
							<div className="flex space-x-2">
								{timeframes.map((timeframe) => (
									<button
										key={timeframe.value}
										onClick={() => setActiveTimeframe(timeframe.value)}
										className={`
                      flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium
                      ${
												activeTimeframe === timeframe.value
													? "bg-blue-100 text-blue-700"
													: "text-gray-600 hover:bg-gray-100"
											}
                    `}
									>
										<span>{timeframe.icon}</span>
										<span>{timeframe.label}</span>
									</button>
								))}
							</div>
						</div>
						<div className="text-sm text-gray-600">
							{categories.find((c) => c.value === activeCategory)?.description}
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<LeaderboardDisplay
					companyId={companyId}
					category={activeCategory}
					timeframe={activeTimeframe}
					limit={50}
				/>
			</main>

			{/* Footer */}
			<footer className="bg-white border-t border-gray-200 mt-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="text-center text-gray-600">
						<p className="text-sm">
							Leaderboards update every hour. Rankings are calculated based on
							performance metrics with character class multipliers.
						</p>
						<div className="mt-2 flex items-center justify-center space-x-4 text-xs">
							<span>🔍 Scout: 1.2x multiplier</span>
							<span>📚 Sage: 1.5x multiplier</span>
							<span>🏆 Champion: 1.3x multiplier</span>
							<span>💰 Merchant: 1.1x multiplier</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}

"use client";

import { QuestDashboard } from "@/app/components/quest/QuestDashboard";
import { QuestNotifications } from "@/app/components/quest/QuestNotifications";
import { useWhopUser } from "@/app/hooks/useWhopUser";
import { useRouter } from "next/navigation";
import React from "react";

export default function QuestsPage() {
	const { user, isLoading } = useWhopUser();
	const router = useRouter();

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

	// Get company ID from user metadata or query params
	const companyId =
		user?.metadata?.companyId ||
		process.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID ||
		"default";

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<h1 className="text-2xl font-bold text-gray-900">Quests</h1>
							<p className="ml-2 text-gray-600">
								Complete challenges to earn rewards
							</p>
						</div>
						<div className="flex items-center space-x-4">
							<QuestNotifications
								userId={user.id}
								onQuestComplete={(questId) => {
									// Handle quest completion
									console.log("Quest completed:", questId);
								}}
								onRewardClaim={(questId) => {
									// Handle reward claim
									console.log("Reward claimed:", questId);
								}}
							/>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<QuestDashboard companyId={companyId} />
			</main>
		</div>
	);
}

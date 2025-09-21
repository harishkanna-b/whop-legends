"use client";

import { AnalyticsDashboard } from "@/app/components/analytics/AnalyticsDashboard";
import { InsightsPanel } from "@/app/components/analytics/InsightsPanel";
import { MemberDirectory } from "@/app/components/analytics/MemberDirectory";
import { ReportBuilder } from "@/app/components/analytics/ReportBuilder";
import { useWhopUser } from "@/app/hooks/useWhopUser";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function AnalyticsPage() {
	const { user, isLoading } = useWhopUser();
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<
		"dashboard" | "members" | "reports" | "insights"
	>("dashboard");

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

	const tabs = [
		{ key: "dashboard", label: "Dashboard", icon: "📊" },
		{ key: "members", label: "Member Directory", icon: "👥" },
		{ key: "reports", label: "Reports", icon: "📄" },
		{ key: "insights", label: "Insights", icon: "💡" },
	];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<h1 className="text-2xl font-bold text-gray-900">
								Creator Tools
							</h1>
							<p className="ml-2 text-gray-600">
								Analytics and management tools for your community
							</p>
						</div>
						<div className="flex items-center space-x-4">
							<div className="flex items-center space-x-2 text-sm text-gray-600">
								<span className="font-medium">{user?.username}</span>
								<span>•</span>
								<span>Creator</span>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Navigation Tabs */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<nav className="-mb-px flex space-x-8">
						{tabs.map((tab) => (
							<button
								key={tab.key}
								onClick={() => setActiveTab(tab.key as any)}
								className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${
										activeTab === tab.key
											? "border-blue-500 text-blue-600"
											: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
									}
                `}
							>
								<span>{tab.icon}</span>
								<span>{tab.label}</span>
							</button>
						))}
					</nav>
				</div>
			</div>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{activeTab === "dashboard" && (
					<AnalyticsDashboard companyId={companyId} />
				)}
				{activeTab === "members" && <MemberDirectory companyId={companyId} />}
				{activeTab === "reports" && <ReportBuilder companyId={companyId} />}
				{activeTab === "insights" && <InsightsPanel companyId={companyId} />}
			</main>
		</div>
	);
}

"use client";

import { type Insight, InsightsEngine } from "@/lib/analytics/insights-engine";
import React, { useState, useEffect } from "react";

interface InsightsPanelProps {
	companyId: string;
}

export function InsightsPanel({ companyId }: InsightsPanelProps) {
	const [insights, setInsights] = useState<Insight[]>([]);
	const [stats, setStats] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);
	const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
	const [filters, setFilters] = useState({
		type: "",
		category: "",
		priority: "",
		acknowledged: "",
	});

	const insightsEngine = new InsightsEngine();

	useEffect(() => {
		fetchInsights();
		fetchStats();
	}, [companyId, filters]);

	const fetchInsights = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/insights/recommendations?companyId=${companyId}&${new URLSearchParams(filters as any)}`,
			);
			if (response.ok) {
				const data = await response.json();
				setInsights(data);
			}
			setError(null);
		} catch (err) {
			console.error("Error fetching insights:", err);
			setError("Failed to load insights");
		} finally {
			setLoading(false);
		}
	};

	const fetchStats = async () => {
		try {
			const response = await fetch("/api/insights/recommendations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					companyId,
					action: "getStats",
				}),
			});

			if (response.ok) {
				const data = await response.json();
				setStats(data);
			}
		} catch (err) {
			console.error("Error fetching stats:", err);
		}
	};

	const generateNewInsights = async () => {
		try {
			setGenerating(true);
			const response = await fetch("/api/insights/recommendations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					companyId,
					action: "generate",
					timeframe: "30d",
				}),
			});

			if (response.ok) {
				const newInsights = await response.json();
				setInsights(newInsights);
				await fetchStats();
			}
		} catch (err) {
			console.error("Error generating insights:", err);
			setError("Failed to generate insights");
		} finally {
			setGenerating(false);
		}
	};

	const acknowledgeInsight = async (insightId: string) => {
		try {
			const response = await fetch("/api/insights/recommendations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					companyId,
					action: "acknowledge",
					insightId,
					acknowledgedBy: "creator",
				}),
			});

			if (response.ok) {
				setInsights((prev) =>
					prev.map((insight) =>
						insight.id === insightId
							? {
									...insight,
									acknowledged: true,
									acknowledged_at: new Date().toISOString(),
								}
							: insight,
					),
				);
				await fetchStats();
			}
		} catch (err) {
			console.error("Error acknowledging insight:", err);
		}
	};

	const getInsightIcon = (type: string) => {
		const icons = {
			trend: "📈",
			opportunity: "💡",
			warning: "⚠️",
			achievement: "🏆",
			recommendation: "🎯",
		};
		return icons[type as keyof typeof icons] || "💡";
	};

	const getInsightColor = (type: string) => {
		const colors = {
			trend: "border-blue-200 bg-blue-50",
			opportunity: "border-green-200 bg-green-50",
			warning: "border-yellow-200 bg-yellow-50",
			achievement: "border-purple-200 bg-purple-50",
			recommendation: "border-indigo-200 bg-indigo-50",
		};
		return colors[type as keyof typeof colors] || "border-gray-200 bg-gray-50";
	};

	const getPriorityColor = (priority: string) => {
		const colors = {
			low: "bg-gray-100 text-gray-800",
			medium: "bg-yellow-100 text-yellow-800",
			high: "bg-orange-100 text-orange-800",
			critical: "bg-red-100 text-red-800",
		};
		return (
			colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-800"
		);
	};

	const formatInsightData = (data: any) => {
		if (!data) return null;

		return (
			<div className="mt-3 p-3 bg-gray-50 rounded-lg">
				<h5 className="font-medium text-gray-900 mb-2">Details</h5>
				<div className="space-y-1 text-sm">
					{Object.entries(data).map(([key, value]) => (
						<div key={key} className="flex justify-between">
							<span className="text-gray-600 capitalize">
								{key.replace(/_/g, " ")}:
							</span>
							<span className="font-medium">
								{(typeof value === "number" && key.includes("rate")) ||
								key.includes("percentage")
									? `${(value as number).toFixed(1)}%`
									: typeof value === "number"
										? (value as number).toLocaleString()
										: String(value)}
							</span>
						</div>
					))}
				</div>
			</div>
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
					<h2 className="text-2xl font-bold text-gray-900">
						Insights & Recommendations
					</h2>
					<p className="text-gray-600">
						AI-powered insights to optimize your community
					</p>
				</div>
				<div className="flex items-center space-x-4">
					<button
						onClick={generateNewInsights}
						disabled={generating}
						className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{generating ? (
							<span className="flex items-center">
								<span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
								Generating...
							</span>
						) : (
							"Generate Insights"
						)}
					</button>
				</div>
			</div>

			{/* Stats Overview */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-white rounded-lg shadow p-6">
						<div className="text-center">
							<div className="text-3xl mb-2">📊</div>
							<p className="text-sm text-gray-600">Total Insights</p>
							<p className="text-2xl font-bold text-gray-900">
								{stats.total_insights}
							</p>
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<div className="text-center">
							<div className="text-3xl mb-2">✅</div>
							<p className="text-sm text-gray-600">Acknowledged</p>
							<p className="text-2xl font-bold text-gray-900">
								{stats.acknowledged_insights}
							</p>
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<div className="text-center">
							<div className="text-3xl mb-2">⚠️</div>
							<p className="text-sm text-gray-600">High Priority</p>
							<p className="text-2xl font-bold text-gray-900">
								{stats.insights_by_priority?.high || 0}
							</p>
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<div className="text-center">
							<div className="text-3xl mb-2">🎯</div>
							<p className="text-sm text-gray-600">Actionable</p>
							<p className="text-2xl font-bold text-gray-900">
								{insights.filter((i) => i.actionable && !i.acknowledged).length}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Filters */}
			<div className="bg-white rounded-lg shadow p-6">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Type
						</label>
						<select
							value={filters.type}
							onChange={(e) =>
								setFilters((prev) => ({ ...prev, type: e.target.value }))
							}
							className="w-full border border-gray-300 rounded-lg px-3 py-2"
						>
							<option value="">All Types</option>
							<option value="trend">Trend</option>
							<option value="opportunity">Opportunity</option>
							<option value="warning">Warning</option>
							<option value="achievement">Achievement</option>
							<option value="recommendation">Recommendation</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Category
						</label>
						<select
							value={filters.category}
							onChange={(e) =>
								setFilters((prev) => ({ ...prev, category: e.target.value }))
							}
							className="w-full border border-gray-300 rounded-lg px-3 py-2"
						>
							<option value="">All Categories</option>
							<option value="performance">Performance</option>
							<option value="engagement">Engagement</option>
							<option value="retention">Retention</option>
							<option value="growth">Growth</option>
							<option value="revenue">Revenue</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Priority
						</label>
						<select
							value={filters.priority}
							onChange={(e) =>
								setFilters((prev) => ({ ...prev, priority: e.target.value }))
							}
							className="w-full border border-gray-300 rounded-lg px-3 py-2"
						>
							<option value="">All Priorities</option>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
							<option value="critical">Critical</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Status
						</label>
						<select
							value={filters.acknowledged}
							onChange={(e) =>
								setFilters((prev) => ({
									...prev,
									acknowledged: e.target.value,
								}))
							}
							className="w-full border border-gray-300 rounded-lg px-3 py-2"
						>
							<option value="">All Status</option>
							<option value="false">Pending</option>
							<option value="true">Acknowledged</option>
						</select>
					</div>
				</div>
			</div>

			{/* Insights List */}
			<div className="space-y-4">
				{insights.length === 0 ? (
					<div className="text-center py-12">
						<div className="text-6xl mb-4">💡</div>
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							No Insights Available
						</h3>
						<p className="text-gray-600 mb-4">
							Generate new insights to get AI-powered recommendations for your
							community.
						</p>
						<button
							onClick={generateNewInsights}
							disabled={generating}
							className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Generate First Insights
						</button>
					</div>
				) : (
					insights.map((insight) => (
						<div
							key={insight.id}
							className={`border-l-4 p-6 rounded-lg ${getInsightColor(insight.type)} ${
								insight.acknowledged ? "opacity-75" : ""
							}`}
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start space-x-4 flex-1">
									<span className="text-3xl">
										{getInsightIcon(insight.type)}
									</span>
									<div className="flex-1">
										<div className="flex items-center justify-between mb-2">
											<h3 className="text-lg font-semibold text-gray-900">
												{insight.title}
											</h3>
											<div className="flex items-center space-x-2">
												<span
													className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(insight.priority)}`}
												>
													{insight.priority}
												</span>
												{insight.acknowledged && (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
														Acknowledged
													</span>
												)}
											</div>
										</div>
										<p className="text-gray-700 mb-3">{insight.description}</p>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-4 text-sm text-gray-500">
												<span className="capitalize">{insight.category}</span>
												<span>•</span>
												<span>
													{new Date(insight.created_at).toLocaleDateString()}
												</span>
											</div>
											{insight.actionable && !insight.acknowledged && (
												<div className="flex space-x-2">
													<button
														onClick={() => acknowledgeInsight(insight.id)}
														className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
													>
														Acknowledge
													</button>
													<button
														onClick={() => setSelectedInsight(insight)}
														className="text-sm border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-50 transition-colors"
													>
														View Details
													</button>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* Insight Details Modal */}
			{selectedInsight && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<div className="flex justify-between items-start mb-6">
								<div className="flex items-center space-x-3">
									<span className="text-3xl">
										{getInsightIcon(selectedInsight.type)}
									</span>
									<div>
										<h3 className="text-xl font-bold text-gray-900">
											{selectedInsight.title}
										</h3>
										<p className="text-gray-600 capitalize">
											{selectedInsight.category}
										</p>
									</div>
								</div>
								<button
									onClick={() => setSelectedInsight(null)}
									className="text-gray-400 hover:text-gray-600"
								>
									<span className="text-2xl">×</span>
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">
										Description
									</h4>
									<p className="text-gray-700">{selectedInsight.description}</p>
								</div>

								<div>
									<h4 className="font-semibold text-gray-900 mb-2">Details</h4>
									<div className="bg-gray-50 rounded-lg p-4">
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<span className="text-gray-600">Type:</span>
												<span className="ml-2 font-medium capitalize">
													{selectedInsight.type}
												</span>
											</div>
											<div>
												<span className="text-gray-600">Priority:</span>
												<span
													className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedInsight.priority)}`}
												>
													{selectedInsight.priority}
												</span>
											</div>
											<div>
												<span className="text-gray-600">Created:</span>
												<span className="ml-2 font-medium">
													{new Date(
														selectedInsight.created_at,
													).toLocaleString()}
												</span>
											</div>
											<div>
												<span className="text-gray-600">Actionable:</span>
												<span className="ml-2 font-medium">
													{selectedInsight.actionable ? "Yes" : "No"}
												</span>
											</div>
										</div>
									</div>
								</div>

								{formatInsightData(selectedInsight.data)}

								<div className="flex justify-end space-x-4">
									<button
										onClick={() => setSelectedInsight(null)}
										className="px-4 py-2 text-gray-700 hover:text-gray-900"
									>
										Close
									</button>
									{selectedInsight.actionable &&
										!selectedInsight.acknowledged && (
											<button
												onClick={() => {
													acknowledgeInsight(selectedInsight.id);
													setSelectedInsight(null);
												}}
												className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
											>
												Acknowledge Insight
											</button>
										)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

"use client";

import { useEffect, useState } from "react";

interface ReferralAnalytics {
	totalReferrals: number;
	completedReferrals: number;
	pendingReferrals: number;
	totalRevenue: number;
	totalCommission: number;
	averageCommission: number;
	topReferrers: Array<{
		id: string;
		username: string;
		referrals: number;
		commission: number;
	}>;
}

export default function ReferralAnalytics() {
	const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadAnalytics();
	}, []);

	const loadAnalytics = async () => {
		try {
			const response = await fetch("/api/admin/referrals");
			if (response.ok) {
				const data = await response.json();
				setAnalytics(data.analytics);
			}
		} catch (error) {
			console.error("Error loading referral analytics:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatCurrency = (amount: number): string => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				Loading referral analytics...
			</div>
		);
	}

	if (!analytics) {
		return (
			<div className="flex items-center justify-center h-64">
				No analytics data available
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-6">
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-3xl font-bold text-blue-600">
						{analytics.totalReferrals.toLocaleString()}
					</div>
					<div className="text-sm text-gray-600">Total Referrals</div>
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-3xl font-bold text-green-600">
						{analytics.completedReferrals.toLocaleString()}
					</div>
					<div className="text-sm text-gray-600">Completed</div>
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-3xl font-bold text-yellow-600">
						{analytics.pendingReferrals.toLocaleString()}
					</div>
					<div className="text-sm text-gray-600">Pending</div>
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-3xl font-bold text-purple-600">
						{formatCurrency(analytics.totalRevenue)}
					</div>
					<div className="text-sm text-gray-600">Total Revenue</div>
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-3xl font-bold text-indigo-600">
						{formatCurrency(analytics.totalCommission)}
					</div>
					<div className="text-sm text-gray-600">Total Commission</div>
				</div>
			</div>

			{/* Top Referrers */}
			<div className="bg-white rounded-lg shadow p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Top Referrers
				</h3>
				<div className="space-y-4">
					{analytics.topReferrers.map((referrer, index) => (
						<div
							key={referrer.id}
							className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
						>
							<div className="flex items-center space-x-4">
								<div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
									{index + 1}
								</div>
								<div>
									<div className="font-medium text-gray-900">
										{referrer.username}
									</div>
									<div className="text-sm text-gray-600">
										{referrer.referrals} referrals
									</div>
								</div>
							</div>
							<div className="text-right">
								<div className="font-semibold text-green-600">
									{formatCurrency(referrer.commission)}
								</div>
								<div className="text-sm text-gray-600">Commission</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Stats Summary */}
			<div className="bg-white rounded-lg shadow p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Performance Metrics
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="text-center">
						<div className="text-2xl font-bold text-blue-600">
							{(
								(analytics.completedReferrals / analytics.totalReferrals) *
								100
							).toFixed(1)}
							%
						</div>
						<div className="text-sm text-gray-600">Completion Rate</div>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-green-600">
							{formatCurrency(analytics.averageCommission)}
						</div>
						<div className="text-sm text-gray-600">Average Commission</div>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-purple-600">
							{(
								(analytics.totalCommission / analytics.totalRevenue) *
								100
							).toFixed(1)}
							%
						</div>
						<div className="text-sm text-gray-600">Commission Rate</div>
					</div>
				</div>
			</div>
		</div>
	);
}

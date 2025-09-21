"use client";

import {
	MemberDirectory as MemberDirectoryService,
	type MemberFilter,
	type MemberSearchResult,
} from "@/lib/analytics/member-directory";
import React, { useState, useEffect } from "react";

interface MemberDirectoryProps {
	companyId: string;
}

export function MemberDirectory({ companyId }: MemberDirectoryProps) {
	const [members, setMembers] = useState<MemberSearchResult[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [pages, setPages] = useState(1);
	const [selectedMember, setSelectedMember] =
		useState<MemberSearchResult | null>(null);
	const [showFilters, setShowFilters] = useState(false);

	const [filters, setFilters] = useState<MemberFilter>({
		sort_by: "total_commission",
		sort_order: "desc",
		status: "all",
	});

	const memberDirectory = new MemberDirectoryService();

	useEffect(() => {
		fetchMembers();
	}, [companyId, page, filters]);

	const fetchMembers = async () => {
		try {
			setLoading(true);
			const result = await memberDirectory.searchMembers(
				companyId,
				filters,
				page,
			);
			setMembers(result.members);
			setTotal(result.total);
			setPages(result.pages);
			setError(null);
		} catch (err) {
			console.error("Error fetching members:", err);
			setError("Failed to load members");
		} finally {
			setLoading(false);
		}
	};

	const handleFilterChange = (key: keyof MemberFilter, value: any) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setPage(1); // Reset to first page when filtering
	};

	const clearFilters = () => {
		setFilters({
			sort_by: "total_commission",
			sort_order: "desc",
			status: "all",
		});
		setPage(1);
	};

	const exportMembers = async (format: "csv" | "json" | "xlsx" = "csv") => {
		try {
			const exportOptions = {
				format,
				fields: [
					"username",
					"character_class",
					"level",
					"total_referrals",
					"total_commission",
					"conversion_rate",
					"engagement_score",
				],
				filters,
			};

			const data = await memberDirectory.exportMembers(
				companyId,
				exportOptions,
			);

			// Create download link
			const blob = new Blob([data], {
				type: format === "csv" ? "text/csv" : "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `members_export_${new Date().toISOString().split("T")[0]}.${format}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Error exporting members:", err);
			setError("Failed to export members");
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	const formatNumber = (num: number) => {
		return new Intl.NumberFormat("en-US").format(num);
	};

	const formatPercentage = (percent: number) => {
		return `${percent.toFixed(1)}%`;
	};

	const getClassIcon = (characterClass: string) => {
		const icons = {
			scout: "🔍",
			sage: "📚",
			champion: "🏆",
			merchant: "💰",
		};
		return icons[characterClass as keyof typeof icons] || "👤";
	};

	const getEngagementColor = (score: number) => {
		if (score >= 80) return "text-green-600 bg-green-100";
		if (score >= 60) return "text-yellow-600 bg-yellow-100";
		return "text-red-600 bg-red-100";
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
				<button
					onClick={fetchMembers}
					className="mt-2 text-red-600 hover:text-red-800 underline"
				>
					Try again
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">Member Directory</h2>
					<p className="text-gray-600">
						Manage and analyze your community members
					</p>
				</div>
				<div className="flex items-center space-x-4">
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
					>
						{showFilters ? "Hide Filters" : "Show Filters"}
					</button>
					<div className="relative">
						<select
							onChange={(e) => exportMembers(e.target.value as any)}
							className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors appearance-none pr-8"
						>
							<option value="">Export</option>
							<option value="csv">Export as CSV</option>
							<option value="json">Export as JSON</option>
						</select>
						<div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
							<span className="text-gray-500">↓</span>
						</div>
					</div>
				</div>
			</div>

			{/* Filters */}
			{showFilters && (
				<div className="bg-white rounded-lg shadow p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Search
							</label>
							<input
								type="text"
								placeholder="Search members..."
								value={filters.search || ""}
								onChange={(e) => handleFilterChange("search", e.target.value)}
								className="w-full border border-gray-300 rounded-lg px-3 py-2"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Character Class
							</label>
							<select
								value={filters.character_class || ""}
								onChange={(e) =>
									handleFilterChange(
										"character_class",
										e.target.value || undefined,
									)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2"
							>
								<option value="">All Classes</option>
								<option value="scout">Scout</option>
								<option value="sage">Sage</option>
								<option value="champion">Champion</option>
								<option value="merchant">Merchant</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Status
							</label>
							<select
								value={filters.status || "all"}
								onChange={(e) =>
									handleFilterChange("status", e.target.value as any)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2"
							>
								<option value="all">All Members</option>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Sort By
							</label>
							<select
								value={filters.sort_by || "total_commission"}
								onChange={(e) =>
									handleFilterChange("sort_by", e.target.value as any)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2"
							>
								<option value="total_commission">Commission</option>
								<option value="total_referrals">Referrals</option>
								<option value="level">Level</option>
								<option value="engagement_score">Engagement</option>
								<option value="last_active">Last Active</option>
							</select>
						</div>
					</div>

					<div className="flex justify-end mt-4 space-x-4">
						<button
							onClick={clearFilters}
							className="text-gray-600 hover:text-gray-800 px-4 py-2"
						>
							Clear Filters
						</button>
						<button
							onClick={fetchMembers}
							className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
						>
							Apply Filters
						</button>
					</div>
				</div>
			)}

			{/* Stats Overview */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-center">
						<div className="text-3xl mb-2">👥</div>
						<p className="text-sm text-gray-600">Total Members</p>
						<p className="text-2xl font-bold text-gray-900">
							{formatNumber(total)}
						</p>
					</div>
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-center">
						<div className="text-3xl mb-2">💰</div>
						<p className="text-sm text-gray-600">Avg Commission</p>
						<p className="text-2xl font-bold text-gray-900">
							{formatCurrency(
								members.reduce((sum, m) => sum + m.total_commission, 0) /
									(members.length || 1),
							)}
						</p>
					</div>
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-center">
						<div className="text-3xl mb-2">🎯</div>
						<p className="text-sm text-gray-600">Avg Conversion</p>
						<p className="text-2xl font-bold text-gray-900">
							{formatPercentage(
								members.reduce((sum, m) => sum + m.conversion_rate, 0) /
									(members.length || 1),
							)}
						</p>
					</div>
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-center">
						<div className="text-3xl mb-2">📊</div>
						<p className="text-sm text-gray-600">Avg Engagement</p>
						<p className="text-2xl font-bold text-gray-900">
							{formatPercentage(
								members.reduce((sum, m) => sum + m.engagement_score, 0) /
									(members.length || 1),
							)}
						</p>
					</div>
				</div>
			</div>

			{/* Members Table */}
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Member
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Class & Level
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Performance
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Engagement
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Last Active
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{members.map((member) => (
								<tr key={member.id} className="hover:bg-gray-50">
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center">
											<div className="flex-shrink-0 h-10 w-10">
												{member.avatar ? (
													<img
														className="h-10 w-10 rounded-full"
														src={member.avatar}
														alt=""
													/>
												) : (
													<div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
														<span className="text-gray-600 font-medium">
															{member.username.charAt(0).toUpperCase()}
														</span>
													</div>
												)}
											</div>
											<div className="ml-4">
												<div className="text-sm font-medium text-gray-900">
													{member.username}
												</div>
												<div className="text-sm text-gray-500">
													Rank #{member.rank}
												</div>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center">
											<span className="text-lg mr-2">
												{getClassIcon(member.character_class)}
											</span>
											<div>
												<div className="text-sm font-medium text-gray-900 capitalize">
													{member.character_class}
												</div>
												<div className="text-sm text-gray-500">
													Level {member.level}
												</div>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm text-gray-900">
											<div>{formatCurrency(member.total_commission)}</div>
											<div className="text-xs text-gray-500">
												{formatNumber(member.total_referrals)} referrals
											</div>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center space-x-2">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEngagementColor(member.engagement_score)}`}
											>
												{formatPercentage(member.engagement_score)}
											</span>
											<div className="text-xs text-gray-500">
												{formatPercentage(member.conversion_rate)} conv
											</div>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{new Date(member.last_active).toLocaleDateString()}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<button
											onClick={() => setSelectedMember(member)}
											className="text-blue-600 hover:text-blue-900"
										>
											View Details
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
					<div className="flex-1 flex justify-between sm:hidden">
						<button
							onClick={() => setPage(Math.max(1, page - 1))}
							disabled={page === 1}
							className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
						>
							Previous
						</button>
						<button
							onClick={() => setPage(Math.min(pages, page + 1))}
							disabled={page === pages}
							className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
						>
							Next
						</button>
					</div>
					<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p className="text-sm text-gray-700">
								Showing{" "}
								<span className="font-medium">{(page - 1) * 20 + 1}</span> to{" "}
								<span className="font-medium">
									{Math.min(page * 20, total)}
								</span>{" "}
								of <span className="font-medium">{formatNumber(total)}</span>{" "}
								results
							</p>
						</div>
						<div>
							<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
								<button
									onClick={() => setPage(Math.max(1, page - 1))}
									disabled={page === 1}
									className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									Previous
								</button>
								{Array.from({ length: Math.min(5, pages) }, (_, i) => {
									const pageNum =
										Math.max(1, Math.min(pages - 4, page - 2)) + i;
									return (
										<button
											key={pageNum}
											onClick={() => setPage(pageNum)}
											className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
												page === pageNum
													? "z-10 bg-blue-50 border-blue-500 text-blue-600"
													: "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
											}`}
										>
											{pageNum}
										</button>
									);
								})}
								<button
									onClick={() => setPage(Math.min(pages, page + 1))}
									disabled={page === pages}
									className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									Next
								</button>
							</nav>
						</div>
					</div>
				</div>
			</div>

			{/* Member Details Modal */}
			{selectedMember && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<div className="flex justify-between items-start mb-6">
								<div>
									<h3 className="text-xl font-bold text-gray-900">
										{selectedMember.username}
									</h3>
									<p className="text-gray-600">Member Details</p>
								</div>
								<button
									onClick={() => setSelectedMember(null)}
									className="text-gray-400 hover:text-gray-600"
								>
									<span className="text-2xl">×</span>
								</button>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<h4 className="font-semibold text-gray-900 mb-4">Profile</h4>
									<div className="space-y-3">
										<div className="flex justify-between">
											<span className="text-gray-600">Character Class</span>
											<span className="font-medium">
												{selectedMember.character_class}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">Level</span>
											<span className="font-medium">
												{selectedMember.level}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">Rank</span>
											<span className="font-medium">
												#{selectedMember.rank}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">Status</span>
											<span
												className={`font-medium ${
													selectedMember.is_active
														? "text-green-600"
														: "text-red-600"
												}`}
											>
												{selectedMember.is_active ? "Active" : "Inactive"}
											</span>
										</div>
									</div>
								</div>

								<div>
									<h4 className="font-semibold text-gray-900 mb-4">
										Performance
									</h4>
									<div className="space-y-3">
										<div className="flex justify-between">
											<span className="text-gray-600">Total Commission</span>
											<span className="font-medium">
												{formatCurrency(selectedMember.total_commission)}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">Total Referrals</span>
											<span className="font-medium">
												{formatNumber(selectedMember.total_referrals)}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">Conversion Rate</span>
											<span className="font-medium">
												{formatPercentage(selectedMember.conversion_rate)}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">Engagement Score</span>
											<span className="font-medium">
												{formatPercentage(selectedMember.engagement_score)}
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className="mt-6">
								<h4 className="font-semibold text-gray-900 mb-4">Badges</h4>
								<div className="flex flex-wrap gap-2">
									{selectedMember.badges.map((badge, index) => (
										<span key={index} className="text-2xl">
											{badge}
										</span>
									))}
									{selectedMember.badges.length === 0 && (
										<span className="text-gray-500">No badges earned yet</span>
									)}
								</div>
							</div>

							<div className="mt-6 flex justify-end space-x-4">
								<button
									onClick={() => setSelectedMember(null)}
									className="px-4 py-2 text-gray-700 hover:text-gray-900"
								>
									Close
								</button>
								<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
									View Full Profile
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

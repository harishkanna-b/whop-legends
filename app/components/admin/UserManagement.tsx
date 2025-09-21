"use client";

import { useEffect, useState } from "react";

interface User {
	id: string;
	email: string;
	username: string;
	level: number;
	totalXP: number;
	characterClass: string;
	isActive: boolean;
	createdAt: string;
	lastLogin: string;
	stats: {
		referrals: number;
		friends: number;
		achievements: number;
	};
}

export default function UserManagement() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		loadUsers();
	}, []);

	const loadUsers = async () => {
		try {
			const response = await fetch("/api/admin/users");
			if (response.ok) {
				const data = await response.json();
				setUsers(data);
			}
		} catch (error) {
			console.error("Error loading users:", error);
		} finally {
			setLoading(false);
		}
	};

	const filteredUsers = users.filter(
		(user) =>
			user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.username?.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const getCharacterClassIcon = (className: string) => {
		switch (className) {
			case "scout":
				return "🔍";
			case "sage":
				return "🧠";
			case "champion":
				return "🏆";
			default:
				return "❓";
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const handleUserAction = async (
		userId: string,
		action: "ban" | "activate" | "reset",
	) => {
		try {
			const response = await fetch(`/api/admin/users/${userId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action }),
			});

			if (response.ok) {
				await loadUsers();
			}
		} catch (error) {
			console.error("Error performing user action:", error);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				Loading users...
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold text-gray-900">User Management</h2>
				<div className="flex items-center space-x-4">
					<div className="relative">
						<input
							type="text"
							placeholder="Search users..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
					</div>
					<button
						onClick={() => {
							// Add new user logic
						}}
						className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
					>
						Add User
					</button>
				</div>
			</div>

			{/* Users Table */}
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									User
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Level
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Class
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Stats
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Joined
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredUsers.map((user) => (
								<tr key={user.id} className="hover:bg-gray-50">
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center">
											<div className="flex-shrink-0 h-10 w-10">
												<div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
													{user.username?.[0]?.toUpperCase() ||
														user.email[0].toUpperCase()}
												</div>
											</div>
											<div className="ml-4">
												<div className="text-sm font-medium text-gray-900">
													{user.username || "N/A"}
												</div>
												<div className="text-sm text-gray-500">
													{user.email}
												</div>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm text-gray-900">
											Level {user.level}
										</div>
										<div className="text-sm text-gray-500">
											{user.totalXP.toLocaleString()} XP
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center">
											<span className="text-lg mr-2">
												{getCharacterClassIcon(user.characterClass)}
											</span>
											<span className="text-sm text-gray-900 capitalize">
												{user.characterClass}
											</span>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm text-gray-900">
											<div>{user.stats.referrals} referrals</div>
											<div>{user.stats.friends} friends</div>
											<div>{user.stats.achievements} achievements</div>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
												user.isActive
													? "bg-green-100 text-green-800"
													: "bg-red-100 text-red-800"
											}`}
										>
											{user.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{formatDate(user.createdAt)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<div className="flex space-x-2">
											<button
												onClick={() => {
													setSelectedUser(user);
													setShowModal(true);
												}}
												className="text-blue-600 hover:text-blue-900"
											>
												View
											</button>
											{user.isActive ? (
												<button
													onClick={() => handleUserAction(user.id, "ban")}
													className="text-red-600 hover:text-red-900"
												>
													Ban
												</button>
											) : (
												<button
													onClick={() => handleUserAction(user.id, "activate")}
													className="text-green-600 hover:text-green-900"
												>
													Activate
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* User Detail Modal */}
			{showModal && selectedUser && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
					<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
						<div className="mt-3">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								User Details
							</h3>
							<div className="space-y-3">
								<div>
									<label className="text-sm font-medium text-gray-700">
										Email
									</label>
									<p className="text-sm text-gray-900">{selectedUser.email}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-700">
										Username
									</label>
									<p className="text-sm text-gray-900">
										{selectedUser.username || "N/A"}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-700">
										Level
									</label>
									<p className="text-sm text-gray-900">
										{selectedUser.level} ({selectedUser.totalXP} XP)
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-700">
										Character Class
									</label>
									<p className="text-sm text-gray-900 capitalize">
										{selectedUser.characterClass}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-700">
										Last Login
									</label>
									<p className="text-sm text-gray-900">
										{formatDate(selectedUser.lastLogin)}
									</p>
								</div>
							</div>
							<div className="mt-6 flex justify-end space-x-3">
								<button
									onClick={() => setShowModal(false)}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

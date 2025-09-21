"use client";

import type { Team, TeamInvite } from "@/lib/social";
import { useEffect, useState } from "react";

interface TeamsListProps {
	userId: string;
}

export default function TeamsList({ userId }: TeamsListProps) {
	const [teams, setTeams] = useState<Team[]>([]);
	const [discoverableTeams, setDiscoverableTeams] = useState<Team[]>([]);
	const [invites, setInvites] = useState<TeamInvite[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<
		"my-teams" | "discover" | "invites"
	>("my-teams");
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showJoinModal, setShowJoinModal] = useState(false);

	useEffect(() => {
		loadTeams();
		loadDiscoverableTeams();
		loadInvites();
	}, [userId]);

	const loadTeams = async () => {
		try {
			const response = await fetch(
				`/api/social/teams?userId=${userId}&action=my-teams`,
			);
			const result = await response.json();
			if (result.success) {
				setTeams(result.data);
			}
		} catch (error) {
			console.error("Error loading teams:", error);
		} finally {
			setLoading(false);
		}
	};

	const loadDiscoverableTeams = async () => {
		try {
			const response = await fetch(
				`/api/social/teams?userId=${userId}&action=discover`,
			);
			const result = await response.json();
			if (result.success) {
				setDiscoverableTeams(result.data);
			}
		} catch (error) {
			console.error("Error loading discoverable teams:", error);
		}
	};

	const loadInvites = async () => {
		try {
			// This would need to be implemented in the API
			// For now, we'll simulate it
			setInvites([]);
		} catch (error) {
			console.error("Error loading invites:", error);
		}
	};

	const createTeam = async (formData: FormData) => {
		try {
			const response = await fetch("/api/social/teams/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					leaderId: userId,
					name: formData.get("name"),
					description: formData.get("description"),
					maxMembers: Number.parseInt(formData.get("maxMembers") as string),
					isPrivate: formData.get("isPrivate") === "true",
				}),
			});
			const result = await response.json();
			if (result.success) {
				setShowCreateModal(false);
				await loadTeams();
			}
			return result;
		} catch (error) {
			console.error("Error creating team:", error);
			return { success: false, error: "Failed to create team" };
		}
	};

	const joinTeamViaCode = async (inviteCode: string) => {
		try {
			const response = await fetch(
				`/api/social/teams?userId=${userId}&action=join-via-code&inviteCode=${inviteCode}`,
			);
			const result = await response.json();
			if (result.success) {
				setShowJoinModal(false);
				await loadTeams();
			}
			return result;
		} catch (error) {
			console.error("Error joining team:", error);
			return { success: false, error: "Failed to join team" };
		}
	};

	const leaveTeam = async (teamId: string) => {
		try {
			const response = await fetch("/api/social/teams/leave", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, teamId }),
			});
			const result = await response.json();
			if (result.success) {
				await loadTeams();
			}
			return result;
		} catch (error) {
			console.error("Error leaving team:", error);
			return { success: false, error: "Failed to leave team" };
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow-lg p-6">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold">Teams</h2>
				<div className="flex space-x-2">
					<button
						onClick={() => setShowJoinModal(true)}
						className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
					>
						Join Team
					</button>
					<button
						onClick={() => setShowCreateModal(true)}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Create Team
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex space-x-4 mb-6">
				<button
					className={`px-4 py-2 rounded-lg ${
						activeTab === "my-teams"
							? "bg-blue-600 text-white"
							: "bg-gray-200 text-gray-700 hover:bg-gray-300"
					}`}
					onClick={() => setActiveTab("my-teams")}
				>
					My Teams ({teams.length})
				</button>
				<button
					className={`px-4 py-2 rounded-lg ${
						activeTab === "discover"
							? "bg-blue-600 text-white"
							: "bg-gray-200 text-gray-700 hover:bg-gray-300"
					}`}
					onClick={() => setActiveTab("discover")}
				>
					Discover ({discoverableTeams.length})
				</button>
				<button
					className={`px-4 py-2 rounded-lg ${
						activeTab === "invites"
							? "bg-blue-600 text-white"
							: "bg-gray-200 text-gray-700 hover:bg-gray-300"
					}`}
					onClick={() => setActiveTab("invites")}
				>
					Invites ({invites.length})
				</button>
			</div>

			{/* My Teams */}
			{activeTab === "my-teams" && (
				<div className="space-y-4">
					{teams.length === 0 ? (
						<p className="text-gray-500 text-center py-8">
							You're not part of any teams yet. Create or join one!
						</p>
					) : (
						teams.map((team) => (
							<div
								key={team.id}
								className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
							>
								<div className="flex items-center space-x-4">
									<div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold">
										{team.name[0]}
									</div>
									<div>
										<h3 className="font-semibold">{team.name}</h3>
										<p className="text-sm text-gray-500">{team.description}</p>
										<p className="text-xs text-gray-400">
											{team.members?.length || 0}/{team.maxMembers} members •
											Led by {team.leader?.username || "Unknown"}
										</p>
									</div>
								</div>
								<div className="flex space-x-2">
									{team.leaderId === userId && (
										<span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
											Leader
										</span>
									)}
									<button
										onClick={() => leaveTeam(team.id)}
										className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
									>
										Leave
									</button>
									<button
										onClick={() => (window.location.href = `/team/${team.id}`)}
										className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
									>
										View
									</button>
								</div>
							</div>
						))
					)}
				</div>
			)}

			{/* Discover Teams */}
			{activeTab === "discover" && (
				<div className="space-y-4">
					{discoverableTeams.length === 0 ? (
						<p className="text-gray-500 text-center py-8">
							No discoverable teams available.
						</p>
					) : (
						discoverableTeams.map((team) => (
							<div
								key={team.id}
								className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
							>
								<div className="flex items-center space-x-4">
									<div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
										{team.name[0]}
									</div>
									<div>
										<h3 className="font-semibold">{team.name}</h3>
										<p className="text-sm text-gray-500">{team.description}</p>
										<p className="text-xs text-gray-400">
											{team.members?.length || 0}/{team.maxMembers} members •{" "}
											{team.isPrivate ? "Private" : "Public"}
										</p>
									</div>
								</div>
								<div className="flex space-x-2">
									<button
										onClick={() => setShowJoinModal(true)}
										className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
									>
										Join
									</button>
									<button
										onClick={() => (window.location.href = `/team/${team.id}`)}
										className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
									>
										View
									</button>
								</div>
							</div>
						))
					)}
				</div>
			)}

			{/* Team Invites */}
			{activeTab === "invites" && (
				<div className="space-y-4">
					{invites.length === 0 ? (
						<p className="text-gray-500 text-center py-8">
							No pending team invitations.
						</p>
					) : (
						invites.map((invite) => (
							<div
								key={invite.id}
								className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
							>
								<div className="flex items-center space-x-4">
									<div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
										{invite.team?.name?.[0] || "T"}
									</div>
									<div>
										<h3 className="font-semibold">
											{invite.team?.name || "Unknown Team"}
										</h3>
										<p className="text-sm text-gray-500">
											{invite.message || "No message"}
										</p>
										<p className="text-xs text-gray-400">
											Invited by {invite.inviter?.username || "Unknown"} •
											Expires {new Date(invite.expiresAt).toLocaleDateString()}
										</p>
									</div>
								</div>
								<div className="flex space-x-2">
									<button
										onClick={() => respondToInvite(invite.id, "accept")}
										className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
									>
										Accept
									</button>
									<button
										onClick={() => respondToInvite(invite.id, "reject")}
										className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
									>
										Reject
									</button>
								</div>
							</div>
						))
					)}
				</div>
			)}

			{/* Create Team Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<h3 className="text-xl font-bold mb-4">Create Team</h3>
						<form action={createTeam} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Team Name
								</label>
								<input
									type="text"
									name="name"
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Description
								</label>
								<textarea
									name="description"
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									rows={3}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Max Members
								</label>
								<input
									type="number"
									name="maxMembers"
									min="2"
									max="50"
									defaultValue="10"
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div className="flex items-center">
								<input type="checkbox" name="isPrivate" className="mr-2" />
								<label className="text-sm font-medium text-gray-700">
									Private Team
								</label>
							</div>
							<div className="flex justify-end space-x-2">
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									Create
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Join Team Modal */}
			{showJoinModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<h3 className="text-xl font-bold mb-4">Join Team</h3>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								const formData = new FormData(e.currentTarget);
								joinTeamViaCode(formData.get("inviteCode") as string);
							}}
							className="space-y-4"
						>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Invite Code
								</label>
								<input
									type="text"
									name="inviteCode"
									required
									placeholder="Enter team invite code"
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div className="flex justify-end space-x-2">
								<button
									type="button"
									onClick={() => setShowJoinModal(false)}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
								>
									Join
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

// Helper function to respond to team invites
function respondToInvite(inviteId: string, action: "accept" | "reject") {
	// This would be implemented to call the team invite respond API
	console.log(`Responding to invite ${inviteId} with ${action}`);
}

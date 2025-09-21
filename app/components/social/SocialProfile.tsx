"use client";

import type { SocialActivity, SocialProfile } from "@/lib/social";
import { useEffect, useState } from "react";

interface SocialProfileProps {
	userId: string;
	isOwnProfile?: boolean;
}

export default function SocialProfile({
	userId,
	isOwnProfile = false,
}: SocialProfileProps) {
	const [profile, setProfile] = useState<SocialProfile | null>(null);
	const [activity, setActivity] = useState<SocialActivity[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(false);
	const [editForm, setEditForm] = useState({
		username: "",
		bio: "",
		location: "",
		website: "",
		activityStatus: "offline",
	});

	useEffect(() => {
		loadProfile();
		loadActivity();
	}, [userId]);

	const loadProfile = async () => {
		try {
			const response = await fetch(
				`/api/social/profile?userId=${userId}&action=get`,
			);
			const result = await response.json();
			if (result.success) {
				setProfile(result.data);
				setEditForm({
					username: result.data.username || "",
					bio: result.data.bio || "",
					location: result.data.location || "",
					website: result.data.website || "",
					activityStatus: result.data.activityStatus || "offline",
				});
			}
		} catch (error) {
			console.error("Error loading profile:", error);
		} finally {
			setLoading(false);
		}
	};

	const loadActivity = async () => {
		try {
			const response = await fetch(
				`/api/social/profile?userId=${userId}&action=activity&limit=10`,
			);
			const result = await response.json();
			if (result.success) {
				setActivity(result.data);
			}
		} catch (error) {
			console.error("Error loading activity:", error);
		}
	};

	const updateProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const response = await fetch("/api/social/profile/update", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, updates: editForm }),
			});
			const result = await response.json();
			if (result.success) {
				setProfile(result.data);
				setEditing(false);
			}
		} catch (error) {
			console.error("Error updating profile:", error);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "online":
				return "bg-green-500";
			case "away":
				return "bg-yellow-500";
			case "busy":
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "online":
				return "Online";
			case "away":
				return "Away";
			case "busy":
				return "Busy";
			default:
				return "Offline";
		}
	};

	const getActivityIcon = (type: string) => {
		switch (type) {
			case "friend_request_sent":
				return "🤝";
			case "friend_request_accepted":
				return "✅";
			case "team_created":
				return "🏆";
			case "team_joined":
				return "🚀";
			case "level_up":
				return "⬆️";
			case "achievement_unlocked":
				return "🏅";
			default:
				return "📝";
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="bg-white rounded-lg shadow-lg p-6">
				<p className="text-gray-500 text-center py-8">Profile not found.</p>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow-lg overflow-hidden">
			{/* Cover Photo */}
			<div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
				{isOwnProfile && editing && (
					<button className="absolute top-4 right-4 bg-white bg-opacity-20 text-white px-3 py-1 rounded-lg text-sm hover:bg-opacity-30 transition-colors">
						Change Cover
					</button>
				)}
			</div>

			{/* Profile Header */}
			<div className="relative px-6 pb-6">
				<div className="absolute -top-12 left-6">
					<div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
						<div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
							{profile.username?.[0] || "?"}
						</div>
					</div>
					{isOwnProfile && editing && (
						<button className="absolute bottom-0 right-0 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm hover:bg-blue-700 transition-colors">
							📷
						</button>
					)}
				</div>

				<div className="pt-16">
					<div className="flex justify-between items-start">
						<div>
							{editing ? (
								<form onSubmit={updateProfile} className="space-y-4">
									<div>
										<input
											type="text"
											value={editForm.username}
											onChange={(e) =>
												setEditForm({ ...editForm, username: e.target.value })
											}
											className="text-2xl font-bold bg-gray-100 px-2 py-1 rounded"
											placeholder="Username"
										/>
									</div>
									<div>
										<textarea
											value={editForm.bio}
											onChange={(e) =>
												setEditForm({ ...editForm, bio: e.target.value })
											}
											className="w-full bg-gray-100 px-2 py-1 rounded"
											rows={3}
											placeholder="Bio"
										/>
									</div>
									<div className="flex space-x-4">
										<div>
											<input
												type="text"
												value={editForm.location}
												onChange={(e) =>
													setEditForm({ ...editForm, location: e.target.value })
												}
												className="bg-gray-100 px-2 py-1 rounded"
												placeholder="Location"
											/>
										</div>
										<div>
											<input
												type="url"
												value={editForm.website}
												onChange={(e) =>
													setEditForm({ ...editForm, website: e.target.value })
												}
												className="bg-gray-100 px-2 py-1 rounded"
												placeholder="Website"
											/>
										</div>
									</div>
									<div className="flex space-x-2">
										<button
											type="submit"
											className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
										>
											Save
										</button>
										<button
											type="button"
											onClick={() => setEditing(false)}
											className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
										>
											Cancel
										</button>
									</div>
								</form>
							) : (
								<>
									<h1 className="text-2xl font-bold">
										{profile.username || "Anonymous User"}
									</h1>
									<p className="text-gray-600 mt-1">
										{profile.bio || "No bio available"}
									</p>
									<div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
										{profile.location && <span>📍 {profile.location}</span>}
										{profile.website && (
											<a
												href={profile.website}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 hover:underline"
											>
												🔗 {profile.website}
											</a>
										)}
										<div className="flex items-center space-x-2">
											<div
												className={`w-2 h-2 rounded-full ${getStatusColor(profile.activityStatus)}`}
											/>
											<span>{getStatusText(profile.activityStatus)}</span>
										</div>
									</div>
								</>
							)}
						</div>
						{isOwnProfile && !editing && (
							<button
								onClick={() => setEditing(true)}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Edit Profile
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Stats */}
			<div className="border-t border-gray-200 px-6 py-4">
				<div className="grid grid-cols-4 gap-4 text-center">
					<div>
						<div className="text-2xl font-bold text-blue-600">
							{profile.stats?.friendsCount || 0}
						</div>
						<div className="text-sm text-gray-500">Friends</div>
					</div>
					<div>
						<div className="text-2xl font-bold text-purple-600">
							{profile.stats?.teamsCount || 0}
						</div>
						<div className="text-sm text-gray-500">Teams</div>
					</div>
					<div>
						<div className="text-2xl font-bold text-green-600">
							{profile.stats?.achievementsCount || 0}
						</div>
						<div className="text-sm text-gray-500">Achievements</div>
					</div>
					<div>
						<div className="text-2xl font-bold text-orange-600">
							{profile.stats?.totalActivity || 0}
						</div>
						<div className="text-sm text-gray-500">Activity</div>
					</div>
				</div>
			</div>

			{/* Recent Activity */}
			<div className="border-t border-gray-200 px-6 py-4">
				<h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
				{activity.length === 0 ? (
					<p className="text-gray-500 text-center py-4">No recent activity.</p>
				) : (
					<div className="space-y-3">
						{activity.map((item) => (
							<div
								key={item.id}
								className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
							>
								<div className="text-2xl">{getActivityIcon(item.type)}</div>
								<div className="flex-1">
									<p className="text-sm">{item.description}</p>
									<p className="text-xs text-gray-500">
										{new Date(item.createdAt).toLocaleString()}
									</p>
								</div>
								{item.isPublic && (
									<span className="text-xs text-gray-400">🌐</span>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

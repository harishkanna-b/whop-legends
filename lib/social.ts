import { supabase, supabaseService } from "./supabase-client";

export interface Friend {
	id: string;
	userId: string;
	friendId: string;
	status: "pending" | "accepted" | "rejected" | "blocked";
	requestedAt: string;
	respondedAt?: string;
	metadata?: any;
	friend?: {
		id: string;
		username: string;
		avatar?: string;
		socialProfile?: {
			bio?: string;
		};
	};
}

export interface FriendRequest {
	id: string;
	requesterId: string;
	recipientId: string;
	status: "pending" | "accepted" | "rejected" | "cancelled";
	message?: string;
	requestedAt: string;
	respondedAt?: string;
	metadata?: any;
	requester?: {
		id: string;
		username: string;
		avatar?: string;
	};
	recipient?: {
		id: string;
		username: string;
		avatar?: string;
	};
}

export interface Team {
	id: string;
	name: string;
	description: string;
	leaderId: string;
	avatar?: string;
	banner?: string;
	maxMembers: number;
	isPrivate: boolean;
	inviteCode: string;
	settings: TeamSettings;
	stats: TeamStats;
	createdAt: string;
	updatedAt: string;
	members?: TeamMember[];
	leader?: {
		id: string;
		username: string;
		avatar?: string;
	};
}

export interface TeamSettings {
	requireApproval: boolean;
	allowInvites: boolean;
	allowApplications: boolean;
	showInSearch: boolean;
	levelRequirement?: number;
	referralRequirement?: number;
	customRequirements?: string[];
}

export interface TeamStats {
	totalReferrals: number;
	totalValue: number;
	averageLevel: number;
	memberCount: number;
	achievementsUnlocked: number;
	rank: number;
}

export interface TeamMember {
	id: string;
	teamId: string;
	userId: string;
	role: "leader" | "admin" | "member";
	joinedAt: string;
	contributions: TeamContributions;
	isActive: boolean;
}

export interface TeamContributions {
	referrals: number;
	value: number;
	invites: number;
	achievements: number;
}

export interface SocialProfile {
	userId: string;
	username: string;
	avatar?: string;
	banner?: string;
	bio?: string;
	location?: string;
	website?: string;
	socialLinks: SocialLink[];
	privacySettings: PrivacySettings;
	activityStatus: "online" | "offline" | "away" | "busy";
	lastSeen: string;
	stats: SocialStats;
	achievements: SocialAchievement[];
}

export interface SocialLink {
	platform: string;
	url: string;
	isPublic: boolean;
}

export interface PrivacySettings {
	showProfile: boolean;
	showStats: boolean;
	showFriends: boolean;
	showTeams: boolean;
	allowFriendRequests: boolean;
	allowTeamInvites: boolean;
	allowMessages: boolean;
}

export interface SocialStats {
	friendsCount: number;
	teamsCount: number;
	referralsGiven: number;
	referralsReceived: number;
	totalValueGenerated: number;
	socialAchievements: number;
	rank: number;
	pendingFriendRequests: number;
	pendingTeamInvites: number;
	totalActivity: number;
	achievementsCount: number;
}

export interface SocialAchievement {
	id: string;
	name: string;
	description: string;
	icon: string;
	unlockedAt: string;
	rarity: string;
	category: string;
}

export interface TeamInvite {
	id: string;
	teamId: string;
	inviterId: string;
	inviteeId: string;
	status: "pending" | "accepted" | "rejected" | "expired";
	message?: string;
	invitedAt: string;
	expiresAt: string;
	respondedAt?: string;
	team?: {
		id: string;
		name: string;
		description: string;
		avatar?: string;
	};
	inviter?: {
		id: string;
		username: string;
		avatar?: string;
	};
}

export interface SocialActivity {
	id: string;
	userId: string;
	type:
		| "friend_request"
		| "friend_accept"
		| "team_join"
		| "team_leave"
		| "achievement"
		| "milestone";
	description: string;
	metadata?: any;
	createdAt: string;
	isPublic: boolean;
}

export class SocialManager {
	private static instance: SocialManager;

	constructor() {
		this.initializeSocialTables();
	}

	static getInstance(): SocialManager {
		if (!SocialManager.instance) {
			SocialManager.instance = new SocialManager();
		}
		return SocialManager.instance;
	}

	private async initializeSocialTables(): Promise<void> {
		// Tables will be created by Prisma, so this is just for any additional setup
		console.log("Social manager initialized");
	}

	// Friend Management
	async sendFriendRequest(
		requesterId: string,
		recipientId: string,
		message?: string,
	): Promise<FriendRequest> {
		try {
			// Check if request already exists
			const { data: existingRequest } = await supabase()
				.from("friend_requests")
				.select("*")
				.or(
					`(requester_id.eq.${requesterId} AND recipient_id.eq.${recipientId})`,
				)
				.or(
					`(requester_id.eq.${recipientId} AND recipient_id.eq.${requesterId})`,
				)
				.in("status", ["pending", "accepted"])
				.single();

			if (existingRequest) {
				throw new Error(
					"Friend request already exists or users are already friends",
				);
			}

			const { data, error } = await supabase()
				.from("friend_requests")
				.insert({
					requester_id: requesterId,
					recipient_id: recipientId,
					message,
					status: "pending",
					requested_at: new Date().toISOString(),
				})
				.select()
				.single();

			if (error) throw error;

			return this.mapFriendRequest(data);
		} catch (error) {
			console.error("Error sending friend request:", error);
			throw error;
		}
	}

	async respondToFriendRequest(
		requestId: string,
		userId: string,
		accept: boolean,
	): Promise<void> {
		try {
			const { data: request, error: fetchError } = await supabase()
				.from("friend_requests")
				.select("*")
				.eq("id", requestId)
				.eq("recipient_id", userId)
				.eq("status", "pending")
				.single();

			if (fetchError || !request) {
				throw new Error("Friend request not found or already responded");
			}

			const newStatus = accept ? "accepted" : "rejected";

			const { error } = await supabase()
				.from("friend_requests")
				.update({
					status: newStatus,
					responded_at: new Date().toISOString(),
				})
				.eq("id", requestId);

			if (error) throw error;

			// If accepted, create friendship entries
			if (accept) {
				await supabase()
					.from("friends")
					.insert([
						{
							user_id: request.requester_id,
							friend_id: request.recipient_id,
							status: "accepted",
							requested_at: request.requested_at,
							responded_at: new Date().toISOString(),
						},
						{
							user_id: request.recipient_id,
							friend_id: request.requester_id,
							status: "accepted",
							requested_at: request.requested_at,
							responded_at: new Date().toISOString(),
						},
					]);

				// Log social activity
				await this.logSocialActivity(
					request.requester_id,
					"friend_accept",
					`You are now friends with ${request.recipient_id}`,
				);
				await this.logSocialActivity(
					request.recipient_id,
					"friend_accept",
					`You are now friends with ${request.requester_id}`,
				);
			}
		} catch (error) {
			console.error("Error responding to friend request:", error);
			throw error;
		}
	}

	async getFriends(
		userId: string,
		status: "accepted" | "pending" = "accepted",
	): Promise<Friend[]> {
		try {
			const { data, error } = await supabase()
				.from("friends")
				.select(`
          *,
          friend:users!friends_friend_id_fkey(*)
        `)
				.eq("user_id", userId)
				.eq("status", status)
				.order("requested_at", { ascending: false });

			if (error) throw error;

			return data.map((item: any) => this.mapFriend(item));
		} catch (error) {
			console.error("Error getting friends:", error);
			return [];
		}
	}

	async getFriendRequests(
		userId: string,
		type: "sent" | "received" = "received",
	): Promise<FriendRequest[]> {
		try {
			const column = type === "sent" ? "requester_id" : "recipient_id";
			const userColumn = type === "sent" ? "recipient" : "requester";

			const { data, error } = await supabase()
				.from("friend_requests")
				.select(`
          *,
          ${userColumn}:users!friend_requests_${userColumn}_id_fkey(*)
        `)
				.eq(column, userId)
				.eq("status", "pending")
				.order("requested_at", { ascending: false });

			if (error) throw error;

			return data.map((item: any) => this.mapFriendRequest(item));
		} catch (error) {
			console.error("Error getting friend requests:", error);
			return [];
		}
	}

	async removeFriend(userId: string, friendId: string): Promise<void> {
		try {
			await supabase()
				.from("friends")
				.delete()
				.or(`(user_id.eq.${userId} AND friend_id.eq.${friendId})`)
				.or(`(user_id.eq.${friendId} AND friend_id.eq.${userId})`);

			// Log social activity
			await this.logSocialActivity(
				userId,
				"friend_remove",
				`You are no longer friends with ${friendId}`,
			);
		} catch (error) {
			console.error("Error removing friend:", error);
			throw error;
		}
	}

	// Team Management
	async createTeam(
		leaderId: string,
		name: string,
		description: string,
		options: {
			maxMembers?: number;
			isPrivate?: boolean;
			avatar?: string;
			banner?: string;
		} = {},
	): Promise<Team> {
		try {
			const inviteCode = this.generateInviteCode();

			const teamData = {
				name,
				description,
				leader_id: leaderId,
				avatar: options.avatar,
				banner: options.banner,
				max_members: options.maxMembers || 10,
				is_private: options.isPrivate || false,
				invite_code: inviteCode,
				settings: {
					requireApproval: false,
					allowInvites: true,
					allowApplications: true,
					showInSearch: !options.isPrivate,
				},
				stats: {
					totalReferrals: 0,
					totalValue: 0,
					averageLevel: 0,
					memberCount: 1,
					achievementsUnlocked: 0,
					rank: 0,
				},
			};

			const { data, error } = await supabase()
				.from("teams")
				.insert(teamData)
				.select()
				.single();

			if (error) throw error;

			// Add leader as first member
			await supabase()
				.from("team_members")
				.insert({
					team_id: data.id,
					user_id: leaderId,
					role: "leader",
					contributions: {
						referrals: 0,
						value: 0,
						invites: 0,
						achievements: 0,
					},
					is_active: true,
				});

			// Log social activity
			await this.logSocialActivity(
				leaderId,
				"team_create",
				`Created team: ${name}`,
			);

			return this.mapTeam(data);
		} catch (error) {
			console.error("Error creating team:", error);
			throw error;
		}
	}

	async joinTeam(
		userId: string,
		teamId: string,
		inviteCode?: string,
	): Promise<void> {
		try {
			const { data: team, error: teamError } = await supabase()
				.from("teams")
				.select("*")
				.eq("id", teamId)
				.single();

			if (teamError || !team) {
				throw new Error("Team not found");
			}

			// Check if team is private and invite code is valid
			if (team.is_private && team.invite_code !== inviteCode) {
				throw new Error("Invalid invite code");
			}

			// Check if user is already a member
			const { data: existingMember } = await supabase()
				.from("team_members")
				.select("*")
				.eq("team_id", teamId)
				.eq("user_id", userId)
				.single();

			if (existingMember) {
				throw new Error("Already a member of this team");
			}

			// Check team capacity
			const { data: memberCount } = await supabase()
				.from("team_members")
				.select("*", { count: "exact", head: true })
				.eq("team_id", teamId);

			if (memberCount && memberCount.length >= team.max_members) {
				throw new Error("Team is full");
			}

			// Add member to team
			await supabase()
				.from("team_members")
				.insert({
					team_id: teamId,
					user_id: userId,
					role: "member",
					contributions: {
						referrals: 0,
						value: 0,
						invites: 0,
						achievements: 0,
					},
					is_active: true,
				});

			// Update team stats
			await supabase()
				.from("teams")
				.update({
					stats: {
						...team.stats,
						memberCount: (team.stats.memberCount || 0) + 1,
					},
				})
				.eq("id", teamId);

			// Log social activity
			await this.logSocialActivity(
				userId,
				"team_join",
				`Joined team: ${team.name}`,
			);
		} catch (error) {
			console.error("Error joining team:", error);
			throw error;
		}
	}

	async leaveTeam(userId: string, teamId: string): Promise<void> {
		try {
			const { data: member, error: memberError } = await supabase()
				.from("team_members")
				.select("*")
				.eq("team_id", teamId)
				.eq("user_id", userId)
				.single();

			if (memberError || !member) {
				throw new Error("Not a member of this team");
			}

			if (member.role === "leader") {
				throw new Error("Team leader cannot leave. Transfer leadership first.");
			}

			await supabase()
				.from("team_members")
				.delete()
				.eq("team_id", teamId)
				.eq("user_id", userId);

			// Update team stats
			const { data: team } = await supabase()
				.from("teams")
				.select("stats")
				.eq("id", teamId)
				.single();

			if (team) {
				await supabase()
					.from("teams")
					.update({
						stats: {
							...team.stats,
							memberCount: Math.max(0, (team.stats.memberCount || 0) - 1),
						},
					})
					.eq("id", teamId);
			}

			// Log social activity
			await this.logSocialActivity(userId, "team_leave", "Left team");
		} catch (error) {
			console.error("Error leaving team:", error);
			throw error;
		}
	}

	async getTeams(
		userId: string,
		type: "member" | "all" = "member",
	): Promise<Team[]> {
		try {
			let query = supabase()
				.from("teams")
				.select(`
        *,
        leader:users!teams_leader_id_fkey(*),
        members:team_members(*, user:users!team_members_user_id_fkey(*))
      `);

			if (type === "member") {
				const { data: memberTeams } = await supabase()
					.from("team_members")
					.select("team_id")
					.eq("user_id", userId)
					.eq("is_active", true);

				const teamIds = memberTeams?.map((mt: any) => mt.team_id) || [];
				query = query.in("id", teamIds);
			}

			const { data, error } = await query.order("created_at", {
				ascending: false,
			});

			if (error) throw error;

			return data.map((team: any) => this.mapTeam(team));
		} catch (error) {
			console.error("Error getting teams:", error);
			return [];
		}
	}

	async getTeamMembers(teamId: string): Promise<TeamMember[]> {
		try {
			const { data, error } = await supabase()
				.from("team_members")
				.select(`
          *,
          user:users!team_members_user_id_fkey(*)
        `)
				.eq("team_id", teamId)
				.eq("is_active", true)
				.order("joined_at", { ascending: true });

			if (error) throw error;

			return data.map((member: any) => this.mapTeamMember(member));
		} catch (error) {
			console.error("Error getting team members:", error);
			return [];
		}
	}

	async inviteToTeam(
		inviterId: string,
		inviteeId: string,
		teamId: string,
		message?: string,
	): Promise<void> {
		try {
			const { data: team, error: teamError } = await supabase()
				.from("teams")
				.select("*")
				.eq("id", teamId)
				.single();

			if (teamError || !team) {
				throw new Error("Team not found");
			}

			// Check if inviter has permission
			const { data: inviter } = await supabase()
				.from("team_members")
				.select("role")
				.eq("team_id", teamId)
				.eq("user_id", inviterId)
				.single();

			if (!inviter || !["leader", "admin"].includes(inviter.role)) {
				throw new Error("No permission to invite members");
			}

			// Check if user is already a member
			const { data: existingMember } = await supabase()
				.from("team_members")
				.select("*")
				.eq("team_id", teamId)
				.eq("user_id", inviteeId)
				.single();

			if (existingMember) {
				throw new Error("User is already a member of this team");
			}

			// Create team invite
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

			await supabase().from("team_invites").insert({
				team_id: teamId,
				inviter_id: inviterId,
				invitee_id: inviteeId,
				message,
				status: "pending",
				invited_at: new Date().toISOString(),
				expires_at: expiresAt.toISOString(),
			});

			// Log social activity
			await this.logSocialActivity(
				inviterId,
				"team_invite",
				`Invited ${inviteeId} to join ${team.name}`,
			);
		} catch (error) {
			console.error("Error inviting to team:", error);
			throw error;
		}
	}

	// Social Profile Management
	async getSocialProfile(userId: string): Promise<SocialProfile | null> {
		try {
			const { data: profile, error } = await supabase()
				.from("social_profiles")
				.select("*")
				.eq("user_id", userId)
				.single();

			if (error) return null;

			return this.mapSocialProfile(profile);
		} catch (error) {
			console.error("Error getting social profile:", error);
			return null;
		}
	}

	async updateSocialProfile(
		userId: string,
		updates: Partial<SocialProfile>,
	): Promise<void> {
		try {
			await supabase()
				.from("social_profiles")
				.upsert({
					user_id: userId,
					...updates,
					updated_at: new Date().toISOString(),
				});
		} catch (error) {
			console.error("Error updating social profile:", error);
			throw error;
		}
	}

	async getSocialActivity(
		userId: string,
		limit = 20,
	): Promise<SocialActivity[]> {
		try {
			const { data, error } = await supabase()
				.from("social_activity")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.limit(limit);

			if (error) throw error;

			return data.map((activity: any) => this.mapSocialActivity(activity));
		} catch (error) {
			console.error("Error getting social activity:", error);
			return [];
		}
	}

	// Social Stats and Analytics
	async getSocialStats(userId: string): Promise<SocialStats> {
		try {
			const [
				friendsCount,
				teamsCount,
				referrals,
				pendingRequests,
				pendingTeamInvites,
			] = await Promise.all([
				supabaseService()
					.from("friends")
					.select("*", { count: "exact", head: true })
					.eq("user_id", userId)
					.eq("status", "accepted"),
				supabaseService()
					.from("team_members")
					.select("*", { count: "exact", head: true })
					.eq("user_id", userId)
					.eq("is_active", true),
				supabaseService()
					.from("referrals")
					.select("value")
					.eq("referrer_id", userId)
					.eq("status", "completed"),
				supabaseService()
					.from("friend_requests")
					.select("*", { count: "exact", head: true })
					.eq("recipient_id", userId)
					.eq("status", "pending"),
				supabaseService()
					.from("team_invites")
					.select("*", { count: "exact", head: true })
					.eq("invitee_id", userId)
					.eq("status", "pending"),
			]);

			const totalValue =
				referrals.data?.reduce(
					(sum: number, r: any) => sum + (r.value || 0),
					0,
				) || 0;

			const totalActivity =
				(friendsCount.count || 0) +
				(teamsCount.count || 0) +
				(referrals.count || 0) +
				0; // socialAchievements

			return {
				friendsCount: friendsCount.count || 0,
				teamsCount: teamsCount.count || 0,
				referralsGiven: referrals.count || 0,
				referralsReceived: 0, // This would need separate calculation
				totalValueGenerated: totalValue,
				socialAchievements: 0, // This would need achievement system integration
				rank: 0, // This would need ranking calculation
				pendingFriendRequests: pendingRequests.count || 0,
				pendingTeamInvites: pendingTeamInvites.count || 0,
				totalActivity,
				achievementsCount: 0, // This would need achievement system integration
			};
		} catch (error) {
			console.error("Error getting social stats:", error);
			return {
				friendsCount: 0,
				teamsCount: 0,
				referralsGiven: 0,
				referralsReceived: 0,
				totalValueGenerated: 0,
				socialAchievements: 0,
				rank: 0,
				pendingFriendRequests: 0,
				pendingTeamInvites: 0,
				totalActivity: 0,
				achievementsCount: 0,
			};
		}
	}

	// Private helper methods
	private generateInviteCode(): string {
		return Math.random().toString(36).substring(2, 8).toUpperCase();
	}

	private async logSocialActivity(
		userId: string,
		type: string,
		description: string,
		metadata?: any,
	): Promise<void> {
		try {
			await supabase().from("social_activity").insert({
				user_id: userId,
				type,
				description,
				metadata,
				created_at: new Date().toISOString(),
				is_public: true,
			});
		} catch (error) {
			console.error("Error logging social activity:", error);
		}
	}

	// Mapping functions
	private mapFriend(data: any): Friend {
		return {
			id: data.id,
			userId: data.user_id,
			friendId: data.friend_id,
			status: data.status,
			requestedAt: data.requested_at,
			respondedAt: data.responded_at,
			metadata: data.metadata,
			friend: data.friend
				? {
						id: data.friend.id,
						username: data.friend.username,
						avatar: data.friend.avatar,
						socialProfile: data.friend.social_profile
							? {
									bio: data.friend.social_profile.bio,
								}
							: undefined,
					}
				: undefined,
		};
	}

	private mapFriendRequest(data: any): FriendRequest {
		return {
			id: data.id,
			requesterId: data.requester_id,
			recipientId: data.recipient_id,
			status: data.status,
			message: data.message,
			requestedAt: data.requested_at,
			respondedAt: data.responded_at,
			metadata: data.metadata,
			requester: data.requester
				? {
						id: data.requester.id,
						username: data.requester.username,
						avatar: data.requester.avatar,
					}
				: undefined,
			recipient: data.recipient
				? {
						id: data.recipient.id,
						username: data.recipient.username,
						avatar: data.recipient.avatar,
					}
				: undefined,
		};
	}

	private mapTeam(data: any): Team {
		return {
			id: data.id,
			name: data.name,
			description: data.description,
			leaderId: data.leader_id,
			avatar: data.avatar,
			banner: data.banner,
			maxMembers: data.max_members,
			isPrivate: data.is_private,
			inviteCode: data.invite_code,
			settings: data.settings,
			stats: data.stats,
			createdAt: data.created_at,
			updatedAt: data.updated_at,
			leader: data.leader
				? {
						id: data.leader.id,
						username: data.leader.username,
						avatar: data.leader.avatar,
					}
				: undefined,
			members:
				data.members?.map((member: any) => this.mapTeamMember(member)) || [],
		};
	}

	private mapTeamMember(data: any): TeamMember {
		return {
			id: data.id,
			teamId: data.team_id,
			userId: data.user_id,
			role: data.role,
			joinedAt: data.joined_at,
			contributions: data.contributions,
			isActive: data.is_active,
		};
	}

	private mapSocialProfile(data: any): SocialProfile {
		return {
			userId: data.user_id,
			username: data.username,
			avatar: data.avatar,
			banner: data.banner,
			bio: data.bio,
			location: data.location,
			website: data.website,
			socialLinks: data.social_links || [],
			privacySettings: data.privacy_settings,
			activityStatus: data.activity_status,
			lastSeen: data.last_seen,
			stats: data.stats,
			achievements: data.achievements || [],
		};
	}

	private mapSocialActivity(data: any): SocialActivity {
		return {
			id: data.id,
			userId: data.user_id,
			type: data.type,
			description: data.description,
			metadata: data.metadata,
			createdAt: data.created_at,
			isPublic: data.is_public,
		};
	}
}

// Export singleton instance
export const socialManager = SocialManager.getInstance();

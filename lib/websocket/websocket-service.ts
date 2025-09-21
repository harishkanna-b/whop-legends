import type { RealtimeChannel, RealtimeClient } from "@supabase/realtime-js";
import React from "react";
import { supabase } from "../supabase-client";

export interface WebSocketMessage {
	type: string;
	payload: any;
	timestamp: Date;
	userId?: string;
}

export interface WebSocketSubscription {
	id: string;
	channel: RealtimeChannel;
	callback: (message: WebSocketMessage) => void;
}

export class WebSocketService {
	private static instance: WebSocketService;
	private client: RealtimeClient;
	private subscriptions: Map<string, WebSocketSubscription> = new Map();
	private isConnected = false;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectInterval = 1000;

	private constructor() {
		this.client = supabase().realtime;
		this.setupConnectionHandlers();
	}

	static getInstance(): WebSocketService {
		if (!WebSocketService.instance) {
			WebSocketService.instance = new WebSocketService();
		}
		return WebSocketService.instance;
	}

	private setupConnectionHandlers() {
		// RealtimeClient doesn't have direct connection handlers in this version
		// Connection status is handled through individual channels
		this.isConnected = true;
		this.reconnectAttempts = 0;
		this.reconnectInterval = 1000;
	}

	private handleReconnection() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			console.log(
				`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
			);

			setTimeout(() => {
				this.client.connect();
			}, this.reconnectInterval);

			// Exponential backoff
			this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000);
		} else {
			console.error("Max reconnection attempts reached");
		}
	}

	// Story 1.4 - Quest System Real-time Updates
	subscribeToQuestUpdates(
		userId: string,
		callback: (message: WebSocketMessage) => void,
	): string {
		const subscriptionId = `quest-updates-${userId}`;

		if (this.subscriptions.has(subscriptionId)) {
			return subscriptionId;
		}

		const channel = this.client.channel(`user_quests:${userId}`);

		channel
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "user_quests",
					filter: `user_id=eq.${userId}`,
				},
				(payload) => {
					const message: WebSocketMessage = {
						type: "quest_update",
						payload: {
							eventType: payload.eventType,
							new: payload.new,
							old: payload.old,
						},
						timestamp: new Date(),
						userId,
					};
					callback(message);
				},
			)
			.on("broadcast", { event: "quest_completed" }, (payload) => {
				const message: WebSocketMessage = {
					type: "quest_completed",
					payload: payload.payload,
					timestamp: new Date(),
					userId,
				};
				callback(message);
			})
			.subscribe((status) => {
				console.log(`Quest updates subscription status: ${status}`);
			});

		const subscription: WebSocketSubscription = {
			id: subscriptionId,
			channel,
			callback,
		};

		this.subscriptions.set(subscriptionId, subscription);
		return subscriptionId;
	}

	// Story 1.5 - Analytics Dashboard Real-time Updates
	subscribeToAnalyticsUpdates(
		companyId: string,
		callback: (message: WebSocketMessage) => void,
	): string {
		const subscriptionId = `analytics-updates-${companyId}`;

		if (this.subscriptions.has(subscriptionId)) {
			return subscriptionId;
		}

		const channel = this.client.channel(`analytics:${companyId}`);

		channel
			.on("broadcast", { event: "referral_created" }, (payload) => {
				const message: WebSocketMessage = {
					type: "referral_created",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.on("broadcast", { event: "commission_earned" }, (payload) => {
				const message: WebSocketMessage = {
					type: "commission_earned",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.on("broadcast", { event: "user_level_up" }, (payload) => {
				const message: WebSocketMessage = {
					type: "user_level_up",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.on("broadcast", { event: "analytics_updated" }, (payload) => {
				const message: WebSocketMessage = {
					type: "analytics_updated",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.subscribe((status) => {
				console.log(`Analytics updates subscription status: ${status}`);
			});

		const subscription: WebSocketSubscription = {
			id: subscriptionId,
			channel,
			callback,
		};

		this.subscriptions.set(subscriptionId, subscription);
		return subscriptionId;
	}

	// Story 1.6 - Leaderboards Real-time Updates
	subscribeToLeaderboardUpdates(
		leaderboardId: string,
		callback: (message: WebSocketMessage) => void,
	): string {
		const subscriptionId = `leaderboard-updates-${leaderboardId}`;

		if (this.subscriptions.has(subscriptionId)) {
			return subscriptionId;
		}

		const channel = this.client.channel(`leaderboards:${leaderboardId}`);

		channel
			.on("broadcast", { event: "rank_update" }, (payload) => {
				const message: WebSocketMessage = {
					type: "rank_update",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.on("broadcast", { event: "score_update" }, (payload) => {
				const message: WebSocketMessage = {
					type: "score_update",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.on("broadcast", { event: "leaderboard_refreshed" }, (payload) => {
				const message: WebSocketMessage = {
					type: "leaderboard_refreshed",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.on("broadcast", { event: "new_leader" }, (payload) => {
				const message: WebSocketMessage = {
					type: "new_leader",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.subscribe((status) => {
				console.log(`Leaderboard updates subscription status: ${status}`);
			});

		const subscription: WebSocketSubscription = {
			id: subscriptionId,
			channel,
			callback,
		};

		this.subscriptions.set(subscriptionId, subscription);
		return subscriptionId;
	}

	// General user updates for all stories
	subscribeToUserUpdates(
		userId: string,
		callback: (message: WebSocketMessage) => void,
	): string {
		const subscriptionId = `user-updates-${userId}`;

		if (this.subscriptions.has(subscriptionId)) {
			return subscriptionId;
		}

		const channel = this.client.channel(`users:${userId}`);

		channel
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "users",
					filter: `id=eq.${userId}`,
				},
				(payload) => {
					const message: WebSocketMessage = {
						type: "user_update",
						payload: {
							eventType: payload.eventType,
							new: payload.new,
							old: payload.old,
						},
						timestamp: new Date(),
						userId,
					};
					callback(message);
				},
			)
			.on("broadcast", { event: "achievement_unlocked" }, (payload) => {
				const message: WebSocketMessage = {
					type: "achievement_unlocked",
					payload: payload.payload,
					timestamp: new Date(),
					userId,
				};
				callback(message);
			})
			.subscribe((status) => {
				console.log(`User updates subscription status: ${status}`);
			});

		const subscription: WebSocketSubscription = {
			id: subscriptionId,
			channel,
			callback,
		};

		this.subscriptions.set(subscriptionId, subscription);
		return subscriptionId;
	}

	// Referral updates for all stories
	subscribeToReferralUpdates(
		userId: string,
		callback: (message: WebSocketMessage) => void,
	): string {
		const subscriptionId = `referral-updates-${userId}`;

		if (this.subscriptions.has(subscriptionId)) {
			return subscriptionId;
		}

		const channel = this.client.channel(`referrals:${userId}`);

		channel
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "referrals",
					filter: `referrer_id=eq.${userId}`,
				},
				(payload) => {
					const message: WebSocketMessage = {
						type: "referral_update",
						payload: {
							eventType: payload.eventType,
							new: payload.new,
							old: payload.old,
						},
						timestamp: new Date(),
						userId,
					};
					callback(message);
				},
			)
			.subscribe((status) => {
				console.log(`Referral updates subscription status: ${status}`);
			});

		const subscription: WebSocketSubscription = {
			id: subscriptionId,
			channel,
			callback,
		};

		this.subscriptions.set(subscriptionId, subscription);
		return subscriptionId;
	}

	// Guild updates for all stories
	subscribeToGuildUpdates(
		guildId: string,
		callback: (message: WebSocketMessage) => void,
	): string {
		const subscriptionId = `guild-updates-${guildId}`;

		if (this.subscriptions.has(subscriptionId)) {
			return subscriptionId;
		}

		const channel = this.client.channel(`guilds:${guildId}`);

		channel
			.on("broadcast", { event: "guild_update" }, (payload) => {
				const message: WebSocketMessage = {
					type: "guild_update",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.on("broadcast", { event: "member_joined" }, (payload) => {
				const message: WebSocketMessage = {
					type: "member_joined",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.on("broadcast", { event: "member_left" }, (payload) => {
				const message: WebSocketMessage = {
					type: "member_left",
					payload: payload.payload,
					timestamp: new Date(),
				};
				callback(message);
			})
			.subscribe((status) => {
				console.log(`Guild updates subscription status: ${status}`);
			});

		const subscription: WebSocketSubscription = {
			id: subscriptionId,
			channel,
			callback,
		};

		this.subscriptions.set(subscriptionId, subscription);
		return subscriptionId;
	}

	// Send broadcast messages
	async broadcastMessage(
		channelName: string,
		event: string,
		payload: any,
	): Promise<void> {
		try {
			const channel = this.client.channel(channelName);
			await channel.send({
				type: "broadcast",
				event,
				payload,
			});
		} catch (error) {
			console.error("Error broadcasting message:", error);
			throw error;
		}
	}

	// Unsubscribe from a specific subscription
	unsubscribe(subscriptionId: string): void {
		const subscription = this.subscriptions.get(subscriptionId);
		if (subscription) {
			subscription.channel.unsubscribe();
			this.subscriptions.delete(subscriptionId);
			console.log(`Unsubscribed from ${subscriptionId}`);
		}
	}

	// Unsubscribe from all subscriptions
	unsubscribeAll(): void {
		this.subscriptions.forEach((subscription, subscriptionId) => {
			subscription.channel.unsubscribe();
			console.log(`Unsubscribed from ${subscriptionId}`);
		});
		this.subscriptions.clear();
	}

	// Get connection status
	getConnectionStatus(): boolean {
		return this.isConnected;
	}

	// Get all active subscriptions
	getActiveSubscriptions(): string[] {
		return Array.from(this.subscriptions.keys());
	}

	// Connect manually
	connect(): void {
		if (!this.isConnected) {
			this.client.connect();
		}
	}

	// Disconnect manually
	disconnect(): void {
		this.unsubscribeAll();
		this.client.disconnect();
		this.isConnected = false;
	}
}

// Export singleton instance
export const webSocketService = WebSocketService.getInstance();

// React hook for real-time updates
export const useWebSocket = (
	subscriptionId: string,
	callback: (message: WebSocketMessage) => void,
) => {
	React.useEffect(() => {
		if (!subscriptionId) return;

		const handleWebSocketMessage = (message: WebSocketMessage) => {
			callback(message);
		};

		// The subscription is managed by the component that calls the subscribe methods
		return () => {
			// Cleanup is handled by the component
		};
	}, [subscriptionId, callback]);
};

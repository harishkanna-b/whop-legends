// Whop API and Webhook Types

export interface WhopWebhookEvent {
	id: string;
	type: "referral.created" | "referral.completed" | "referral.cancelled";
	created_at: string;
	data: WhopWebhookEventData;
}

export interface WhopWebhookEventData {
	referral: WhopReferral;
	payment?: WhopPayment;
	user?: WhopUser;
}

export interface WhopReferral {
	id: string;
	user_id: string;
	company_id: string;
	code: string;
	status: "pending" | "completed" | "expired";
	commission_amount: number;
	commission_status: "pending" | "paid" | "cancelled";
	created_at: string;
	updated_at: string;
	referred_user_id?: string;
	whop_payment_id?: string;
}

export interface WhopPayment {
	id: string;
	user_id: string;
	company_id: string;
	amount: number;
	currency: string;
	status: "pending" | "completed" | "failed" | "refunded";
	created_at: string;
	metadata?: Record<string, unknown>;
}

export interface WhopUser {
	id: string;
	username: string;
	email: string;
	avatar_url?: string;
	created_at: string;
	is_active: boolean;
}

export interface WebhookSignature {
	timestamp: string;
	signature: string;
}

export interface ReferralProcessingResult {
	success: boolean;
	user?: DatabaseUser;
	referral?: DatabaseReferral;
	error?: string;
	xpAwarded?: number;
	achievementsUnlocked?: string[];
}

export interface DatabaseUser {
	id: string;
	whop_user_id?: string;
	company_id?: string;
	username: string;
	email?: string;
	avatar_url?: string;
	character_class: "scout" | "sage" | "champion";
	level: number;
	experience_points: number;
	prestige_level: number;
	total_referrals: number;
	total_commission: number;
	guild_id?: string;
	created_at: string;
	updated_at: string;
}

export interface UserUpdateData {
	username?: string;
	email?: string;
	avatar_url?: string;
	whop_user_id?: string;
	company_id?: string;
}

export interface DatabaseReferral {
	id: string;
	referrer_id: string;
	referred_whop_user_id: string;
	company_id: string;
	referral_code: string;
	status: "pending" | "completed" | "expired";
	commission_amount: number;
	commission_status: "pending" | "paid" | "cancelled";
	whop_payment_id?: string;
	whop_webhook_id?: string;
	created_at: string;
	updated_at: string;
}

export interface WebhookProcessingOptions {
	retryAttempts?: number;
	timeout?: number;
	skipSignatureVerification?: boolean; // For testing only
}

export interface WebhookProcessingResult {
	success: boolean;
	processed: boolean;
	error?: string;
	shouldRetry?: boolean;
	retryCount?: number;
}

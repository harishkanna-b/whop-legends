"use client";

import { useUser } from "@/app/contexts/UserContext";

export interface WhopUser {
	id: string;
	username: string;
	email?: string | null;
	avatar_url?: string | null;
	metadata?: {
		companyId?: string;
		[key: string]: any;
	};
}

export function useWhopUser() {
	const { user, loading, error } = useUser();

	// Transform our user to match the expected WhopUser interface
	const whopUser: WhopUser | null = user
		? {
				id: user.id,
				username: user.username,
				email: user.email,
				avatar_url: user.avatar_url,
				metadata: {
					companyId: user.company_id,
					// Include any other metadata from raw_user_meta
					...user.raw_user_meta,
				},
			}
		: null;

	return {
		user: whopUser,
		isLoading: loading,
		error,
	};
}

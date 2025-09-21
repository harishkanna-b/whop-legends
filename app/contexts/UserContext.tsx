"use client";

import type { User, UserContextType } from "@/app/types/user";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const refreshUser = async () => {
		try {
			setLoading(true);
			setError(null);

			// Get current session from Supabase
			const {
				data: { session },
				error: sessionError,
			} = await supabase().auth.getSession();

			if (sessionError) {
				throw sessionError;
			}

			if (!session) {
				setUser(null);
				return;
			}

			// Get user data from our users table
			const { data: userData, error: userError } = await supabase()
				.from("users")
				.select("*")
				.eq("id", session.user.id)
				.single();

			if (userError && userError.code !== "PGRST116") {
				throw userError;
			}

			if (userData) {
				setUser(userData);
			} else {
				// User exists in auth but not in our table - create basic user record
				const { data: newUser, error: createError } = await supabase()
					.from("users")
					.insert({
						id: session.user.id,
						username:
							session.user.user_metadata?.username ||
							`user_${session.user.id.slice(0, 8)}`,
						email: session.user.email,
						character_class: "scout",
						level: 1,
						experience_points: 0,
						prestige_level: 0,
						total_referrals: 0,
						total_commission: 0,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					})
					.select()
					.single();

				if (createError) {
					throw createError;
				}

				setUser(newUser);
			}
		} catch (err) {
			console.error("Error refreshing user:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			setUser(null);
		} finally {
			setLoading(false);
		}
	};

	const updateUser = async (updates: Partial<User>) => {
		if (!user) return;

		try {
			const { data: updatedUser, error } = await supabase()
				.from("users")
				.update({
					...updates,
					updated_at: new Date().toISOString(),
				})
				.eq("id", user.id)
				.select()
				.single();

			if (error) {
				throw error;
			}

			setUser(updatedUser);
		} catch (err) {
			console.error("Error updating user:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			throw err;
		}
	};

	useEffect(() => {
		refreshUser();

		// Set up auth state listener
		const {
			data: { subscription },
		} = supabase().auth.onAuthStateChange(async (event: any, session: any) => {
			if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
				await refreshUser();
			} else if (event === "SIGNED_OUT") {
				setUser(null);
				setLoading(false);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	const value: UserContextType = {
		user,
		loading,
		error,
		refreshUser,
		updateUser,
	};

	return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
}

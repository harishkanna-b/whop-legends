import { supabaseService } from "@/lib/supabase-client";

export interface CharacterClass {
	id: string;
	name: string;
	description: string;
	emoji: string;
	color: string;
	xpMultiplier: number;
	specialAbility: string;
	playstyle: "speed" | "value" | "volume";
	requirements: {
		minReferrals?: number;
		minTotalValue?: number;
		maxReferrals?: number;
	};
	progression: {
		baseXPPerLevel: number;
		xpScaling: number;
		unlocks: string[];
	};
}

export interface UserClassAssignment {
	userId: string;
	classId: string;
	assignedAt: string;
	assignedBy: "auto" | "manual" | "recommendation";
	reason?: string;
	level: number;
	totalXP: number;
}

export interface ClassRecommendation {
	classId: string;
	confidence: number;
	reasons: string[];
	analysis: {
		referralPattern: "consistent" | "high_value" | "frequent" | "mixed";
		averageReferralValue: number;
		referralFrequency: number;
		totalReferrals: number;
	};
}

// Character class definitions
export const CHARACTER_CLASSES: CharacterClass[] = [
	{
		id: "scout",
		name: "Scout",
		description:
			"Masters of reach and discovery. Scouts excel at finding new referral opportunities and maximizing visibility.",
		emoji: "🏃",
		color: "#3B82F6", // Blue
		xpMultiplier: 1.2,
		specialAbility: "Wide Reach - 20% bonus XP from referrals to new users",
		playstyle: "speed",
		requirements: {
			minReferrals: 1,
		},
		progression: {
			baseXPPerLevel: 100,
			xpScaling: 1.15,
			unlocks: [
				"Level 5: Extended Network Vision",
				"Level 10: Multi-Platform Outreach",
				"Level 15: Viral Content Specialist",
				"Level 20: Community Ambassador",
			],
		},
	},
	{
		id: "sage",
		name: "Sage",
		description:
			"Champions of value and quality. Sages focus on high-value conversions and building lasting relationships.",
		emoji: "🧙",
		color: "#8B5CF6", // Purple
		xpMultiplier: 1.5,
		specialAbility:
			"Value Mastery - 50% bonus XP from high-value referrals ($100+)",
		playstyle: "value",
		requirements: {
			minTotalValue: 500,
		},
		progression: {
			baseXPPerLevel: 150,
			xpScaling: 1.2,
			unlocks: [
				"Level 5: Value Specialist",
				"Level 10: Premium Content Creator",
				"Level 15: Enterprise Relationship Builder",
				"Level 20: Wisdom Keeper",
			],
		},
	},
	{
		id: "champion",
		name: "Champion",
		description:
			"Paragons of volume and consistency. Champions thrive on consistent performance and high referral volumes.",
		emoji: "⚔️",
		color: "#EF4444", // Red
		xpMultiplier: 1.3,
		specialAbility:
			"Volume Dominance - 30% bonus XP from referral streaks (3+ in a week)",
		playstyle: "volume",
		requirements: {
			minReferrals: 5,
		},
		progression: {
			baseXPPerLevel: 120,
			xpScaling: 1.18,
			unlocks: [
				"Level 5: Consistency Expert",
				"Level 10: Team Leader",
				"Level 15: Volume Champion",
				"Level 20: Legendary Performer",
			],
		},
	},
];

// Class assignment and recommendation logic
export class CharacterClassManager {
	/**
	 * Get all available character classes
	 */
	static getAvailableClasses(): CharacterClass[] {
		return CHARACTER_CLASSES;
	}

	/**
	 * Get a specific character class by ID
	 */
	static getClassById(classId: string): CharacterClass | null {
		return CHARACTER_CLASSES.find((cls) => cls.id === classId) || null;
	}

	/**
	 * Recommend a character class based on user's referral history
	 */
	static async recommendClass(userId: string): Promise<ClassRecommendation> {
		try {
			// Get user's referral history
			const { data: referrals, error } = await supabaseService()
				.from("referrals")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false });

			if (error) {
				console.error("Error fetching referral history:", error);
				throw new Error("Failed to analyze referral history");
			}

			const analysis = CharacterClassManager.analyzeReferralPattern(
				referrals || [],
			);
			const recommendations =
				CharacterClassManager.generateRecommendations(analysis);

			// Return the top recommendation
			return (
				recommendations[0] || {
					classId: "scout",
					confidence: 0.5,
					reasons: ["Default recommendation for new users"],
					analysis,
				}
			);
		} catch (error) {
			console.error("Error in class recommendation:", error);
			// Return scout as default fallback
			return {
				classId: "scout",
				confidence: 0.3,
				reasons: ["Fallback recommendation due to analysis error"],
				analysis: {
					referralPattern: "mixed",
					averageReferralValue: 0,
					referralFrequency: 0,
					totalReferrals: 0,
				},
			};
		}
	}

	/**
	 * Analyze user's referral pattern
	 */
	private static analyzeReferralPattern(referrals: any[]) {
		if (referrals.length === 0) {
			return {
				referralPattern: "mixed" as const,
				averageReferralValue: 0,
				referralFrequency: 0,
				totalReferrals: 0,
			};
		}

		const totalValue = referrals.reduce(
			(sum, ref) => sum + (ref.value || 0),
			0,
		);
		const averageValue = totalValue / referrals.length;

		// Calculate referral frequency (referrals per week)
		const oldestReferral = new Date(referrals[referrals.length - 1].created_at);
		const newestReferral = new Date(referrals[0].created_at);
		const weeksDiff = Math.max(
			1,
			(newestReferral.getTime() - oldestReferral.getTime()) /
				(7 * 24 * 60 * 60 * 1000),
		);
		const frequency = referrals.length / weeksDiff;

		// Determine pattern
		let pattern: "consistent" | "high_value" | "frequent" | "mixed";
		if (averageValue > 100) {
			pattern = "high_value";
		} else if (frequency > 2) {
			pattern = "frequent";
		} else if (frequency >= 0.5 && frequency <= 2) {
			pattern = "consistent";
		} else {
			pattern = "mixed";
		}

		return {
			referralPattern: pattern,
			averageReferralValue: averageValue,
			referralFrequency: frequency,
			totalReferrals: referrals.length,
		};
	}

	/**
	 * Generate class recommendations based on analysis
	 */
	private static generateRecommendations(analysis: any): ClassRecommendation[] {
		const recommendations: ClassRecommendation[] = [];

		// Sage recommendation for high-value patterns
		if (
			analysis.referralPattern === "high_value" ||
			analysis.averageReferralValue > 75
		) {
			recommendations.push({
				classId: "sage",
				confidence: Math.min(0.9, 0.6 + analysis.averageReferralValue / 200),
				reasons: [
					"High-value referral pattern detected",
					`${analysis.averageReferralValue.toFixed(2)} average referral value`,
					"Perfect for value-focused creators",
				],
				analysis,
			});
		}

		// Champion recommendation for volume/frequency patterns
		if (
			analysis.referralPattern === "frequent" ||
			analysis.totalReferrals >= 5
		) {
			recommendations.push({
				classId: "champion",
				confidence: Math.min(0.9, 0.5 + analysis.totalReferrals / 20),
				reasons: [
					"Strong referral volume detected",
					`${analysis.totalReferrals} total referrals`,
					"Consistent performance pattern",
				],
				analysis,
			});
		}

		// Scout recommendation for reach/speed patterns
		if (
			analysis.referralPattern === "consistent" ||
			analysis.totalReferrals < 5
		) {
			recommendations.push({
				classId: "scout",
				confidence: Math.min(0.9, 0.6 + analysis.referralFrequency / 3),
				reasons: [
					"Consistent referral pattern detected",
					`${analysis.referralFrequency.toFixed(1)} referrals per week`,
					"Great for growing networks",
				],
				analysis,
			});
		}

		// Sort by confidence and return
		return recommendations.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Assign a character class to a user
	 */
	static async assignClass(
		userId: string,
		classId: string,
		assignedBy: "auto" | "manual" | "recommendation" = "manual",
		reason?: string,
	): Promise<UserClassAssignment> {
		try {
			const characterClass = CharacterClassManager.getClassById(classId);
			if (!characterClass) {
				throw new Error(`Invalid character class: ${classId}`);
			}

			// Check if user meets class requirements
			await CharacterClassManager.validateClassRequirements(
				userId,
				characterClass,
			);

			// Check if user already has a class
			const { data: existingAssignment } = await supabaseService()
				.from("user_classes")
				.select("*")
				.eq("user_id", userId)
				.single();

			const assignmentData = {
				user_id: userId,
				class_id: classId,
				assigned_by: assignedBy,
				reason: reason,
				level: 1,
				total_xp: 0,
			};

			let result;
			if (existingAssignment) {
				// Update existing assignment
				result = await supabaseService()
					.from("user_classes")
					.update(assignmentData)
					.eq("user_id", userId)
					.select()
					.single();
			} else {
				// Create new assignment
				result = await supabaseService()
					.from("user_classes")
					.insert(assignmentData)
					.select()
					.single();
			}

			if (result.error) {
				throw result.error;
			}

			return {
				userId: result.data.user_id,
				classId: result.data.class_id,
				assignedAt: result.data.assigned_at,
				assignedBy: result.data.assigned_by,
				reason: result.data.reason,
				level: result.data.level,
				totalXP: result.data.total_xp,
			};
		} catch (error) {
			console.error("Error assigning character class:", error);
			throw error;
		}
	}

	/**
	 * Validate that user meets class requirements
	 */
	private static async validateClassRequirements(
		userId: string,
		characterClass: CharacterClass,
	) {
		// Get user's referral statistics
		const { data: referrals, error } = await supabaseService()
			.from("referrals")
			.select("value, status")
			.eq("user_id", userId);

		if (error) {
			throw new Error("Failed to validate class requirements");
		}

		const completedReferrals =
			referrals?.filter((r: any) => r.status === "completed") || [];
		const totalValue = completedReferrals.reduce(
			(sum: number, ref: any) => sum + (ref.value || 0),
			0,
		);

		// Check minimum referrals requirement
		if (
			characterClass.requirements.minReferrals &&
			completedReferrals.length < characterClass.requirements.minReferrals
		) {
			throw new Error(
				`Requires at least ${characterClass.requirements.minReferrals} completed referrals`,
			);
		}

		// Check minimum total value requirement
		if (
			characterClass.requirements.minTotalValue &&
			totalValue < characterClass.requirements.minTotalValue
		) {
			throw new Error(
				`Requires at least $${characterClass.requirements.minTotalValue} in total referral value`,
			);
		}

		// Check maximum referrals requirement (for scout class)
		if (
			characterClass.requirements.maxReferrals &&
			completedReferrals.length > characterClass.requirements.maxReferrals
		) {
			throw new Error(
				`Too many referrals for this class. Maximum: ${characterClass.requirements.maxReferrals}`,
			);
		}
	}

	/**
	 * Get user's current character class assignment
	 */
	static async getUserClass(
		userId: string,
	): Promise<UserClassAssignment | null> {
		try {
			const { data, error } = await supabaseService()
				.from("user_classes")
				.select("*")
				.eq("user_id", userId)
				.single();

			if (error || !data) {
				return null;
			}

			return {
				userId: data.user_id,
				classId: data.class_id,
				assignedAt: data.assigned_at,
				assignedBy: data.assigned_by,
				reason: data.reason,
				level: data.level,
				totalXP: data.total_xp,
			};
		} catch (error) {
			console.error("Error fetching user class:", error);
			return null;
		}
	}

	/**
	 * Auto-assign class to new users based on their first referral pattern
	 */
	static async autoAssignClass(userId: string): Promise<UserClassAssignment> {
		try {
			// Get recommendation
			const recommendation = await CharacterClassManager.recommendClass(userId);

			// Assign the recommended class
			const assignment = await CharacterClassManager.assignClass(
				userId,
				recommendation.classId,
				"auto",
				`Auto-assigned based on referral pattern: ${recommendation.analysis.referralPattern}`,
			);

			console.log(
				`Auto-assigned class ${recommendation.classId} to user ${userId}`,
			);
			return assignment;
		} catch (error) {
			console.error("Error in auto class assignment:", error);
			// Fallback to scout class
			return await CharacterClassManager.assignClass(
				userId,
				"scout",
				"auto",
				"Fallback assignment",
			);
		}
	}
}

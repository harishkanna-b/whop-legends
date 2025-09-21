import { withAuth } from "@/lib/auth";
import { UserProfileManager } from "@/lib/user-profile";
import type { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const userId = req.userId; // Set by auth middleware
		const { method } = req;

		switch (method) {
			case "GET":
				return await handleGet(req, res, userId || "");
			case "PUT":
				return await handlePut(req, res, userId || "");
			default:
				res.setHeader("Allow", ["GET", "PUT"]);
				return res.status(405).json({ error: `Method ${method} Not Allowed` });
		}
	} catch (error) {
		console.error("User profile API error:", error);
		return res.status(500).json({
			error: "Internal server error",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

// GET /api/user/profile - Get user's complete profile
async function handleGet(
	req: NextApiRequest,
	res: NextApiResponse,
	userId: string,
) {
	try {
		const { public: isPublic } = req.query;

		if (isPublic === "true") {
			// Return public profile
			const profile = await UserProfileManager.getPublicProfile(userId);
			return res.status(200).json({
				success: true,
				data: profile,
			});
		}

		// Return full profile
		const profile = await UserProfileManager.getProfile(userId);

		return res.status(200).json({
			success: true,
			data: profile,
		});
	} catch (error) {
		console.error("Error fetching user profile:", error);
		return res.status(500).json({
			success: false,
			error: "Failed to fetch user profile",
		});
	}
}

// PUT /api/user/profile - Update user profile
async function handlePut(
	req: NextApiRequest,
	res: NextApiResponse,
	userId: string,
) {
	try {
		const { username, avatarUrl, preferences } = req.body;

		// Validate username if provided
		if (username && !isValidUsername(username)) {
			return res.status(400).json({
				success: false,
				error:
					"Invalid username. Username must be 3-20 characters and contain only letters, numbers, and underscores",
			});
		}

		// Validate avatar URL if provided
		if (avatarUrl && !isValidUrl(avatarUrl)) {
			return res.status(400).json({
				success: false,
				error: "Invalid avatar URL",
			});
		}

		// Validate preferences if provided
		if (preferences && !isValidPreferences(preferences)) {
			return res.status(400).json({
				success: false,
				error: "Invalid preferences format",
			});
		}

		// Update profile
		const updatedProfile = await UserProfileManager.updateProfile(userId, {
			username,
			avatarUrl,
			preferences,
		});

		return res.status(200).json({
			success: true,
			data: updatedProfile,
			message: "Profile updated successfully",
		});
	} catch (error) {
		console.error("Error updating user profile:", error);

		if (error instanceof Error) {
			if (error.message.includes("Username already taken")) {
				return res.status(400).json({
					success: false,
					error: "Username is already taken",
				});
			}
		}

		return res.status(500).json({
			success: false,
			error: "Failed to update user profile",
		});
	}
}

// Validation functions
function isValidUsername(username: string): boolean {
	const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
	return usernameRegex.test(username);
}

function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

function isValidPreferences(preferences: any): boolean {
	if (!preferences || typeof preferences !== "object") {
		return false;
	}

	// Validate theme
	if (
		preferences.theme &&
		!["light", "dark", "auto"].includes(preferences.theme)
	) {
		return false;
	}

	// Validate notifications
	if (
		preferences.notifications &&
		typeof preferences.notifications !== "object"
	) {
		return false;
	}

	// Validate privacy
	if (preferences.privacy && typeof preferences.privacy !== "object") {
		return false;
	}

	return true;
}

export default withAuth(handler);

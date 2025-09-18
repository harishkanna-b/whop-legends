import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	try {
		// The headers contains the user token
		const headersList = await headers();

		// The experienceId is a path param
		const { experienceId } = await params;

		// The user token is in the headers
		const { userId } = await whopSdk.verifyUserToken(headersList);

		const result = await whopSdk.access.checkIfUserHasAccessToExperience({
			userId,
			experienceId,
		});

		const user = await whopSdk.users.getUser({ userId });
		const experience = await whopSdk.experiences.getExperience({ experienceId });

		// Either: 'admin' | 'customer' | 'no_access';
		// 'admin' means the user is an admin of the whop, such as an owner or moderator
		// 'customer' means the user is a common member in this whop
		// 'no_access' means the user does not have access to the whop
		const { accessLevel } = result;

		return (
			<div className="flex justify-center items-center h-screen px-8">
				<h1 className="text-xl">
					Hi <strong>{user.name}</strong>, you{" "}
					<strong>{result.hasAccess ? "have" : "do not have"} access</strong> to
					this experience. Your access level to this whop is:{" "}
					<strong>{accessLevel}</strong>. <br />
					<br />
					Your user ID is <strong>{userId}</strong> and your username is{" "}
					<strong>@{user.username}</strong>.<br />
					<br />
					You are viewing the experience: <strong>{experience.name}</strong>
				</h1>
			</div>
		);
	} catch (error) {
		// Handle authentication errors gracefully
		if (error instanceof Error && error.message.includes('App API Key')) {
			return (
				<div className="flex justify-center items-center h-screen px-8">
					<div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
						<div className="text-6xl mb-4">🚀</div>
						<h1 className="text-2xl font-bold text-gray-900 mb-4">Whop Legends Experience</h1>
						<div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
							<p className="text-yellow-800 text-sm">
								Whop authentication required. This experience needs to run within Whop.com ecosystem.
							</p>
						</div>
						<div className="space-y-2 text-sm text-gray-600">
							<p>📋 <strong>Development Mode:</strong> This is a gamified referral system experience.</p>
							<p>🔧 <strong>To test:</strong> Access through your Whop dashboard.</p>
							<p>🌐 <strong>Full experience:</strong> Available within Whop.com iframe.</p>
						</div>
					</div>
				</div>
			);
		}

		// Generic error handling
		return (
			<div className="flex justify-center items-center h-screen px-8">
				<div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
					<div className="text-6xl mb-4">⚠️</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-4">Experience Error</h1>
					<div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
						<p className="text-red-800 text-sm">
							Unable to load experience. Please try again later.
						</p>
					</div>
				</div>
			</div>
		);
	}
}

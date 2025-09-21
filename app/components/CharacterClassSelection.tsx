"use client";

import { CharacterClassManager } from "@/lib/character-classes";
import { useEffect, useState } from "react";

interface CharacterClassSelectionProps {
	userId: string;
	onClassSelected?: (classId: string) => void;
}

interface CharacterClass {
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

export default function CharacterClassSelection({
	userId,
	onClassSelected,
}: CharacterClassSelectionProps) {
	const [classes, setClasses] = useState<CharacterClass[]>([]);
	const [userClass, setUserClass] = useState<any>(null);
	const [recommendation, setRecommendation] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [selecting, setSelecting] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadData();
	}, [userId]);

	const loadData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Load available classes
			const availableClasses = CharacterClassManager.getAvailableClasses();
			setClasses(availableClasses);

			// Load user's current class
			const currentClass = await CharacterClassManager.getUserClass(userId);
			setUserClass(currentClass);

			// Load recommendation if user doesn't have a class
			if (!currentClass) {
				const classRecommendation =
					await CharacterClassManager.recommendClass(userId);
				setRecommendation(classRecommendation);
			}
		} catch (err) {
			console.error("Error loading character classes:", err);
			setError("Failed to load character classes");
		} finally {
			setLoading(false);
		}
	};

	const handleSelectClass = async (classId: string) => {
		try {
			setSelecting(classId);
			setError(null);

			await CharacterClassManager.assignClass(userId, classId, "manual");

			// Reload user data
			const updatedClass = await CharacterClassManager.getUserClass(userId);
			setUserClass(updatedClass);

			if (onClassSelected) {
				onClassSelected(classId);
			}
		} catch (err) {
			console.error("Error selecting class:", err);
			setError(err instanceof Error ? err.message : "Failed to select class");
		} finally {
			setSelecting(null);
		}
	};

	const getClassIcon = (playstyle: string) => {
		switch (playstyle) {
			case "speed":
				return "🏃";
			case "value":
				return "💎";
			case "volume":
				return "⚔️";
			default:
				return "⭐";
		}
	};

	const getPlaystyleDescription = (playstyle: string) => {
		switch (playstyle) {
			case "speed":
				return "Focus on quick referrals and wide reach";
			case "value":
				return "Focus on high-value conversions and quality";
			case "volume":
				return "Focus on consistency and high referral numbers";
			default:
				return "Balanced approach to referrals";
		}
	};

	const isEligibleForClass = (characterClass: CharacterClass) => {
		// For demo purposes, assume user is eligible
		// In real implementation, this would check against user's actual stats
		return true;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-lg">Loading character classes...</div>
			</div>
		);
	}

	if (userClass) {
		return (
			<div className="max-w-4xl mx-auto p-6">
				<div className="bg-white rounded-lg shadow-lg p-8 text-center">
					<div
						className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center text-4xl"
						style={{ backgroundColor: `${userClass.color}20` }}
					>
						{classes.find((c) => c.id === userClass.classId)?.emoji || "⭐"}
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-2">
						You are a{" "}
						{classes.find((c) => c.id === userClass.classId)?.name ||
							"Champion"}
						!
					</h2>
					<p className="text-gray-600 mb-6">
						{classes.find((c) => c.id === userClass.classId)?.description ||
							"Master of referrals"}
					</p>
					<div className="flex justify-center space-x-4">
						<button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700">
							View Progress
						</button>
						<button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
							Change Class
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">
						Choose Your Legend Class
					</h1>
					<p className="text-xl text-gray-600 max-w-3xl mx-auto">
						Select a character class that matches your playstyle. Each class has
						unique abilities, XP multipliers, and progression paths.
					</p>

					{recommendation && (
						<div className="mt-6 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 max-w-2xl mx-auto">
							<div className="flex">
								<div className="flex-shrink-0">
									<svg
										className="h-5 w-5 text-blue-400"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<div className="ml-3">
									<p className="text-sm">
										<strong>Recommended:</strong>{" "}
										{classes.find((c) => c.id === recommendation.classId)?.name}
										({(recommendation.confidence * 100).toFixed(0)}% match)
									</p>
									<p className="text-sm mt-1">
										{recommendation.reasons.join(", ")}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>

				{error && (
					<div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
						<p>{error}</p>
					</div>
				)}

				{/* Character Classes Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{classes.map((characterClass) => (
						<div
							key={characterClass.id}
							className={`bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 ${
								recommendation?.classId === characterClass.id
									? "ring-4 ring-blue-500"
									: ""
							}`}
						>
							{/* Class Header */}
							<div
								className="p-6 text-center"
								style={{ backgroundColor: `${characterClass.color}10` }}
							>
								<div
									className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl"
									style={{ backgroundColor: `${characterClass.color}20` }}
								>
									{characterClass.emoji}
								</div>
								<h3 className="text-2xl font-bold text-gray-900 mb-2">
									{characterClass.name}
								</h3>
								<div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
									<span>{getClassIcon(characterClass.playstyle)}</span>
									<span>
										{getPlaystyleDescription(characterClass.playstyle)}
									</span>
								</div>
							</div>

							{/* Class Details */}
							<div className="p-6">
								<div className="mb-4">
									<h4 className="font-semibold text-gray-900 mb-2">
										Special Ability
									</h4>
									<p className="text-sm text-gray-600">
										{characterClass.specialAbility}
									</p>
								</div>

								<div className="mb-4">
									<h4 className="font-semibold text-gray-900 mb-2">
										XP Multiplier
									</h4>
									<div className="flex items-center space-x-2">
										<div className="flex-1 bg-gray-200 rounded-full h-2">
											<div
												className="bg-green-500 h-2 rounded-full"
												style={{
													width: `${(characterClass.xpMultiplier - 1) * 100}%`,
												}}
											/>
										</div>
										<span className="text-sm font-medium text-gray-700">
											{characterClass.xpMultiplier}x
										</span>
									</div>
								</div>

								<div className="mb-4">
									<h4 className="font-semibold text-gray-900 mb-2">
										Requirements
									</h4>
									<ul className="text-sm text-gray-600 space-y-1">
										{characterClass.requirements.minReferrals && (
											<li>
												• {characterClass.requirements.minReferrals}+ referrals
											</li>
										)}
										{characterClass.requirements.minTotalValue && (
											<li>
												• ${characterClass.requirements.minTotalValue}+ total
												value
											</li>
										)}
										{characterClass.requirements.maxReferrals && (
											<li>
												• Less than {characterClass.requirements.maxReferrals}{" "}
												referrals
											</li>
										)}
									</ul>
								</div>

								<div className="mb-6">
									<h4 className="font-semibold text-gray-900 mb-2">
										Progression Path
									</h4>
									<div className="text-sm text-gray-600">
										<p>
											Starts at {characterClass.progression.baseXPPerLevel} XP
											per level
										</p>
										<p>
											Scales by{" "}
											{(
												(characterClass.progression.xpScaling - 1) *
												100
											).toFixed(0)}
											% per level
										</p>
									</div>
								</div>

								<button
									onClick={() => handleSelectClass(characterClass.id)}
									disabled={
										!isEligibleForClass(characterClass) ||
										selecting === characterClass.id
									}
									className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
										!isEligibleForClass(characterClass)
											? "bg-gray-300 text-gray-500 cursor-not-allowed"
											: selecting === characterClass.id
												? "bg-blue-400 text-white cursor-not-allowed"
												: "bg-blue-600 text-white hover:bg-blue-700"
									}`}
								>
									{selecting === characterClass.id
										? "Selecting..."
										: !isEligibleForClass(characterClass)
											? "Requirements Not Met"
											: "Select This Class"}
								</button>

								{recommendation?.classId === characterClass.id && (
									<div className="mt-3 text-center">
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
											Recommended for you
										</span>
									</div>
								)}
							</div>
						</div>
					))}
				</div>

				{/* Info Section */}
				<div className="mt-12 bg-white rounded-lg shadow-lg p-8">
					<h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
						How It Works
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="text-center">
							<div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
								<span className="text-2xl">1️⃣</span>
							</div>
							<h4 className="font-semibold text-gray-900 mb-2">
								Choose Your Class
							</h4>
							<p className="text-sm text-gray-600">
								Select a class that matches your referral style and goals
							</p>
						</div>
						<div className="text-center">
							<div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
								<span className="text-2xl">2️⃣</span>
							</div>
							<h4 className="font-semibold text-gray-900 mb-2">
								Earn XP Multiplier
							</h4>
							<p className="text-sm text-gray-600">
								Get bonus XP based on your class special abilities
							</p>
						</div>
						<div className="text-center">
							<div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
								<span className="text-2xl">3️⃣</span>
							</div>
							<h4 className="font-semibold text-gray-900 mb-2">
								Level Up & Unlock
							</h4>
							<p className="text-sm text-gray-600">
								Progress through levels and unlock new abilities
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

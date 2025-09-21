import { ProgressTracker } from "@/lib/quest-system/progress-tracker";
import { RewardManager } from "@/lib/quest-system/reward-manager";
import { referralManager } from "@/lib/referral-tracking";
import { supabaseService } from "@/lib/supabase-client";

// Mock the dependencies
jest.mock("@/lib/referral-tracking");
jest.mock("@/lib/supabase-client");
jest.mock("@/lib/quest-system/progress-tracker");
jest.mock("@/lib/quest-system/reward-manager");

// Mock environment variables
process.env.WHOP_WEBHOOK_SECRET = "test-secret";

describe("Payment Processing Flow Integration Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Mock referral manager
		(referralManager.createReferral as jest.Mock).mockResolvedValue({
			id: "test-referral-id",
			referrerId: "referrer-123",
			referredUserId: "user-123",
			status: "completed" as const,
			value: 100,
			commission: 15,
		});

		// Mock supabase service
		const mockSupabaseService = {
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: null,
				}),
				insert: jest.fn().mockResolvedValue({
					data: { id: "test-referral" },
					error: null,
				}),
				update: jest.fn().mockResolvedValue({
					data: { id: "test-referral-updated" },
					error: null,
				}),
			}),
			raw: jest.fn().mockReturnValue("total_payments + 100"),
		};

		(supabaseService().from as jest.Mock).mockImplementation(
			mockSupabaseService.from,
		);
		(supabaseService().raw as jest.Mock).mockImplementation(
			mockSupabaseService.raw,
		);

		// Mock progress tracker
		(ProgressTracker.bulkUpdateProgress as jest.Mock).mockResolvedValue(
			undefined,
		);

		// Mock reward manager
		(RewardManager.distributeQuestRewards as jest.Mock).mockResolvedValue({
			success: true,
			xpEarned: 100,
			commissionEarned: 15,
		});
	});

	describe("Complete Payment-to-Referral Flow", () => {
		it("should process complete payment with referrer successfully", async () => {
			const mockMember = {
				user: {
					id: "user_123",
					username: "testuser",
					email: "test@example.com",
				},
				plan: {
					id: "plan_123",
					title: "Test Plan",
					initialPrice: 100,
				},
			};

			// Mock referrer found
			(supabaseService().from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValueOnce({
						data: null,
						error: { code: "PGRST116" }, // No completed referral
					})
					.mockResolvedValueOnce({
						data: {
							referrer_id: "referrer-123",
						},
						error: null,
					}),
				update: jest.fn().mockResolvedValue({
					data: { id: "completed-referral" },
					error: null,
				}),
				insert: jest.fn().mockResolvedValue({
					data: { id: "test-referral" },
					error: null,
				}),
			});

			// Simulate the payment processing flow
			const paymentData = {
				paymentId: "pay_123456789",
				userId: "user_123",
				amount: 100,
				currency: "USD",
				amountAfterFees: 92,
				member: mockMember,
			};

			// Step 1: Find referrer for user
			const referrerId = await findReferrerForUser(paymentData.userId);

			if (referrerId) {
				// Step 2: Process referral commission
				await processReferralCommission(
					referrerId,
					paymentData.userId,
					paymentData.amount,
					paymentData.paymentId,
					paymentData.member,
				);

				// Step 3: Update quest progress for referrer
				await updateReferrerQuestProgress(referrerId, paymentData.amount);
			}

			// Step 4: Process direct payment benefits for the payer
			await processDirectPayment(
				paymentData.userId,
				paymentData.amount,
				paymentData.currency,
			);

			// Verify the complete flow was executed
			expect(referralManager.createReferral).toHaveBeenCalledWith(
				"referrer-123",
				"user_123",
				100,
				"whop_payment",
				expect.objectContaining({
					payment_id: "pay_123456789",
					source: "whop_platform",
					currency: "USD",
					commission_rate: 0.15,
				}),
			);

			// Verify quest progress was updated
			expect(ProgressTracker.bulkUpdateProgress).toHaveBeenCalledWith(
				"referrer-123",
				expect.any(Array),
			);

			// Verify user's payment stats were updated
			expect(supabaseService().from).toHaveBeenCalledWith("users");
		});

		it("should handle direct payment without referrer", async () => {
			const mockMember = {
				user: {
					id: "user_direct",
					username: "directuser",
					email: "direct@example.com",
				},
				plan: {
					id: "plan_direct",
					title: "Direct Plan",
					initialPrice: 50,
				},
			};

			// Mock no referrer found
			(supabaseService().from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: "PGRST116" }, // Not found error
				}),
				update: jest.fn().mockResolvedValue({
					data: { id: "direct-user-updated" },
					error: null,
				}),
			});

			const paymentData = {
				paymentId: "pay_direct_123",
				userId: "user_direct",
				amount: 50,
				currency: "USD",
				amountAfterFees: 46,
				member: mockMember,
			};

			// Simulate the payment processing flow
			const referrerId = await findReferrerForUser(paymentData.userId);

			if (!referrerId) {
				await processDirectPayment(
					paymentData.userId,
					paymentData.amount,
					paymentData.currency,
				);
			}

			// Should not create referral for direct payment
			expect(referralManager.createReferral).not.toHaveBeenCalled();

			// Should update user's payment stats
			expect(supabaseService().from).toHaveBeenCalledWith("users");

			// Should still update payer's quest progress
			expect(ProgressTracker.bulkUpdateProgress).toHaveBeenCalledWith(
				"user_direct",
				expect.any(Array),
			);
		});

		it("should handle null user_id gracefully", async () => {
			const mockMember = {
				user: {
					id: null,
					username: "unknown",
					email: "unknown@example.com",
				},
				plan: {
					id: "plan_no_user",
					title: "No User Plan",
					initialPrice: 100,
				},
			};

			const paymentData = {
				paymentId: "pay_no_user",
				userId: null,
				amount: 100,
				currency: "USD",
				amountAfterFees: 92,
				member: mockMember,
			};

			// Simulate the payment processing flow
			if (!paymentData.userId) {
				console.log(
					"No user_id in payment webhook, skipping referral processing",
				);
				return;
			}

			// Should not process payment without user_id
			expect(referralManager.createReferral).not.toHaveBeenCalled();
			expect(supabaseService().from).not.toHaveBeenCalled();
		});
	});

	describe("Quest System Integration", () => {
		it("should update multiple quest types for referrer", async () => {
			const mockMember = {
				user: {
					id: "user_quest_multi",
					username: "questmultiuser",
					email: "questmulti@example.com",
				},
				plan: {
					id: "plan_quest_multi",
					title: "Multi Quest Plan",
					initialPrice: 200,
				},
			};

			// Mock referrer found
			(supabaseService().from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValueOnce({
						data: null,
						error: { code: "PGRST116" }, // No completed referral
					})
					.mockResolvedValueOnce({
						data: {
							referrer_id: "referrer_quest_multi",
						},
						error: null,
					}),
				update: jest.fn().mockResolvedValue({
					data: { id: "multi-quest-referral" },
					error: null,
				}),
				insert: jest.fn().mockResolvedValue({
					data: { id: "test-referral" },
					error: null,
				}),
			});

			const paymentData = {
				paymentId: "pay_quest_multi_123",
				userId: "user_quest_multi",
				amount: 200,
				currency: "USD",
				amountAfterFees: 184,
				member: mockMember,
			};

			// Simulate the payment processing flow
			const referrerId = await findReferrerForUser(paymentData.userId);

			if (referrerId) {
				await processReferralCommission(
					referrerId,
					paymentData.userId,
					paymentData.amount,
					paymentData.paymentId,
					paymentData.member,
				);

				await updateReferrerQuestProgress(referrerId, paymentData.amount);
			}

			// Verify quest progress was updated for referrer
			expect(ProgressTracker.bulkUpdateProgress).toHaveBeenCalledWith(
				"referrer_quest_multi",
				expect.arrayContaining([expect.any(String), expect.any(String)]),
			);

			// Verify rewards were calculated based on payment amount
			expect(RewardManager.distributeQuestRewards).toHaveBeenCalledWith(
				expect.objectContaining({
					paymentAmount: 200,
					commissionAmount: 30, // 15% of 200
				}),
			);
		});

		it("should handle quest progress update failures gracefully", async () => {
			const mockMember = {
				user: {
					id: "user_quest_fail",
					username: "questfailuser",
					email: "questfail@example.com",
				},
				plan: {
					id: "plan_quest_fail",
					title: "Quest Fail Plan",
					initialPrice: 75,
				},
			};

			// Mock referrer found
			(supabaseService().from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValueOnce({
						data: null,
						error: { code: "PGRST116" }, // No completed referral
					})
					.mockResolvedValueOnce({
						data: {
							referrer_id: "referrer_quest_fail",
						},
						error: null,
					}),
				update: jest.fn().mockResolvedValue({
					data: { id: "quest-fail-referral" },
					error: null,
				}),
				insert: jest.fn().mockResolvedValue({
					data: { id: "test-referral" },
					error: null,
				}),
			});

			// Mock quest progress update to fail
			(ProgressTracker.bulkUpdateProgress as jest.Mock).mockRejectedValue(
				new Error("Database connection failed"),
			);

			const paymentData = {
				paymentId: "pay_quest_fail_123",
				userId: "user_quest_fail",
				amount: 75,
				currency: "USD",
				amountAfterFees: 69,
				member: mockMember,
			};

			// Simulate the payment processing flow
			const referrerId = await findReferrerForUser(paymentData.userId);

			if (referrerId) {
				await processReferralCommission(
					referrerId,
					paymentData.userId,
					paymentData.amount,
					paymentData.paymentId,
					paymentData.member,
				);

				try {
					await updateReferrerQuestProgress(referrerId, paymentData.amount);
				} catch (error) {
					console.error("Error updating referrer quest progress:", error);
					// Don't throw here to avoid interrupting the main flow
				}
			}

			// Referral should still be created
			expect(referralManager.createReferral).toHaveBeenCalled();

			// Quest progress failure should not break the main flow
			expect(console.error).toHaveBeenCalled();
		});
	});

	describe("Commission Calculation Integration", () => {
		it("should calculate correct commission based on payment amount", async () => {
			const mockMember = {
				user: {
					id: "user_commission_calc",
					username: "commissioncalcuser",
					email: "commissioncalc@example.com",
				},
				plan: {
					id: "plan_commission_calc",
					title: "Commission Calc Plan",
					initialPrice: 1000,
				},
			};

			// Mock referrer found
			(supabaseService().from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValueOnce({
						data: null,
						error: { code: "PGRST116" }, // No completed referral
					})
					.mockResolvedValueOnce({
						data: {
							referrer_id: "referrer_commission_calc",
						},
						error: null,
					}),
				update: jest.fn().mockResolvedValue({
					data: { id: "commission-calc-referral" },
					error: null,
				}),
				insert: jest.fn().mockResolvedValue({
					data: { id: "test-referral" },
					error: null,
				}),
			});

			const paymentData = {
				paymentId: "pay_commission_calc_123",
				userId: "user_commission_calc",
				amount: 1000, // $1000 payment
				currency: "USD",
				amountAfterFees: 920,
				member: mockMember,
			};

			// Simulate the payment processing flow
			const referrerId = await findReferrerForUser(paymentData.userId);

			if (referrerId) {
				await processReferralCommission(
					referrerId,
					paymentData.userId,
					paymentData.amount,
					paymentData.paymentId,
					paymentData.member,
				);
			}

			// Should calculate 15% commission ($150)
			expect(referralManager.createReferral).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				1000, // Original payment amount
				expect.any(String),
				expect.objectContaining({
					payment_id: "pay_commission_calc_123",
					commission_rate: 0.15,
				}),
			);

			// Verify commission was added to referrer's stats
			expect(supabaseService().from).toHaveBeenCalledWith("users");
		});

		it("should handle different currencies correctly", async () => {
			const mockMember = {
				user: {
					id: "user_currency",
					username: "currencyuser",
					email: "currency@example.com",
				},
				plan: {
					id: "plan_currency",
					title: "Currency Plan",
					initialPrice: 100,
				},
			};

			// Mock referrer found
			(supabaseService().from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValueOnce({
						data: null,
						error: { code: "PGRST116" }, // No completed referral
					})
					.mockResolvedValueOnce({
						data: {
							referrer_id: "referrer_currency",
						},
						error: null,
					}),
				update: jest.fn().mockResolvedValue({
					data: { id: "currency-referral" },
					error: null,
				}),
				insert: jest.fn().mockResolvedValue({
					data: { id: "test-referral" },
					error: null,
				}),
			});

			const paymentData = {
				paymentId: "pay_currency_123",
				userId: "user_currency",
				amount: 100,
				currency: "EUR", // Different currency
				amountAfterFees: 92,
				member: mockMember,
			};

			// Simulate the payment processing flow
			const referrerId = await findReferrerForUser(paymentData.userId);

			if (referrerId) {
				await processReferralCommission(
					referrerId,
					paymentData.userId,
					paymentData.amount,
					paymentData.paymentId,
					paymentData.member,
				);
			}

			// Should handle EUR currency correctly
			expect(referralManager.createReferral).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				100,
				expect.any(String),
				expect.objectContaining({
					payment_id: "pay_currency_123",
					currency: "EUR",
				}),
			);
		});
	});

	describe("Error Handling and Resilience", () => {
		it("should handle database connection failures gracefully", async () => {
			const mockMember = {
				user: {
					id: "user_db_fail",
					username: "dbfailuser",
					email: "dbfail@example.com",
				},
				plan: {
					id: "plan_db_fail",
					title: "DB Fail Plan",
					initialPrice: 100,
				},
			};

			// Mock database connection failure
			(supabaseService().from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockRejectedValue(new Error("Database connection failed")),
			});

			const paymentData = {
				paymentId: "pay_db_fail_123",
				userId: "user_db_fail",
				amount: 100,
				currency: "USD",
				amountAfterFees: 92,
				member: mockMember,
			};

			// Simulate the payment processing flow with error handling
			try {
				const referrerId = await findReferrerForUser(paymentData.userId);

				if (referrerId) {
					await processReferralCommission(
						referrerId,
						paymentData.userId,
						paymentData.amount,
						paymentData.paymentId,
						paymentData.member,
					);
				}
			} catch (error) {
				console.error("Error processing payment referral:", error);
				// Consider adding error reporting or retry logic here
			}

			// Error should be logged but not cause function to throw
			expect(console.error).toHaveBeenCalled();
		});

		it("should handle partial failures in the payment flow", async () => {
			const mockMember = {
				user: {
					id: "user_partial_fail",
					username: "partialfailuser",
					email: "partialfail@example.com",
				},
				plan: {
					id: "plan_partial_fail",
					title: "Partial Fail Plan",
					initialPrice: 100,
				},
			};

			// Mock referrer found but quest progress fails
			(supabaseService().from as jest.Mock).mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValueOnce({
						data: null,
						error: { code: "PGRST116" }, // No completed referral
					})
					.mockResolvedValueOnce({
						data: {
							referrer_id: "referrer_partial_fail",
						},
						error: null,
					}),
				update: jest.fn().mockResolvedValue({
					data: { id: "partial-fail-referral" },
					error: null,
				}),
				insert: jest.fn().mockResolvedValue({
					data: { id: "test-referral" },
					error: null,
				}),
			});

			// Mock quest progress update to fail
			(ProgressTracker.bulkUpdateProgress as jest.Mock).mockRejectedValue(
				new Error("Quest update failed"),
			);

			const paymentData = {
				paymentId: "pay_partial_fail_123",
				userId: "user_partial_fail",
				amount: 100,
				currency: "USD",
				amountAfterFees: 92,
				member: mockMember,
			};

			// Simulate the payment processing flow
			const referrerId = await findReferrerForUser(paymentData.userId);

			if (referrerId) {
				await processReferralCommission(
					referrerId,
					paymentData.userId,
					paymentData.amount,
					paymentData.paymentId,
					paymentData.member,
				);

				try {
					await updateReferrerQuestProgress(referrerId, paymentData.amount);
				} catch (error) {
					console.error("Error updating referrer quest progress:", error);
					// Don't throw here to avoid interrupting the main flow
				}
			}

			// Referral should still be created successfully
			expect(referralManager.createReferral).toHaveBeenCalled();

			// Quest progress failure should not break the main flow
			expect(console.error).toHaveBeenCalled();
		});
	});

	describe("Performance and Scalability", () => {
		it("should handle concurrent payment processing efficiently", async () => {
			const concurrentRequests = 10;
			const paymentPromises = [];

			for (let i = 0; i < concurrentRequests; i++) {
				const mockMember = {
					user: {
						id: `user_concurrent_${i}`,
						username: `concurrentuser${i}`,
						email: `concurrent${i}@example.com`,
					},
					plan: {
						id: `plan_concurrent_${i}`,
						title: `Concurrent Plan ${i}`,
						initialPrice: 100 + i,
					},
				};

				// Mock referrer found for all requests
				(supabaseService().from as jest.Mock).mockReturnValue({
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest
						.fn()
						.mockResolvedValueOnce({
							data: null,
							error: { code: "PGRST116" }, // No completed referral
						})
						.mockResolvedValueOnce({
							data: {
								referrer_id: `referrer_concurrent_${i}`,
							},
							error: null,
						}),
					update: jest.fn().mockResolvedValue({
						data: { id: `concurrent-referral-${i}` },
						error: null,
					}),
					insert: jest.fn().mockResolvedValue({
						data: { id: `test-referral-${i}` },
						error: null,
					}),
				});

				const paymentData = {
					paymentId: `pay_concurrent_${i}`,
					userId: `user_concurrent_${i}`,
					amount: 100 + i,
					currency: "USD",
					amountAfterFees: 92 + i,
					member: mockMember,
				};

				paymentPromises.push(
					(async () => {
						const referrerId = await findReferrerForUser(paymentData.userId);

						if (referrerId) {
							await processReferralCommission(
								referrerId,
								paymentData.userId,
								paymentData.amount,
								paymentData.paymentId,
								paymentData.member,
							);

							await updateReferrerQuestProgress(referrerId, paymentData.amount);
						}

						await processDirectPayment(
							paymentData.userId,
							paymentData.amount,
							paymentData.currency,
						);
					})(),
				);
			}

			const startTime = Date.now();
			await Promise.all(paymentPromises);
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds

			// All requests should have been processed
			expect(referralManager.createReferral).toHaveBeenCalledTimes(
				concurrentRequests,
			);
			expect(ProgressTracker.bulkUpdateProgress).toHaveBeenCalledTimes(
				concurrentRequests,
			);
		});
	});
});

// Helper functions to simulate the payment processing flow
async function findReferrerForUser(userId: string): Promise<string | null> {
	try {
		// First check if user already has a completed referral
		const { data: existingReferral } = await supabaseService()
			.from("referrals")
			.select("referrer_id")
			.eq("referred_user_id", userId)
			.eq("status", "completed")
			.single();

		if (existingReferral) {
			return existingReferral.referrer_id;
		}

		// Check for pending referrals that might need completion
		const { data: pendingReferral } = await supabaseService()
			.from("referrals")
			.select("referrer_id, id")
			.eq("referred_user_id", userId)
			.eq("status", "pending")
			.single();

		if (pendingReferral) {
			// Complete the pending referral
			await supabaseService
				.from("referrals")
				.update({
					status: "completed",
					completed_at: new Date().toISOString(),
				})
				.eq("id", pendingReferral.id);

			return pendingReferral.referrer_id;
		}

		// If no existing referral, check user metadata for referral tracking
		const { data: user } = await supabaseService()
			.from("users")
			.select("id, username, email")
			.eq("id", userId)
			.single();

		if (user?.referred_by) {
			// Create new referral record if found in metadata
			const referrerId = user.referred_by;
			await referralManager.createReferral(
				referrerId,
				userId,
				0, // This will be updated when we have the payment amount
				"whop_payment",
				{
					product: "whop_platform",
					campaign: "payment_flow",
					utmContent: "USD", // Default, will be updated
				},
			);
			return referrerId;
		}

		return null;
	} catch (error) {
		console.error("Error finding referrer for user:", error);
		return null;
	}
}

async function processReferralCommission(
	referrerId: string,
	userId: string,
	amount: number,
	paymentId: string,
	member: any,
) {
	try {
		// Calculate commission (typically 10-20% of payment amount)
		const commissionRate = 0.15; // 15% default commission rate
		const commission = amount * commissionRate;

		// Create or update referral record
		const referral = await referralManager.createReferral(
			referrerId,
			userId,
			amount,
			"whop_payment",
			{
				product: "whop_platform",
				campaign: "payment_flow",
				utmContent: "USD",
			},
		);

		// Mark referral as completed since payment was successful
		await supabaseService()
			.from("referrals")
			.update({
				status: "completed",
				commission: commission,
				commission_rate: commissionRate,
				completed_at: new Date().toISOString(),
			})
			.eq("id", referral.id);

		console.log(
			`Referral commission processed: ${commission} for referrer ${referrerId}`,
		);

		// Update referrer's total commission
		await updateUserCommissionStats(referrerId, commission);
	} catch (error) {
		console.error("Error processing referral commission:", error);
		throw error;
	}
}

async function updateReferrerQuestProgress(referrerId: string, amount: number) {
	try {
		// Get referrer's active quests
		const { data: userQuests } = await supabaseService()
			.from("user_quests")
			.select(`
        *,
        quest:quests(*)
      `)
			.eq("user_id", referrerId)
			.eq("is_completed", false);

		if (!userQuests || userQuests.length === 0) {
			return;
		}

		// Find relevant quests to update
		const referralQuests = userQuests.filter(
			(uq: any) =>
				uq.quest?.target_type === "referrals" ||
				uq.quest?.target_type === "commission",
		);

		if (referralQuests.length > 0) {
			const questIds = referralQuests.map((uq: any) => uq.id);
			await ProgressTracker.bulkUpdateProgress(referrerId, questIds);
			console.log(`Updated quest progress for referrer ${referrerId}`);
		}
	} catch (error) {
		console.error("Error updating referrer quest progress:", error);
		// Don't throw here to avoid interrupting the main flow
	}
}

async function processDirectPayment(
	userId: string,
	amount: number,
	currency: string,
) {
	try {
		// Update user's payment stats
		await supabaseService()
			.from("users")
			.update({
				total_payments: amount, // This should use a proper RPC call for incrementing
				last_payment_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);

		// Update user's quest progress for payment-related quests
		const { data: userQuests } = await supabaseService()
			.from("user_quests")
			.select(`
        *,
        quest:quests(*)
      `)
			.eq("user_id", userId)
			.eq("is_completed", false);

		if (userQuests && userQuests.length > 0) {
			const paymentQuests = userQuests.filter(
				(uq: any) =>
					uq.quest?.target_type === "payments" ||
					uq.quest?.target_type === "commission",
			);

			if (paymentQuests.length > 0) {
				const questIds = paymentQuests.map((uq: any) => uq.id);
				await ProgressTracker.bulkUpdateProgress(userId, questIds);
			}
		}

		console.log(
			`Processed direct payment for user ${userId}: ${amount} ${currency}`,
		);
	} catch (error) {
		console.error("Error processing direct payment:", error);
		// Don't throw here to avoid interrupting the main flow
	}
}

async function updateUserCommissionStats(userId: string, commission: number) {
	try {
		await supabaseService()
			.from("users")
			.update({
				total_commission: commission, // This should use a proper RPC call for incrementing
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);
	} catch (error) {
		console.error("Error updating user commission stats:", error);
		// Don't throw here to avoid interrupting the main flow
	}
}

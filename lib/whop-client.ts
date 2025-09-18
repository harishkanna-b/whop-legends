import { WhopServerSdk } from '@whop/api';

// Whop API configuration
const whopApiKey = process.env.WHOP_API_KEY!;

if (!whopApiKey) {
  throw new Error('WHOP_API_KEY environment variable is required');
}

// Initialize Whop server SDK
export const whopClient = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "fallback",
  appApiKey: whopApiKey,
  onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
  companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
});

// Rate limiting configuration
export const WHOP_RATE_LIMITS = {
  requestsPerMinute: 100,
  requestsPerSecond: 2,
  retryDelay: 1000, // 1 second base delay for retries
};

// Utility function to handle rate limiting
export const withRateLimit = async <T>(
  operation: () => Promise<T>,
  customDelay?: number
): Promise<T> => {
  const delay = customDelay || WHOP_RATE_LIMITS.retryDelay;
  await new Promise(resolve => setTimeout(resolve, delay));
  return operation();
};

// Common API operations with error handling
export const whopApi = {
  // Get user information
  async getUser(userId: string) {
    try {
      const result = await withRateLimit(async () => {
        return await whopClient.users.getUser({ userId });
      });
      return result;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error(`Failed to fetch user ${userId}: ${(error as Error).message}`);
    }
  },

  // Get payment information (using receipts as payment proxy)
  async getPayment(paymentId: string) {
    try {
      const result = await withRateLimit(async () => {
        // Note: Whop API may not have direct payment lookup
        // This method may need to be implemented differently based on actual use case
        // For now, return null as payment lookup may not be available
        return null;
      });
      return result;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw new Error(`Failed to fetch payment ${paymentId}: ${(error as Error).message}`);
    }
  },

  // Get user ledger account (for commission info)
  async getUserLedger(userId: string) {
    try {
      const result = await withRateLimit(async () => {
        // Get current user's ledger account
        const ledger = await whopClient.users.getUserLedgerAccount();
        return ledger;
      });
      return result;
    } catch (error) {
      console.error('Error fetching user ledger:', error);
      throw new Error(`Failed to fetch user ledger ${userId}: ${(error as Error).message}`);
    }
  },

  // Get current user information
  async getCurrentUser() {
    try {
      const result = await withRateLimit(async () => {
        return await whopClient.users.getCurrentUser();
      });
      return result;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw new Error(`Failed to fetch current user: ${(error as Error).message}`);
    }
  },

  // List receipts for a user (payment history) - not implemented in current API
  async getUserReceipts(userId: string, _options?: { first?: number; after?: string }) {
    try {
      const result = await withRateLimit(async () => {
        // Note: listReceiptsForCompany may not be available in current API version
        // This method would need to be implemented based on actual API capabilities
        return { receipts: [] };
      });
      return result;
    } catch (error) {
      console.error('Error fetching user receipts:', error);
      throw new Error(`Failed to fetch user receipts ${userId}: ${(error as Error).message}`);
    }
  },
};

// Health check function
export const checkWhopConnection = async (): Promise<boolean> => {
  try {
    await withRateLimit(async () => {
      // Try to get current user as a health check
      await whopClient.users.getCurrentUser();
    });
    console.log('Whop API connection successful');
    return true;
  } catch (error) {
    console.error('Whop API connection check failed:', error);
    return false;
  }
};
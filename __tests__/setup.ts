// Test setup file
import { afterAll, beforeAll } from "@jest/globals";

// Set up test environment variables
(process.env as any).NODE_ENV = "test";

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.WHOP_WEBHOOK_SECRET = "test-webhook-secret-for-testing";

// Global Supabase mock
const createMockSupabaseClient = () => ({
	from: jest.fn().mockReturnThis(),
	select: jest.fn().mockReturnThis(),
	insert: jest.fn().mockReturnThis(),
	update: jest.fn().mockReturnThis(),
	delete: jest.fn().mockReturnThis(),
	eq: jest.fn().mockReturnThis(),
	neq: jest.fn().mockReturnThis(),
	gt: jest.fn().mockReturnThis(),
	gte: jest.fn().mockReturnThis(),
	lt: jest.fn().mockReturnThis(),
	lte: jest.fn().mockReturnThis(),
	like: jest.fn().mockReturnThis(),
	ilike: jest.fn().mockReturnThis(),
	in: jest.fn().mockReturnThis(),
	order: jest.fn().mockReturnThis(),
	range: jest.fn().mockReturnThis(),
	limit: jest.fn().mockReturnThis(),
	offset: jest.fn().mockReturnThis(),
	single: jest.fn().mockReturnThis(),
	maybeSingle: jest.fn().mockReturnThis(),
	rpc: jest.fn().mockReturnThis(),
	channel: jest.fn().mockReturnThis(),
	auth: {
		getUser: jest.fn(),
		signUp: jest.fn(),
		signIn: jest.fn(),
		signOut: jest.fn(),
		updateUser: jest.fn(),
		resetPasswordForEmail: jest.fn(),
	},
	or: jest.fn().mockReturnThis(),
	match: jest.fn().mockReturnThis(),
});

jest.mock("@/lib/supabase-client", () => ({
	supabase: createMockSupabaseClient(),
	supabaseService: createMockSupabaseClient(),
}));

// Global test setup
beforeAll(() => {
	// Global setup for all tests
	console.log("Setting up test environment...");
});

afterAll(() => {
	// Global cleanup for all tests
	console.log("Cleaning up test environment...");
});

// Extend Jest timeout for database operations
jest.setTimeout(10000);

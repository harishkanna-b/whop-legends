// Test setup file
import { beforeAll, afterAll } from '@jest/globals';

// Set up test environment variables
(process.env as any).NODE_ENV = 'test';

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.WHOP_WEBHOOK_SECRET = 'test-webhook-secret-for-testing';

// Global Supabase mock
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    zremrangebyscore: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    zcard: jest.fn().mockReturnThis(),
  }
}));

// Global test setup
beforeAll(() => {
  // Global setup for all tests
  console.log('Setting up test environment...');
});

afterAll(() => {
  // Global cleanup for all tests
  console.log('Cleaning up test environment...');
});

// Extend Jest timeout for database operations
jest.setTimeout(10000);
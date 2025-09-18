import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createUser, getUserByWhopId, updateUser } from '../../lib/database-utils';
import { supabaseService } from '../../lib/supabase-client';

describe('User Operations', () => {
  const testUser = {
    whop_user_id: 'test_user_123',
    company_id: 'test_company_123',
    username: 'testuser',
    email: 'test@example.com',
    character_class: 'scout' as const,
    level: 1,
    experience_points: 0,
    prestige_level: 0,
    total_referrals: 0,
    total_commission: 0,
  };

  let createdUserId: string;

  beforeAll(async () => {
    // Clean up any existing test user
    await supabaseService
      .from('users')
      .delete()
      .eq('whop_user_id', testUser.whop_user_id);
  });

  afterAll(async () => {
    // Clean up test user
    if (createdUserId) {
      await supabaseService
        .from('users')
        .delete()
        .eq('id', createdUserId);
    }
  });

  it('should create a new user', async () => {
    const user = await createUser(testUser);

    expect(user).toBeTruthy();
    expect(user.whop_user_id).toBe(testUser.whop_user_id);
    expect(user.username).toBe(testUser.username);
    expect(user.character_class).toBe(testUser.character_class);
    expect(user.level).toBe(testUser.level);

    createdUserId = user.id;
  });

  it('should get user by Whop ID', async () => {
    const user = await getUserByWhopId(testUser.whop_user_id);

    expect(user).toBeTruthy();
    expect(user?.whop_user_id).toBe(testUser.whop_user_id);
    expect(user?.username).toBe(testUser.username);
  });

  it('should update user information', async () => {
    const updates = {
      level: 2,
      experience_points: 150,
      total_referrals: 1,
    };

    const updatedUser = await updateUser(createdUserId, updates);

    expect(updatedUser).toBeTruthy();
    expect(updatedUser.level).toBe(updates.level);
    expect(updatedUser.experience_points).toBe(updates.experience_points);
    expect(updatedUser.total_referrals).toBe(updates.total_referrals);
  });

  it('should return null for non-existent user', async () => {
    const user = await getUserByWhopId('non_existent_user');
    expect(user).toBeNull();
  });

  it('should handle duplicate user creation', async () => {
    await expect(createUser(testUser)).rejects.toThrow();
  });
});
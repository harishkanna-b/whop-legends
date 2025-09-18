import { supabase, supabaseService, Database } from './supabase-client';

// Database utility functions for common operations

// User operations
export const getUserByWhopId = async (whopUserId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('whop_user_id', whopUserId)
    .single();

  if (error) {
    console.error('Error fetching user by Whop ID:', error);
    return null;
  }

  return data;
};

export const createUser = async (userData: Database['public']['Tables']['users']['Insert']) => {
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data;
};

export const updateUser = async (userId: string, updates: Database['public']['Tables']['users']['Update']) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }

  return data;
};

// Character class operations
export const getCharacterClasses = async () => {
  const { data, error } = await supabase
    .from('character_classes')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching character classes:', error);
    return [];
  }

  return data;
};

export const getCharacterClass = async (name: string) => {
  const { data, error } = await supabase
    .from('character_classes')
    .select('*')
    .eq('name', name)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching character class:', error);
    return null;
  }

  return data;
};

// Referral operations
export const createReferral = async (referralData: Database['public']['Tables']['referrals']['Insert']) => {
  const { data, error } = await supabase
    .from('referrals')
    .insert(referralData)
    .select()
    .single();

  if (error) {
    console.error('Error creating referral:', error);
    throw error;
  }

  return data;
};

export const updateReferral = async (referralId: string, updates: Database['public']['Tables']['referrals']['Update']) => {
  const { data, error } = await supabase
    .from('referrals')
    .update(updates)
    .eq('id', referralId)
    .select()
    .single();

  if (error) {
    console.error('Error updating referral:', error);
    throw error;
  }

  return data;
};

export const getReferralsByUser = async (userId: string, limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching referrals:', error);
    return [];
  }

  return data;
};

// Quest operations
export const getQuestsByCompany = async (companyId: string, isActive = true) => {
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', isActive)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quests:', error);
    return [];
  }

  return data;
};

export const getUserQuests = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_quests')
    .select(`
      *,
      quest:quests(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user quests:', error);
    return [];
  }

  return data;
};

export const assignQuestToUser = async (userId: string, questId: string) => {
  const { data, error } = await supabase
    .from('user_quests')
    .insert({
      user_id: userId,
      quest_id: questId,
      progress_value: 0,
      is_completed: false,
      reward_claimed: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error assigning quest to user:', error);
    throw error;
  }

  return data;
};

export const updateUserQuestProgress = async (userQuestId: string, progressValue: number) => {
  const { data, error } = await supabase
    .from('user_quests')
    .update({ progress_value: progressValue, updated_at: new Date().toISOString() })
    .eq('id', userQuestId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user quest progress:', error);
    throw error;
  }

  return data;
};

// Achievement operations
export const getAchievements = async (isActive = true) => {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', isActive)
    .order('rarity', { ascending: true });

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return data;
};

export const getUserAchievements = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }

  return data;
};

// Guild operations
export const getGuildsByCompany = async (companyId: string) => {
  const { data, error } = await supabase
    .from('guilds')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('total_referrals', { ascending: false });

  if (error) {
    console.error('Error fetching guilds:', error);
    return [];
  }

  return data;
};

export const getGuildMembers = async (guildId: string) => {
  const { data, error } = await supabase
    .from('guild_members')
    .select(`
      *,
      user:users(*)
    `)
    .eq('guild_id', guildId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching guild members:', error);
    return [];
  }

  return data;
};

// Creator settings operations
export const getCreatorSettings = async (companyId: string) => {
  const { data, error } = await supabase
    .from('creator_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error fetching creator settings:', error);
    return null;
  }

  return data;
};

export const updateCreatorSettings = async (companyId: string, settings: any) => {
  const { data, error } = await supabase
    .from('creator_settings')
    .upsert({
      company_id: companyId,
      ...settings,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating creator settings:', error);
    throw error;
  }

  return data;
};

// Database health check
export const checkDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('character_classes')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database connection check failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database connection check error:', error);
    return false;
  }
};

// Real-time subscription setup
export const subscribeToUserUpdates = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`user-updates-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export const subscribeToReferralUpdates = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`referral-updates-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'referrals',
        filter: `referrer_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export const subscribeToQuestUpdates = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`quest-updates-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_quests',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

// Utility function to generate referral codes
export const generateReferralCode = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Bulk operations for performance
export const bulkCreateReferrals = async (referrals: Database['public']['Tables']['referrals']['Insert'][]) => {
  const { data, error } = await supabase
    .from('referrals')
    .insert(referrals)
    .select();

  if (error) {
    console.error('Error bulk creating referrals:', error);
    throw error;
  }

  return data;
};

// Pagination helper
export const getPaginatedData = async (
  table: string,
  userId: string,
  page = 1,
  pageSize = 20,
  filters = {}
) => {
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .match(filters)
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error(`Error fetching paginated data from ${table}:`, error);
    return { data: [], total: 0, page, pageSize };
  }

  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  };
};
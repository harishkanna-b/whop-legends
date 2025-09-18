import { createClient } from '@supabase/supabase-js';

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceSeedDatabase() {
  try {
    console.log('🌱 Force seeding Whop Legends database...');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await supabase.from('user_achievements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('achievements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('user_quests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('quests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('guild_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('guilds').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('referrals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('character_classes').delete().neq('name', '');

    console.log('✅ Existing data cleared');

    // Insert character classes
    console.log('📚 Inserting character classes...');
    const { data: classes, error: classError } = await supabase
      .from('character_classes')
      .insert([
        {
          name: 'scout',
          display_name: 'Scout',
          description: 'Specializes in finding new referral opportunities with balanced XP and commission gains',
          base_xp_multiplier: 1.200,
          commission_multiplier: 1.100,
          abilities: { passive: ['Referral Insight', 'Network Expansion'] },
          requirements: { level: 1 }
        },
        {
          name: 'sage',
          display_name: 'Sage',
          description: 'Focuses on strategic referrals with quest bonuses and consistent performance',
          base_xp_multiplier: 1.100,
          commission_multiplier: 1.000,
          abilities: { passive: ['Quest Mastery', 'Wisdom Boost'] },
          requirements: { level: 1 }
        },
        {
          name: 'champion',
          display_name: 'Champion',
          description: 'Excels at high-value referrals with maximum XP multiplier',
          base_xp_multiplier: 1.300,
          commission_multiplier: 1.200,
          abilities: { passive: ['Commission Boost', 'Valor Strike'] },
          requirements: { level: 1 }
        }
      ])
      .select();

    if (classError) {
      console.error('❌ Error inserting character classes:', classError);
      return;
    }

    console.log('✅ Character classes inserted successfully');

    // Insert achievements
    console.log('🏆 Inserting achievements...');
    const { data: achievements, error: achievementError } = await supabase
      .from('achievements')
      .insert([
        {
          name: 'first_referral',
          display_name: 'First Referral',
          description: 'Complete your first successful referral',
          category: 'referrals',
          rarity: 'common',
          requirements: { referrals: 1 },
          is_active: true
        },
        {
          name: 'level_5',
          display_name: 'Level 5',
          description: 'Reach level 5',
          category: 'progression',
          rarity: 'common',
          requirements: { level: 5 },
          is_active: true
        },
        {
          name: 'quest_master',
          display_name: 'Quest Master',
          description: 'Complete 10 quests',
          category: 'quests',
          rarity: 'rare',
          requirements: { quests_completed: 10 },
          is_active: true
        },
        {
          name: 'referral_champion',
          display_name: 'Referral Champion',
          description: 'Complete 50 successful referrals',
          category: 'referrals',
          rarity: 'epic',
          requirements: { referrals: 50 },
          is_active: true
        },
        {
          name: 'guild_leader',
          display_name: 'Guild Leader',
          description: 'Create and lead a guild with 10+ members',
          category: 'guilds',
          rarity: 'rare',
          requirements: { guild_members: 10 },
          is_active: true
        }
      ])
      .select();

    if (achievementError) {
      console.error('❌ Error inserting achievements:', achievementError);
    } else {
      console.log('✅ Achievements inserted successfully:', achievements?.length || 0);
    }

    // Insert sample quests
    console.log('📋 Inserting sample quests...');
    const { data: quests, error: questError } = await supabase
      .from('quests')
      .insert([
        {
          company_id: 'default_company',
          title: 'First Steps',
          description: 'Complete your first referral and earn your initial XP',
          quest_type: 'daily',
          difficulty: 'easy',
          target_type: 'referrals',
          target_value: 1,
          reward_xp: 100,
          reward_commission: 0.00,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        },
        {
          company_id: 'default_company',
          title: 'Network Builder',
          description: 'Build your network by completing 5 successful referrals',
          quest_type: 'weekly',
          difficulty: 'medium',
          target_type: 'referrals',
          target_value: 5,
          reward_xp: 500,
          reward_commission: 10.00,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
        },
        {
          company_id: 'default_company',
          title: 'Quest Explorer',
          description: 'Complete 10 different types of quests',
          quest_type: 'special',
          difficulty: 'medium',
          target_type: 'achievements',
          target_value: 10,
          reward_xp: 300,
          reward_commission: 5.00,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
        },
        {
          company_id: 'default_company',
          title: 'Guild Founder',
          description: 'Create your first guild and recruit 3 members',
          quest_type: 'special',
          difficulty: 'hard',
          target_type: 'referrals',
          target_value: 3,
          reward_xp: 750,
          reward_commission: 15.00,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days
        }
      ])
      .select();

    if (questError) {
      console.error('❌ Error inserting quests:', questError);
    } else {
      console.log('✅ Quests inserted successfully:', quests?.length || 0);
    }

    console.log('🎉 Database force seeding completed!');

  } catch (error) {
    console.error('❌ Fatal error during database seeding:', error);
    process.exit(1);
  }
}

// Execute the force seeding
forceSeedDatabase();
import { createClient } from '@supabase/supabase-js';
import { generateReferralCode } from '../lib/database-utils';

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  try {
    console.log('🌱 Seeding Whop Legends database...');

    // Check if character classes exist
    const { data: existingClasses, error: checkError } = await supabase
      .from('character_classes')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking character classes:', checkError);
      return;
    }

    if (existingClasses && existingClasses.length > 0) {
      console.log('✅ Database already seeded');
      return;
    }

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
    console.log('📋 Classes:', classes?.map(c => c.display_name).join(', '));

    // Insert sample achievements
    console.log('🏆 Inserting sample achievements...');
    const { data: achievements, error: achievementError } = await supabase
      .from('achievements')
      .insert([
        {
          name: 'first_referral',
          display_name: 'First Referral',
          description: 'Complete your first successful referral',
          category: 'referrals',
          rarity: 'common',
          requirements: { referrals: 1 }
        },
        {
          name: 'level_5',
          display_name: 'Level 5',
          description: 'Reach level 5',
          category: 'progression',
          rarity: 'common',
          requirements: { level: 5 }
        },
        {
          name: 'quest_master',
          display_name: 'Quest Master',
          description: 'Complete 10 quests',
          category: 'quests',
          rarity: 'rare',
          requirements: { quests_completed: 10 }
        }
      ])
      .select();

    if (achievementError) {
      console.error('❌ Error inserting achievements:', achievementError);
    } else {
      console.log('✅ Achievements inserted successfully');
    }

    console.log('🎉 Database seeding completed!');

  } catch (error) {
    console.error('❌ Fatal error during database seeding:', error);
    process.exit(1);
  }
}

// Execute the seeding
seedDatabase();
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

async function runSQL() {
  try {
    console.log('🔧 Running SQL to create character_classes table...');

    // Use the Supabase SQL RPC function
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS character_classes (
            name VARCHAR(50) PRIMARY KEY,
            display_name VARCHAR(100) NOT NULL,
            description TEXT,
            base_xp_multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.000,
            commission_multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.000,
            abilities JSONB DEFAULT '{}',
            requirements JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      });

    if (error) {
      console.error('❌ Error running SQL:', error);

      // Try the alternative approach - check if we can just insert data
      console.log('🔄 Trying to insert character class data directly...');
      const { data: insertData, error: insertError } = await supabase
        .from('character_classes')
        .insert({
          name: 'scout',
          display_name: 'Scout',
          description: 'Specializes in finding new referral opportunities',
          base_xp_multiplier: 1.200,
          commission_multiplier: 1.100
        });

      if (insertError) {
        console.error('❌ Insert also failed:', insertError);
      } else {
        console.log('✅ Insert successful - table exists!');
      }
    } else {
      console.log('✅ SQL executed successfully');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Execute the SQL
runSQL();
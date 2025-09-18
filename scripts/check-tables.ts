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

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...');

    // Query to list all tables in the public schema
    const { data, error } = await supabase
      .from('pg_tables')
      .select('*')
      .eq('schemaname', 'public');

    if (error) {
      console.error('❌ Error querying tables:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Found tables:');
      data.forEach(table => {
        console.log(`  - ${table.tablename}`);
      });
    } else {
      console.log('❌ No tables found in public schema');
    }

    // Try to create character_classes table directly
    console.log('\n🔧 Creating character_classes table...');
    const { error: createError } = await supabase.rpc('exec_sql', {
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

    if (createError) {
      console.error('❌ Error creating table:', createError);
    } else {
      console.log('✅ Table created successfully');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Execute the check
checkTables();
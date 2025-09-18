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

async function createTableDirectly() {
  try {
    console.log('🔧 Creating character_classes table using REST API...');

    // Use the raw SQL query via the Supabase API
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: `
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
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error creating table:', error);
    } else {
      console.log('✅ Table created successfully');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Execute the table creation
createTableDirectly();
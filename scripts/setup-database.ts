import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Whop Legends database...');

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const sqlSchema = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Read migration file successfully');

    // Split the SQL into individual statements
    const statements = sqlSchema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`🔢 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err);
        // Continue with other statements
      }
    }

    console.log('🎉 Database setup completed!');

    // Verify setup by checking character classes
    const { data: classes, error } = await supabase
      .from('character_classes')
      .select('*');

    if (error) {
      console.error('❌ Error verifying setup:', error);
    } else {
      console.log(`✅ Found ${classes?.length || 0} character classes`);
      if (classes && classes.length > 0) {
        console.log('📋 Character classes:');
        classes.forEach(cls => {
          console.log(`   - ${cls.name} (${cls.display_name})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Fatal error during database setup:', error);
    process.exit(1);
  }
}

// Execute the setup
setupDatabase();
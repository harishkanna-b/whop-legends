import { createClient } from "@supabase/supabase-js";

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log("🔍 Testing Supabase connection...");
console.log("URL:", supabaseUrl);
console.log("Anon Key:", supabaseAnonKey ? "***SET***" : "***MISSING***");
console.log("Service Key:", supabaseServiceKey ? "***SET***" : "***MISSING***");

if (!supabaseUrl || !supabaseAnonKey) {
	console.error("❌ Missing required environment variables");
	console.log("");
	console.log("📝 To get your Supabase keys:");
	console.log(
		"1. Go to https://supabase.com/dashboard/project/slftjqvrjdkzvzenmvnq",
	);
	console.log("2. Navigate to Settings → API");
	console.log('3. Copy the "anon" public key and "service_role" secret key');
	console.log("4. Update your .env.local file with these keys");
	process.exit(1);
}

// Test connection with anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
	try {
		console.log("🚀 Testing connection with anon key...");

		// Simple test query
		const { data, error } = await supabase
			.from("character_classes")
			.select("*")
			.limit(1);

		if (error) {
			console.error("❌ Connection test failed:", error.message);

			if (
				error.message.includes('relation "character_classes" does not exist')
			) {
				console.log(
					"💡 This is expected - the database schema hasn't been created yet.",
				);
				console.log("📝 To set up the database:");
				console.log("1. Go to your Supabase dashboard");
				console.log("2. Navigate to the SQL Editor");
				console.log(
					"3. Copy the schema from supabase/migrations/001_initial_schema.sql",
				);
				console.log("4. Run the SQL to create all tables");
			}

			return false;
		}

		console.log("✅ Connection successful!");
		console.log("📊 Found", data?.length || 0, "character classes");
		return true;
	} catch (error) {
		console.error("❌ Connection test error:", error);
		return false;
	}
}

// Execute the test
testConnection();

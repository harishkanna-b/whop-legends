import { createClient } from "@supabase/supabase-js";

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
	console.error("Missing Supabase environment variables");
	process.exit(1);
}

// Create Supabase client with anon key (no authentication)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugUsers() {
	try {
		console.log("🔍 Debugging users table access...");

		// Try to get users
		const { data: users, error: usersError } = await supabase
			.from("users")
			.select("*");

		console.log("\nUsers table access result:");
		if (usersError) {
			console.log("❌ Error:", usersError);
		} else {
			console.log("✅ Success - Users found:", users?.length || 0);
			if (users && users.length > 0) {
				console.log("Sample user:", JSON.stringify(users[0], null, 2));
			}
		}

		// Check if there are any existing policies
		console.log("\n🔍 Checking table info...");

		// Use raw SQL to check RLS status
		const { data: rlsStatus, error: rlsError } = await supabase
			.from("pg_class")
			.select("relrowsecurity")
			.eq("relname", "users");

		if (rlsError) {
			console.log("❌ Cannot check RLS status:", rlsError);
		} else {
			console.log("RLS enabled:", rlsStatus);
		}
	} catch (error) {
		console.error("❌ Fatal error:", error);
	}
}

// Execute the debug
debugUsers();

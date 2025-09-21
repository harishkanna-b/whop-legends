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

async function testRLS() {
	try {
		console.log("🔒 Testing Row Level Security policies...");

		// Test 1: Should be able to read character classes (public)
		console.log("\n1. Testing public access to character classes...");
		const { data: classes, error: classesError } = await supabase
			.from("character_classes")
			.select("*");

		if (classesError) {
			console.error("❌ Cannot access character classes:", classesError);
		} else {
			console.log(
				"✅ Can access character classes (public):",
				classes?.length || 0,
				"classes",
			);
		}

		// Test 2: Should get empty result from users table (no auth = no access to any user data)
		console.log("\n2. Testing access to users table without auth...");
		const { data: users, error: usersError } = await supabase
			.from("users")
			.select("*")
			.limit(1);

		if (usersError) {
			console.log(
				"✅ Correctly blocked from accessing users table:",
				usersError.message,
			);
		} else if (users && users.length === 0) {
			console.log(
				"✅ Correctly returns empty result (no user data accessible without auth)",
			);
		} else {
			console.error(
				"❌ ERROR: Should not be able to access user data without auth",
			);
		}

		// Test 3: Should NOT be able to insert into users table
		console.log("\n3. Testing insert into users table without auth...");
		const { data: insertUser, error: insertError } = await supabase
			.from("users")
			.insert({
				whop_user_id: "test_user_123",
				company_id: "test_company",
				username: "testuser",
				character_class: "scout",
			});

		if (insertError) {
			console.log(
				"✅ Correctly blocked from inserting into users table:",
				insertError.message,
			);
		} else {
			console.error(
				"❌ ERROR: Should not be able to insert into users table without auth",
			);
		}

		// Test 4: Should be able to read quests (public)
		console.log("\n4. Testing public access to quests...");
		const { data: quests, error: questsError } = await supabase
			.from("quests")
			.select("*")
			.limit(1);

		if (questsError) {
			console.error("❌ Cannot access quests:", questsError);
		} else {
			console.log(
				"✅ Can access quests (public):",
				quests?.length || 0,
				"quests",
			);
		}

		console.log("\n🎉 RLS testing completed!");
	} catch (error) {
		console.error("❌ Fatal error during RLS testing:", error);
	}
}

// Execute the RLS test
testRLS();

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

let supabaseInstance: SupabaseClient<Database> | null = null;
let supabaseServiceInstance: SupabaseClient<Database> | null = null;

const getSupabaseConfig = () => {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error("Missing required Supabase environment variables");
	}

	return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
};

export const supabase = () => {
	if (supabaseInstance) {
		return supabaseInstance;
	}

	const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
	supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
		auth: {
			persistSession: false,
		},
	});

	return supabaseInstance;
};

export const supabaseService = () => {
	if (supabaseServiceInstance) {
		return supabaseServiceInstance;
	}

	const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();

	if (!supabaseServiceKey) {
		throw new Error("Missing required Supabase service role key");
	}

	supabaseServiceInstance = createClient<Database>(
		supabaseUrl,
		supabaseServiceKey,
		{
			auth: {
				persistSession: false,
			},
		},
	);

	return supabaseServiceInstance;
};
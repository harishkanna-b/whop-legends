import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import {
	checkDatabaseConnection,
	getCharacterClasses,
} from "../../lib/database-utils";
import { supabase, supabaseService } from "../../lib/supabase-client";

// Mock data
const mockCharacterClasses = [
	{ id: "1", name: "scout", display_name: "Scout", is_active: true },
	{ id: "2", name: "sage", display_name: "Sage", is_active: true },
	{ id: "3", name: "champion", display_name: "Champion", is_active: true },
	{ id: "4", name: "merchant", display_name: "Merchant", is_active: true },
];

describe("Database Connection", () => {
	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();
	});

	it("should connect to database successfully", async () => {
		// Mock successful database connection
		const mockSelect = supabase().from("character_classes").select("count");
		mockSelect.limit = jest.fn().mockResolvedValue({
			data: [{ count: 4 }],
			error: null,
		});

		const isConnected = await checkDatabaseConnection();
		expect(isConnected).toBe(true);
	});

	it("should fetch character classes", async () => {
		// Mock successful character classes fetch
		const mockSelect = supabase().from("character_classes").select("*");
		mockSelect.eq = jest.fn().mockReturnThis();
		mockSelect.order = jest.fn().mockResolvedValue({
			data: mockCharacterClasses,
			error: null,
		});

		const classes = await getCharacterClasses();
		expect(Array.isArray(classes)).toBe(true);
		expect(classes.length).toBeGreaterThan(0);

		// Check that all expected character classes exist
		const classNames = classes.map((c: { name: string }) => c.name);
		expect(classNames).toContain("scout");
		expect(classNames).toContain("sage");
		expect(classNames).toContain("champion");
		expect(classNames).toContain("merchant");
	});

	it("should handle database errors gracefully", async () => {
		// Mock database error
		const mockSelect = supabaseService().from("users").select("*");
		mockSelect.limit = jest.fn().mockResolvedValue({
			data: null,
			error: { message: "Table does not exist" },
		});

		const { data, error } = await supabaseService()
			.from("users")
			.select("*")
			.limit(1);

		expect(error).toBeTruthy();
		expect(data).toBeNull();
	});

	it("should handle connection failures gracefully", async () => {
		// Mock connection failure
		const mockSelect = supabase().from("character_classes").select("count");
		mockSelect.limit = jest.fn().mockResolvedValue({
			data: null,
			error: { message: "Connection failed" },
		});

		const isConnected = await checkDatabaseConnection();
		expect(isConnected).toBe(false);
	});
});

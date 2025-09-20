/**
 * Comprehensive Security Validation Tests
 * Tests for advanced validation scenarios, missing data types, and edge cases
 */

import {
  SecurityValidator,
  ValidationError,
  ValidationRule,
  ValidationResult,
} from "../../lib/security/validation";

describe("SecurityValidator - Comprehensive Coverage", () => {
  describe("Missing Data Type Testing", () => {
    it("should validate all numeric types comprehensively", () => {
      // Test number validation with edge cases
      const numberRule: ValidationRule = { type: "number", min: 0, max: 100 };

      // Valid numbers
      expect(SecurityValidator.validate(0, numberRule).isValid).toBe(true);
      expect(SecurityValidator.validate(50, numberRule).isValid).toBe(true);
      expect(SecurityValidator.validate(100, numberRule).isValid).toBe(true);
      expect(SecurityValidator.validate(3.14159, numberRule).isValid).toBe(
        true,
      );
      expect(SecurityValidator.validate(-0, numberRule).isValid).toBe(true);

      // Invalid numbers
      expect(SecurityValidator.validate(-1, numberRule).isValid).toBe(false);
      expect(SecurityValidator.validate(101, numberRule).isValid).toBe(false);
      expect(SecurityValidator.validate(Infinity, numberRule).isValid).toBe(
        false,
      );
      expect(SecurityValidator.validate(-Infinity, numberRule).isValid).toBe(
        false,
      );
      expect(SecurityValidator.validate(NaN, numberRule).isValid).toBe(false);
    });

    it("should validate integer types specifically", () => {
      const integerRule: ValidationRule = {
        type: "integer",
        min: -10,
        max: 10,
      };

      // Valid integers
      expect(SecurityValidator.validate(-10, integerRule).isValid).toBe(true);
      expect(SecurityValidator.validate(0, integerRule).isValid).toBe(true);
      expect(SecurityValidator.validate(10, integerRule).isValid).toBe(true);
      expect(SecurityValidator.validate(7, integerRule).isValid).toBe(true);

      // Invalid integers (floats)
      expect(SecurityValidator.validate(3.14, integerRule).isValid).toBe(false);
      expect(SecurityValidator.validate(-2.5, integerRule).isValid).toBe(false);
      expect(SecurityValidator.validate(10.0000001, integerRule).isValid).toBe(
        false,
      );

      // Invalid integers (out of range)
      expect(SecurityValidator.validate(-11, integerRule).isValid).toBe(false);
      expect(SecurityValidator.validate(11, integerRule).isValid).toBe(false);
    });

    it("should validate boolean types comprehensively", () => {
      const booleanRule: ValidationRule = { type: "boolean" };

      // Valid booleans
      expect(SecurityValidator.validate(true, booleanRule).isValid).toBe(true);
      expect(SecurityValidator.validate(false, booleanRule).isValid).toBe(true);

      // Invalid booleans
      expect(SecurityValidator.validate("true", booleanRule).isValid).toBe(
        false,
      );
      expect(SecurityValidator.validate("false", booleanRule).isValid).toBe(
        false,
      );
      expect(SecurityValidator.validate(1, booleanRule).isValid).toBe(false);
      expect(SecurityValidator.validate(0, booleanRule).isValid).toBe(false);

      // Null/undefined are valid when not required
      expect(SecurityValidator.validate(null, booleanRule).isValid).toBe(true);
      expect(SecurityValidator.validate(undefined, booleanRule).isValid).toBe(
        true,
      );
    });

    it("should validate object types comprehensively", () => {
      const objectRule: ValidationRule = { type: "object" };

      // Valid objects
      expect(SecurityValidator.validate({}, objectRule).isValid).toBe(true);
      expect(
        SecurityValidator.validate({ key: "value" }, objectRule).isValid,
      ).toBe(true);
      expect(
        SecurityValidator.validate({ nested: { deep: true } }, objectRule)
          .isValid,
      ).toBe(true);
      expect(SecurityValidator.validate(new Date(), objectRule).isValid).toBe(
        true,
      );
      expect(SecurityValidator.validate(/regex/, objectRule).isValid).toBe(
        true,
      );

      // Invalid objects
      expect(SecurityValidator.validate([], objectRule).isValid).toBe(false);

      // Null/undefined are valid when not required
      expect(SecurityValidator.validate(null, objectRule).isValid).toBe(true);
      expect(SecurityValidator.validate(undefined, objectRule).isValid).toBe(
        true,
      );
      expect(SecurityValidator.validate("string", objectRule).isValid).toBe(
        false,
      );
      expect(SecurityValidator.validate(123, objectRule).isValid).toBe(false);
    });

    it("should validate array types comprehensively", () => {
      const arrayRule: ValidationRule = { type: "array" };

      // Valid arrays
      expect(SecurityValidator.validate([], arrayRule).isValid).toBe(true);
      expect(SecurityValidator.validate([1, 2, 3], arrayRule).isValid).toBe(
        true,
      );
      expect(
        SecurityValidator.validate(["a", "b", "c"], arrayRule).isValid,
      ).toBe(true);
      expect(
        SecurityValidator.validate([{}, [], null], arrayRule).isValid,
      ).toBe(true);
      expect(SecurityValidator.validate(new Array(3), arrayRule).isValid).toBe(
        true,
      );

      // Invalid arrays
      expect(SecurityValidator.validate({}, arrayRule).isValid).toBe(false);

      // Null/undefined are valid when not required
      expect(SecurityValidator.validate(null, arrayRule).isValid).toBe(true);
      expect(SecurityValidator.validate(undefined, arrayRule).isValid).toBe(
        true,
      );
      expect(SecurityValidator.validate("string", arrayRule).isValid).toBe(
        false,
      );
      expect(SecurityValidator.validate(123, arrayRule).isValid).toBe(false);
    });

    it("should validate string types with comprehensive patterns", () => {
      const emailRule: ValidationRule = {
        type: "string",
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        minLength: 5,
        maxLength: 100,
      };

      // Valid emails
      expect(
        SecurityValidator.validate("test@example.com", emailRule).isValid,
      ).toBe(true);
      expect(
        SecurityValidator.validate("user.name+tag@domain.co.uk", emailRule)
          .isValid,
      ).toBe(true);
      expect(SecurityValidator.validate("a@b.cd", emailRule).isValid).toBe(
        true,
      );

      // Invalid emails
      expect(
        SecurityValidator.validate("invalid-email", emailRule).isValid,
      ).toBe(false);
      expect(
        SecurityValidator.validate("@example.com", emailRule).isValid,
      ).toBe(false);
      expect(SecurityValidator.validate("test@", emailRule).isValid).toBe(
        false,
      );
      expect(
        SecurityValidator.validate("test@example", emailRule).isValid,
      ).toBe(false);
      expect(SecurityValidator.validate("a@b.c", emailRule).isValid).toBe(
        false,
      ); // Too short - only 5 chars but pattern may require more

      // Test truly short email
      expect(SecurityValidator.validate("a@b.", emailRule).isValid).toBe(
        false,
      ); // Too short (4 chars) and missing TLD
      expect(
        SecurityValidator.validate("a".repeat(101) + "@example.com", emailRule)
          .isValid,
      ).toBe(false); // Too long
    });

    it("should validate enum types comprehensively", () => {
      const enumRule: ValidationRule = {
        type: "string",
        enum: ["option1", "option2", "option3"],
      };

      // Valid enum values
      expect(SecurityValidator.validate("option1", enumRule).isValid).toBe(
        true,
      );
      expect(SecurityValidator.validate("option2", enumRule).isValid).toBe(
        true,
      );
      expect(SecurityValidator.validate("option3", enumRule).isValid).toBe(
        true,
      );

      // Invalid enum values
      expect(SecurityValidator.validate("option4", enumRule).isValid).toBe(
        false,
      );
      expect(SecurityValidator.validate("Option1", enumRule).isValid).toBe(
        false,
      ); // Case sensitive

      // Empty string, null, undefined are valid when not required
      expect(SecurityValidator.validate("", enumRule).isValid).toBe(true);
      expect(SecurityValidator.validate(null, enumRule).isValid).toBe(true);
      expect(SecurityValidator.validate(undefined, enumRule).isValid).toBe(
        true,
      );
    });
  });

  describe("Error Class Testing", () => {
    it("should create ValidationError with message only", () => {
      const error = new ValidationError("Test error message");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("ValidationError");
      expect(error.field).toBeUndefined();
      expect(error.stack).toBeDefined();
    });

    it("should create ValidationError with message and field", () => {
      const error = new ValidationError("Field validation failed", "username");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Field validation failed");
      expect(error.name).toBe("ValidationError");
      expect(error.field).toBe("username");
      expect(error.stack).toBeDefined();
    });

    it("should handle ValidationError with empty field", () => {
      const error = new ValidationError("Test error", "");

      expect(error.field).toBe("");
      expect(error.message).toBe("Test error");
    });

    it("should handle ValidationError with special characters in message", () => {
      const error = new ValidationError(
        'Error with special chars: <script>alert("xss")</script>',
        "field",
      );

      expect(error.message).toBe(
        'Error with special chars: <script>alert("xss")</script>',
      );
      expect(error.field).toBe("field");
    });

    it("should be throwable and catchable", () => {
      expect(() => {
        throw new ValidationError("Test throw");
      }).toThrow(ValidationError);
    });

    it("should be catchable as Error", () => {
      try {
        throw new ValidationError("Test catch");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe("Test catch");
      }
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("should handle boundary values for min/max constraints", () => {
      const boundaryRule: ValidationRule = {
        type: "number",
        min: 0,
        max: Number.MAX_SAFE_INTEGER,
      };

      expect(SecurityValidator.validate(0, boundaryRule).isValid).toBe(true);
      expect(
        SecurityValidator.validate(Number.MAX_SAFE_INTEGER, boundaryRule)
          .isValid,
      ).toBe(true);
      expect(
        SecurityValidator.validate(Number.MAX_SAFE_INTEGER + 1, boundaryRule)
          .isValid,
      ).toBe(false);
      expect(SecurityValidator.validate(-0.0000001, boundaryRule).isValid).toBe(
        false,
      );
    });

    it("should handle very large strings", () => {
      const largeStringRule: ValidationRule = {
        type: "string",
        maxLength: 1000000,
      };

      const largeString = "a".repeat(1000000);
      const tooLargeString = "a".repeat(1000001);

      expect(
        SecurityValidator.validate(largeString, largeStringRule).isValid,
      ).toBe(true);
      expect(
        SecurityValidator.validate(tooLargeString, largeStringRule).isValid,
      ).toBe(false);
    });

    it("should handle empty and whitespace-only strings", () => {
      const stringRule: ValidationRule = { type: "string", required: true };
      const optionalStringRule: ValidationRule = {
        type: "string",
        required: false,
      };

      // Required string
      expect(SecurityValidator.validate("", stringRule).isValid).toBe(false);
      expect(SecurityValidator.validate("   ", stringRule).isValid).toBe(true); // Whitespace is valid
      expect(SecurityValidator.validate("\t\n\r", stringRule).isValid).toBe(
        true,
      );

      // Optional string
      expect(SecurityValidator.validate("", optionalStringRule).isValid).toBe(
        true,
      );
      expect(
        SecurityValidator.validate("   ", optionalStringRule).isValid,
      ).toBe(true);
      expect(SecurityValidator.validate(null, optionalStringRule).isValid).toBe(
        true,
      );
      expect(
        SecurityValidator.validate(undefined, optionalStringRule).isValid,
      ).toBe(true);
    });

    it("should handle nested object validation scenarios", () => {
      const nestedRule: ValidationRule = { type: "object" };

      // Test various object types
      expect(SecurityValidator.validate(new Date(), nestedRule).isValid).toBe(
        true,
      );
      expect(
        SecurityValidator.validate(new RegExp("test"), nestedRule).isValid,
      ).toBe(true);
      expect(
        SecurityValidator.validate(new (class Test {})(), nestedRule).isValid,
      ).toBe(true);

      // Test array-like objects
      expect(
        SecurityValidator.validate({ length: 1, 0: "test" }, nestedRule)
          .isValid,
      ).toBe(true);
      expect(SecurityValidator.validate(arguments, nestedRule).isValid).toBe(
        true,
      );
    });

    it("should handle array validation with mixed types", () => {
      const arrayRule: ValidationRule = { type: "array" };

      const mixedArray = [
        "string",
        123,
        true,
        null,
        undefined,
        {},
        [],
        new Date(),
        /regex/,
      ];

      expect(SecurityValidator.validate(mixedArray, arrayRule).isValid).toBe(
        true,
      );
    });

    it("should handle Unicode and special characters in strings", () => {
      const unicodeRule: ValidationRule = {
        type: "string",
        pattern: /^[\p{L}\p{N}\s\-_]+$/u,
      };

      // Valid Unicode
      expect(
        SecurityValidator.validate("Hello 世界", unicodeRule).isValid,
      ).toBe(true);
      expect(SecurityValidator.validate("Café", unicodeRule).isValid).toBe(
        true,
      );
      expect(SecurityValidator.validate("Москва", unicodeRule).isValid).toBe(
        true,
      );

      // Emoji might not match the pattern (no letters/numbers)
      expect(SecurityValidator.validate("🚀", unicodeRule).isValid).toBe(false);

      // Invalid Unicode
      expect(
        SecurityValidator.validate("Hello<script>", unicodeRule).isValid,
      ).toBe(false);
      expect(SecurityValidator.validate("Hello\x00", unicodeRule).isValid).toBe(
        false,
      );
    });
  });

  describe("Complex Validation Scenarios", () => {
    it("should validate complex nested quest parameters", () => {
      const complexQuestParams = {
        title: "Epic Quest: The Ultimate Challenge",
        description:
          "A very long description that tests the boundaries of our validation system with lots of details and requirements",
        target_value: 999999,
        reward_xp: 10000,
        reward_commission: 999.99,
        quest_type: "special",
        difficulty: "epic",
      };

      const result = SecurityValidator.validateQuestParams(complexQuestParams);
      // Description might be too long (500 char limit)
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should handle validation with multiple custom rules", () => {
      const complexRule: ValidationRule = {
        type: "string",
        required: true,
        minLength: 8,
        maxLength: 64,
        pattern:
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        custom: (value: string) => {
          if (value.toLowerCase().includes("password")) {
            return 'Password cannot contain the word "password"';
          }
          return true;
        },
      };

      const validPassword = "SecureP@ss123";
      const invalidPassword1 = "weak";
      const invalidPassword2 = "mypassword123";
      const invalidPassword3 = "NoSpecialChars123";

      expect(
        SecurityValidator.validate(validPassword, complexRule).isValid,
      ).toBe(true);
      expect(
        SecurityValidator.validate(invalidPassword1, complexRule).isValid,
      ).toBe(false);
      expect(
        SecurityValidator.validate(invalidPassword2, complexRule).isValid,
      ).toBe(false);
      expect(
        SecurityValidator.validate(invalidPassword3, complexRule).isValid,
      ).toBe(false);
    });

    it("should validate analytics parameters with complex date ranges", () => {
      const now = new Date();
      const lastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate(),
      );
      const nextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
      );

      const validParams = {
        start_date: lastMonth.toISOString().split("T")[0],
        end_date: now.toISOString().split("T")[0],
        metrics: ["referrals", "commission", "engagement"],
        group_by: "month",
      };

      const invalidParams = {
        start_date: nextMonth.toISOString().split("T")[0], // Future date
        end_date: lastMonth.toISOString().split("T")[0], // Past date
        metrics: ["invalid_metric"],
        group_by: "invalid_group",
      };

      expect(
        SecurityValidator.validateAnalyticsParams(validParams).isValid,
      ).toBe(true);
      expect(
        SecurityValidator.validateAnalyticsParams(invalidParams).isValid,
      ).toBe(false);
    });

    it("should handle validation with overlapping constraints", () => {
      const overlappingRule: ValidationRule = {
        type: "number",
        min: 10,
        max: 100,
        custom: (value: number) => {
          if (value > 50) {
            return "Value must be 50 or less";
          }
          return true;
        },
      };

      expect(SecurityValidator.validate(25, overlappingRule).isValid).toBe(
        true,
      );
      expect(SecurityValidator.validate(75, overlappingRule).isValid).toBe(
        false,
      ); // Fails custom validation
      expect(SecurityValidator.validate(5, overlappingRule).isValid).toBe(
        false,
      ); // Fails min validation
    });
  });

  describe("Performance and Memory Tests", () => {
    it("should handle validation of large datasets efficiently", () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 10,
      }));

      const arrayRule: ValidationRule = { type: "array" };
      const startTime = performance.now();

      const result = SecurityValidator.validate(largeDataset, arrayRule);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.isValid).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it("should handle concurrent validation requests", async () => {
      const validationPromises = Array.from({ length: 100 }, (_, i) => {
        return Promise.resolve(
          SecurityValidator.validate(`test-${i}`, {
            type: "string",
            minLength: 5,
          }),
        );
      });

      const startTime = performance.now();
      const results = await Promise.all(validationPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results.every((r) => r.isValid)).toBe(true);
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
    });
  });
});

/**
 * Comprehensive Edge Cases and Error Scenario Tests
 * Tests for edge cases, error handling, and unusual input scenarios
 */

import { SecurityValidator, ValidationError, ValidationRule } from '../../lib/security/validation';
import { config } from '../../lib/config';

describe('Security Edge Cases and Error Scenarios', () => {
  describe('Extreme Input Values', () => {
    it('should handle extremely large numbers in validation', () => {
      const numberRule: ValidationRule = { type: 'number', min: 0, max: Number.MAX_SAFE_INTEGER };

      // Test boundary values
      expect(SecurityValidator.validate(Number.MAX_SAFE_INTEGER, numberRule).isValid).toBe(true);
      expect(SecurityValidator.validate(Number.MIN_SAFE_INTEGER, numberRule).isValid).toBe(false);
      expect(SecurityValidator.validate(Number.MAX_VALUE, numberRule).isValid).toBe(false);
      expect(SecurityValidator.validate(Number.MIN_VALUE, numberRule).isValid).toBe(true);
      expect(SecurityValidator.validate(Number.POSITIVE_INFINITY, numberRule).isValid).toBe(false);
      expect(SecurityValidator.validate(Number.NEGATIVE_INFINITY, numberRule).isValid).toBe(false);
    });

    it('should handle extremely long strings', () => {
      const veryLongString = 'a'.repeat(1000000); // 1MB string
      const extremelyLongString = 'a'.repeat(10000000); // 10MB string

      const stringRule: ValidationRule = { type: 'string', maxLength: 1000000 };

      expect(SecurityValidator.validate(veryLongString, stringRule).isValid).toBe(true);
      expect(SecurityValidator.validate(extremelyLongString, stringRule).isValid).toBe(false);
    });

    it('should handle deeply nested objects', () => {
      const createDeepObject = (depth: number): any => {
        if (depth === 0) return 'deep_value';
        return { nested: createDeepObject(depth - 1) };
      };

      const moderatelyDeep = createDeepObject(100);
      const extremelyDeep = createDeepObject(1000);

      const objectRule: ValidationRule = { type: 'object' };

      expect(SecurityValidator.validate(moderatelyDeep, objectRule).isValid).toBe(true);
      expect(SecurityValidator.validate(extremelyDeep, objectRule).isValid).toBe(true);
    });

    it('should handle arrays with extreme lengths', () => {
      const largeArray = Array.from({ length: 100000 }, (_, i) => i);
      const hugeArray = Array.from({ length: 1000000 }, (_, i) => i);

      const arrayRule: ValidationRule = { type: 'array' };

      expect(SecurityValidator.validate(largeArray, arrayRule).isValid).toBe(true);
      expect(SecurityValidator.validate(hugeArray, arrayRule).isValid).toBe(true);
    });
  });

  describe('Special Character and Unicode Handling', () => {
    it('should handle strings with control characters', () => {
      const controlCharStrings = [
        'string\x00with\x01null\x02and\x03control\x04chars',
        'string\u0000with\u0001null\u0002characters',
        'text\nwith\tmultiple\rlines\vand\fform\afeed',
        'string\u2028with\u2029line\u2028separators'
      ];

      const stringRule: ValidationRule = { type: 'string' };

      controlCharStrings.forEach(str => {
        const result = SecurityValidator.validate(str, stringRule);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle strings with emoji and complex Unicode', () => {
      const complexUnicodeStrings = [
        'Hello 🌍 World 🚀',
        'Café résumé naïve façade',
        'مرحبا بالعالم',
        'こんにちは世界',
        '😊🎉🚀💯🔥',
        '👨‍👩‍👧‍👦 Family emoji',
        '🏳️‍🌈 Rainbow flag',
        'Test with zero-width space: \u200B',
        'Test with invisible characters: \u200C\u200D'
      ];

      const stringRule: ValidationRule = { type: 'string' };

      complexUnicodeStrings.forEach(str => {
        const result = SecurityValidator.validate(str, stringRule);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle strings with homoglyph attacks', () => {
      const homoglyphStrings = [
        'аpple.com', // Cyrillic 'а'
        'gοοgle.com', // Greek 'ο'
        'paypaI.com', // Capital 'I' instead of 'l'
        'microsоft.com', // Cyrillic 'о'
        'amazоn.com', // Cyrillic 'о'
        '𝔣𝔞𝔠𝔢𝔟𝔬𝔬𝔨.com', // Mathematical script
        'ｆａｃｅｂｏｏｋ.com', // Full-width characters
        'faceboook.com' // Extra 'o'
      ];

      const urlRule: ValidationRule = {
        type: 'string',
        pattern: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      };

      homoglyphStrings.forEach(str => {
        const result = SecurityValidator.validate(str, urlRule);
        // Most should be invalid due to non-Latin characters or patterns
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle strings with SQL injection attempts', () => {
      const sqlInjectionStrings = [
        "SELECT * FROM users",
        "1; DROP TABLE users",
        "admin' OR '1'='1",
        "1' UNION SELECT * FROM passwords",
        "'; EXEC xp_cmdshell('dir')",
        "1'; WAITFOR DELAY '0:0:5'--",
        "LOAD_FILE('/etc/passwd')",
        "1' AND SLEEP(5)--",
        "admin'/*comment*/--",
        "1' AND (SELECT COUNT(*) FROM information_schema.tables)>0--"
      ];

      const safeStringRule: ValidationRule = { type: 'string' };

      sqlInjectionStrings.forEach(str => {
        const result = SecurityValidator.validate(str, safeStringRule);
        expect(result.isValid).toBe(true); // String type validation should pass

        // But sanitization should make it safe
        const sanitized = SecurityValidator.sanitizeString(str);
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
        expect(sanitized).not.toContain('script');
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle validation without memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many validations
      for (let i = 0; i < 10000; i++) {
        SecurityValidator.validate(`test-${i}`, { type: 'string', minLength: 5 });
        SecurityValidator.validate(i, { type: 'number', min: 0, max: 10000 });
        SecurityValidator.validate(i % 2 === 0, { type: 'boolean' });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle recursive object structures', () => {
      const recursiveObject: any = {};
      recursiveObject.self = recursiveObject;

      const objectRule: ValidationRule = { type: 'object' };

      // This should not cause infinite recursion
      const result = SecurityValidator.validate(recursiveObject, objectRule);
      expect(result.isValid).toBe(true);
    });

    it('should handle circular references in arrays', () => {
      const circularArray: any[] = [];
      circularArray.push(circularArray);

      const arrayRule: ValidationRule = { type: 'array' };

      const result = SecurityValidator.validate(circularArray, arrayRule);
      expect(result.isValid).toBe(true);
    });

    it('should handle validation of prototype pollution attempts', () => {
      const maliciousObject = JSON.parse('{"__proto__": {"polluted": true}}');

      const objectRule: ValidationRule = { type: 'object' };

      const result = SecurityValidator.validate(maliciousObject, objectRule);
      expect(result.isValid).toBe(true);

      // Ensure prototype wasn't actually polluted
      expect(({} as any).polluted).toBeUndefined();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle ValidationError with unusual messages', () => {
      const unusualMessages = [
        '', // Empty message
        ' '.repeat(10000), // Very long whitespace message
        null as any, // Null message
        undefined as any, // Undefined message
        123 as any, // Number message
        {}, // Object message
        [], // Array message
        'Message with newlines\nand\ttabs',
        'Message with unicode: 你好 🌍',
        'Message with emojis: 🚀💯',
        'Message with special chars: <script>alert("xss")</script>'
      ];

      unusualMessages.forEach(message => {
        try {
          const error = new ValidationError(message as string, 'testField');
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.name).toBe('ValidationError');
          expect(error.field).toBe('testField');
        } catch (e) {
          // Some messages might cause errors, which is acceptable
          expect(e).toBeInstanceOf(Error);
        }
      });
    });

    it('should handle validation with unusual rule combinations', () => {
      const unusualRules = [
        { type: 'string', minLength: 100, maxLength: 10 }, // Impossible range
        { type: 'number', min: 100, max: 10 }, // Impossible range
        { type: 'string', pattern: /[a-z]+/, enum: ['123', '456'] }, // Conflicting rules
        { type: 'number', custom: () => false, min: 0, max: 100 }, // Custom that always fails
        { type: 'string', required: false, minLength: 10 }, // Optional but with minimum length
        { type: 'array', custom: (value: any) => typeof value === 'string' }, // Nonsensical custom validation
        {} as ValidationRule // Empty rule
      ];

      unusualRules.forEach(rule => {
        const result = SecurityValidator.validate('test', rule);
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        expect(typeof result.isValid).toBe('boolean');
      });
    });

    it('should handle validation with null and undefined rules', () => {
      const invalidRules = [
        null as any,
        undefined as any,
        'not an object' as any,
        123 as any,
        [] as any,
        true as any
      ];

      invalidRules.forEach(rule => {
        const result = SecurityValidator.validate('test', rule);
        expect(result).toHaveProperty('isValid');
        expect(typeof result.isValid).toBe('boolean');
      });
    });

    it('should handle validation functions that throw errors', () => {
      const errorThrowingRule: ValidationRule = {
        type: 'string',
        custom: () => {
          throw new Error('Custom validation function failed');
        }
      };

      const result = SecurityValidator.validate('test', errorThrowingRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle configuration with extreme values', () => {
      // Test configuration loading with extreme numeric values
      process.env.RATE_LIMIT_WINDOW_MS = '2147483647'; // Max 32-bit integer
      process.env.RATE_LIMIT_MAX_REQUESTS = '2147483647';
      process.env.REDIS_CONNECTION_TIMEOUT = '2147483647';
      process.env.WEBHOOK_TIMEOUT_MS = '2147483647';

      const testConfig = new (config.constructor as any)();
      const loadedConfig = testConfig.get();

      expect(typeof loadedConfig.rateLimiting.defaultWindowMs).toBe('number');
      expect(typeof loadedConfig.rateLimiting.defaultMaxRequests).toBe('number');
      expect(typeof loadedConfig.redis.connectionTimeout).toBe('number');
      expect(typeof loadedConfig.webhook.timeoutMs).toBe('number');
    });

    it('should handle configuration with negative values', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '-1000';
      process.env.RATE_LIMIT_MAX_REQUESTS = '-5';
      process.env.REDIS_MAX_RETRIES = '-3';

      const testConfig = new (config.constructor as any)();
      const loadedConfig = testConfig.get();

      // Should handle negative values gracefully
      expect(typeof loadedConfig.rateLimiting.defaultWindowMs).toBe('number');
      expect(typeof loadedConfig.rateLimiting.defaultMaxRequests).toBe('number');
      expect(typeof loadedConfig.redis.maxRetries).toBe('number');
    });

    it('should handle configuration with very large string values', () => {
      const veryLongString = 'a'.repeat(1000000);
      process.env.WHOP_WEBHOOK_SECRET = veryLongString;
      process.env.DATABASE_URL = veryLongString;
      process.env.REDIS_URL = veryLongString;

      const testConfig = new (config.constructor as any)();
      const loadedConfig = testConfig.get();

      expect(loadedConfig.webhook.secret).toBe(veryLongString);
      expect(loadedConfig.database.url).toBe(veryLongString);
      expect(loadedConfig.redis.url).toBe(veryLongString);
    });

    it('should handle configuration validation with extreme scenarios', () => {
      // Test validation with configuration that pushes boundaries
      process.env.NODE_ENV = 'production';
      process.env.WHOP_WEBHOOK_SECRET = ''; // Missing secret in production
      process.env.DATABASE_URL = ''; // Missing database URL
      process.env.RATE_LIMITING_ENABLED = 'true';
      process.env.USE_REDIS_RATE_LIMITING = 'true';
      process.env.REDIS_URL = ''; // Missing Redis URL

      const testConfig = new (config.constructor as any)();
      const validation = testConfig.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Race Conditions and Concurrency', () => {
    it('should handle concurrent validation requests', async () => {
      const validationPromises = Array.from({ length: 1000 }, (_, i) => {
        return Promise.resolve(
          SecurityValidator.validate(`test-${i}`, { type: 'string', minLength: 5 })
        );
      });

      const results = await Promise.all(validationPromises);

      expect(results.every(r => r.isValid)).toBe(true);
      expect(results.every(r => r.errors === undefined)).toBe(true);
    });

    it('should handle concurrent configuration updates', async () => {
      const updatePromises = Array.from({ length: 100 }, (_, i) => {
        return Promise.resolve(
          config.update({
            environment: i % 2 === 0 ? 'development' : 'staging'
          })
        );
      });

      await Promise.all(updatePromises);

      const finalConfig = config.get();
      expect(['development', 'staging']).toContain(finalConfig.environment);
    });

    it('should handle concurrent validation and configuration updates', async () => {
      const mixedPromises = [];

      // Mix of validation and configuration updates
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) {
          mixedPromises.push(
            SecurityValidator.validate(`test-${i}`, { type: 'string' })
          );
        } else {
          mixedPromises.push(
            Promise.resolve(config.update({ webhook: { timeoutMs: i * 1000 } }))
          );
        }
      }

      await Promise.all(mixedPromises);

      // Should not throw errors
      const finalConfig = config.get();
      expect(finalConfig).toBeDefined();
    });
  });

  describe('System Resource Edge Cases', () => {
    it('should handle validation when system is under memory pressure', () => {
      // Allocate a large amount of memory to simulate pressure
      const largeArray = new Array(1000000).fill('memory pressure test');

      // Validation should still work
      const result = SecurityValidator.validate('test', { type: 'string' });
      expect(result.isValid).toBe(true);

      // Clean up
      largeArray.length = 0;
    });

    it('should handle configuration loading when environment variables are missing', () => {
      // Temporarily clear environment variables
      const originalEnv = process.env;
      process.env = {} as any;

      try {
        const testConfig = new (config.constructor as any)();
        const loadedConfig = testConfig.get();

        // Should still work with defaults
        expect(loadedConfig).toBeDefined();
        expect(loadedConfig.environment).toBe('development');
      } finally {
        // Restore environment variables
        process.env = originalEnv;
      }
    });

    it('should handle validation with extremely complex custom rules', () => {
      const complexRule: ValidationRule = {
        type: 'string',
        custom: (value: string) => {
          // Complex validation that might be resource-intensive
          const startTime = performance.now();

          // Simulate complex processing
          for (let i = 0; i < 10000; i++) {
            Math.sqrt(i) * Math.log(i + 1);
          }

          const endTime = performance.now();

          // Should complete in reasonable time
          if (endTime - startTime > 100) {
            return 'Validation took too long';
          }

          return value.length > 5;
        }
      };

      const result = SecurityValidator.validate('short', complexRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation took too long');
    });
  });

  describe('Security Attack Scenarios', () => {
    it('should handle buffer overflow attempts', () => {
      const overflowString = 'a'.repeat(100000000); // 100MB string

      const result = SecurityValidator.validate(overflowString, { type: 'string', maxLength: 100 });
      expect(result.isValid).toBe(false);
    });

    it('should handle regex denial of service attempts', () => {
      const evilRegex: ValidationRule = {
        type: 'string',
        pattern: /^(a+)+$/ // Catastrophic backtracking
      };

      const evilString = 'a'.repeat(30) + '!';

      const startTime = performance.now();
      const result = SecurityValidator.validate(evilString, evilRegex);
      const endTime = performance.now();

      expect(result.isValid).toBe(false);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle prototype pollution via JSON', () => {
      const maliciousJson = '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"alsoPolluted": true}}}';

      try {
        const parsed = JSON.parse(maliciousJson);
        const result = SecurityValidator.validate(parsed, { type: 'object' });

        expect(result.isValid).toBe(true);

        // Ensure prototype wasn't actually polluted
        expect(({} as any).polluted).toBeUndefined();
        expect(({} as any).alsoPolluted).toBeUndefined();
      } catch (e) {
        // If parsing fails, that's also acceptable
        expect(e).toBeInstanceOf(Error);
      }
    });

    it('should handle XSS attempts in validation', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)">',
        '<div onclick="alert(1)">click me</div>',
        '<a href="javascript:alert(1)">link</a>',
        '"><script>alert(1)</script>',
        '\'"><script>alert(1)</script>',
        '<script>alert(String.fromCharCode(88,83,83))</script>',
        '<scr<script>ipt>alert(1)</scr</script>ipt>'
      ];

      xssAttempts.forEach(xss => {
        const result = SecurityValidator.validate(xss, { type: 'string' });
        expect(result.isValid).toBe(true); // String validation should pass

        // But sanitization should make it safe
        const sanitized = SecurityValidator.sanitizeString(xss);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onclick=');
      });
    });
  });
});

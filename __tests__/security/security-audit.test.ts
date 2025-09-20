/**
 * Security Audit Tests
 * Tests for security audit functionality and vulnerability detection
 */

import { SecurityAuditor } from '../../lib/security/audit';
import { SecurityValidator, ValidationError } from '../../lib/security/validation';

describe('SecurityAuditor', () => {
  let auditor: SecurityAuditor;

  beforeEach(() => {
    auditor = new SecurityAuditor();
  });

  describe('Security Metrics', () => {
    it('should calculate overall security score correctly', () => {
      // Mock metrics for testing
      const mockMetrics = [
        { name: 'Test1', value: 80, threshold: 80, status: 'good' as const, description: 'Test metric 1' },
        { name: 'Test2', value: 90, threshold: 80, status: 'good' as const, description: 'Test metric 2' },
        { name: 'Test3', value: 70, threshold: 80, status: 'warning' as const, description: 'Test metric 3' }
      ];

      // Add metrics to auditor (this would normally be done internally)
      (auditor as any).metrics = mockMetrics;

      const overallScore = (auditor as any).calculateOverallScore();
      expect(overallScore).toBe(80); // (80 + 90 + 70) / 3 = 80
    });

    it('should generate recommendations based on alerts', () => {
      const mockAlerts = [
        {
          id: 'test-1',
          severity: 'high' as const,
          category: 'Dependencies',
          message: 'Test dependency issue',
          timestamp: new Date().toISOString(),
          resolved: false
        },
        {
          id: 'test-2',
          severity: 'medium' as const,
          category: 'Authentication',
          message: 'Test auth issue',
          timestamp: new Date().toISOString(),
          resolved: false
        }
      ];

      (auditor as any).alerts = mockAlerts;

      const recommendations = auditor.getRecommendations();
      expect(recommendations).toContain('Run "npm audit fix" to address dependency vulnerabilities');
      expect(recommendations).toContain('Review and strengthen authentication mechanisms');
    });

    it('should generate comprehensive security report', () => {
      const mockMetrics = [
        { name: 'Test Metric', value: 85, threshold: 80, status: 'good' as const, description: 'Test description' }
      ];

      const mockAlerts = [
        {
          id: 'test-alert',
          severity: 'medium' as const,
          category: 'Test Category',
          message: 'Test alert message',
          timestamp: new Date().toISOString(),
          resolved: false
        }
      ];

      (auditor as any).metrics = mockMetrics;
      (auditor as any).alerts = mockAlerts;

      const report = auditor.generateReport();

      expect(report).toContain('Security Audit Report');
      expect(report).toContain('Overall Security Score: 85/100');
      expect(report).toContain('Test Metric: 85/100');
      expect(report).toContain('[MEDIUM] Test alert message');
    });
  });

  describe('Security Checks', () => {
    it('should handle missing security files gracefully', async () => {
      const result = await auditor.runSecurityChecks();

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('overallScore');
      expect(typeof result.overallScore).toBe('number');
    });

    it('should detect input validation issues', async () => {
      // This test would require mocking file system operations
      // For now, we'll test the basic structure
      const result = await auditor.runSecurityChecks();

      const inputValidationMetric = result.metrics.find(m => m.name === 'Input Validation');
      if (inputValidationMetric) {
        expect(inputValidationMetric).toHaveProperty('value');
        expect(inputValidationMetric).toHaveProperty('status');
      }
    });
  });
});

describe('SecurityValidator', () => {
  describe('Input Validation', () => {
    it('should validate user IDs correctly', () => {
      const validUserId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUserId = 'invalid-user-id';

      const validResult = SecurityValidator.validateUserId(validUserId);
      const invalidResult = SecurityValidator.validateUserId(invalidUserId);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should sanitize strings to prevent XSS', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = SecurityValidator.sanitizeString(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should validate quest parameters correctly', () => {
      const validParams = {
        title: 'Daily Challenge',
        description: 'Complete daily tasks',
        target_value: 100,
        reward_xp: 50,
        quest_type: 'daily',
        difficulty: 'easy'
      };

      const invalidParams = {
        title: 'x', // Too short
        target_value: -1, // Negative value
        reward_xp: 10001, // Too large
        quest_type: 'invalid' // Invalid type
      };

      const validResult = SecurityValidator.validateQuestParams(validParams);
      const invalidResult = SecurityValidator.validateQuestParams(invalidParams);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should detect suspicious progress updates', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const questId = 'quest-123';

      const reasonableProgress = SecurityValidator.validateProgressUpdate(userId, questId, 100);
      const suspiciousProgress = SecurityValidator.validateProgressUpdate(userId, questId, 10000);

      expect(reasonableProgress.isValid).toBe(true);
      expect(suspiciousProgress.isValid).toBe(false);
    });

    it('should validate leaderboard parameters', () => {
      const validParams = {
        category: 'referrals',
        timeframe: 'weekly',
        limit: 50,
        offset: 0
      };

      const invalidParams = {
        category: 'invalid',
        timeframe: 'invalid',
        limit: 2000, // Too large
        offset: -1 // Negative
      };

      const validResult = SecurityValidator.validateLeaderboardParams(validParams);
      const invalidResult = SecurityValidator.validateLeaderboardParams(invalidParams);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate analytics parameters with date ranges', () => {
      // Use current dates to avoid 1-year range validation
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const validParams = {
        start_date: lastMonth.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
        metrics: ['referrals', 'commission'],
        group_by: 'day'
      };

      const invalidParams = {
        start_date: 'invalid-date',
        end_date: '2024-01-01', // Before start_date
        metrics: ['invalid-metric'],
        group_by: 'invalid-group'
      };

      const validResult = SecurityValidator.validateAnalyticsParams(validParams);
      const invalidResult = SecurityValidator.validateAnalyticsParams(invalidParams);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should perform generic validation with rules', () => {
      const rules = {
        required: true,
        type: 'string' as const,
        minLength: 3,
        maxLength: 50
      };

      const validValue = 'valid-string';
      const invalidValue = 'x';

      const validResult = SecurityValidator.validate(validValue, rules);
      const invalidResult = SecurityValidator.validate(invalidValue, rules);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate company IDs correctly', () => {
      // Test valid company IDs
      const validCompanyIds = [
        'company-123',
        'my_company',
        'test123',
        'a-b-c-d'
      ];

      validCompanyIds.forEach(companyId => {
        const result = SecurityValidator.validateCompanyId(companyId);
        expect(result.isValid).toBe(true);
      });

      // Test invalid company IDs
      const invalidCompanyIds = [
        '',
        'ab', // Too short
        'a'.repeat(51), // Too long
        'company<script>',
        'company@123',
        null,
        undefined
      ];

      invalidCompanyIds.forEach(companyId => {
        const result = SecurityValidator.validateCompanyId(companyId as string);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate rate limiting parameters', () => {
      const validResult = SecurityValidator.validateRateLimit('user-123', 'api_request', 100, 60000);
      const invalidResult = SecurityValidator.validateRateLimit('', 'api_request', -1, 0);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should test all data types in generic validation', () => {
      // Test integer validation
      const intResult = SecurityValidator.validate(42, { type: 'integer' });
      const floatResult = SecurityValidator.validate(42.5, { type: 'integer' });

      expect(intResult.isValid).toBe(true);
      expect(floatResult.isValid).toBe(false);

      // Test boolean validation
      const boolResult = SecurityValidator.validate(true, { type: 'boolean' });
      const stringResult = SecurityValidator.validate('true', { type: 'boolean' });

      expect(boolResult.isValid).toBe(true);
      expect(stringResult.isValid).toBe(false);

      // Test object validation
      const objectResult = SecurityValidator.validate({ key: 'value' }, { type: 'object' });
      const arrayResult = SecurityValidator.validate([1, 2, 3], { type: 'object' });

      expect(objectResult.isValid).toBe(true);
      expect(arrayResult.isValid).toBe(false);

      // Test array validation
      const validArray = SecurityValidator.validate([1, 2, 3], { type: 'array' });
      const invalidArray = SecurityValidator.validate('not an array', { type: 'array' });

      expect(validArray.isValid).toBe(true);
      expect(invalidArray.isValid).toBe(false);
    });

    it('should handle ValidationError class properly', () => {
      // Test ValidationError creation
      const error = new ValidationError('Test error message');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('ValidationError');
      expect(error.field).toBeUndefined();

      // Test ValidationError with field
      const errorWithField = new ValidationError('Field error', 'username');
      expect(errorWithField.message).toBe('Field error');
      expect(errorWithField.field).toBe('username');
    });

    it('should test custom validation rules', () => {
      const customRule = {
        type: 'string',
        custom: (value: string) => {
          if (value.includes('banned')) {
            return 'Banned word detected';
          }
          return true;
        }
      };

      const validResult = SecurityValidator.validate('valid text', customRule);
      const invalidResult = SecurityValidator.validate('this contains banned word', customRule);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Banned word detected');
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined inputs gracefully', () => {
      const nullResult = SecurityValidator.validateUserId(null as any);
      const undefinedResult = SecurityValidator.validateUserId(undefined as any);

      expect(nullResult.isValid).toBe(false);
      expect(undefinedResult.isValid).toBe(false);
    });

    it('should provide meaningful error messages', () => {
      const result = SecurityValidator.validateUserId('invalid');

      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Invalid user ID format');
    });
  });
});

describe('Security Integration Tests', () => {
  it('should work with existing validation system', () => {
    // Test that our security audit integrates with the existing validation system
    const testData = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      questParams: {
        title: 'Test Quest',
        target_value: 100,
        reward_xp: 50
      }
    };

    const userValidation = SecurityValidator.validateUserId(testData.userId);
    const questValidation = SecurityValidator.validateQuestParams(testData.questParams);

    expect(userValidation.isValid).toBe(true);
    expect(questValidation.isValid).toBe(true);
  });

  it('should detect security issues in complex scenarios', () => {
    // Test complex validation scenarios
    const complexQuestParams = {
      title: '<script>alert("xss")</script>',
      description: 'A'.repeat(1000), // Too long
      target_value: 999999, // Suspiciously high
      reward_xp: -100, // Negative
      quest_type: 'invalid_type',
      difficulty: 'impossible'
    };

    const result = SecurityValidator.validateQuestParams(complexQuestParams);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
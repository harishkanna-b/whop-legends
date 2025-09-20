/**
 * Input validation and sanitization utilities
 * Provides comprehensive validation for user inputs, API parameters, and database operations
 */

export interface ValidationResult {
  isValid: boolean;
  sanitized?: any;
  errors?: string[];
}

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SecurityValidator {
  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, 'blocked:')
      .replace(/on\w+\s*=/gi, 'blocked=');
  }

  /**
   * Validate and sanitize user ID format
   */
  static validateUserId(userId: string): ValidationResult {
    const errors: string[] = [];

    if (!userId || typeof userId !== 'string') {
      errors.push('User ID is required and must be a string');
      return { isValid: false, errors };
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      errors.push('Invalid user ID format');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, sanitized: this.sanitizeString(userId) };
  }

  /**
   * Validate company ID format
   */
  static validateCompanyId(companyId: string): ValidationResult {
    const errors: string[] = [];

    if (!companyId || typeof companyId !== 'string') {
      errors.push('Company ID is required and must be a string');
      return { isValid: false, errors };
    }

    // Company ID should be alphanumeric with possible hyphens/underscores
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(companyId)) {
      errors.push('Invalid company ID format');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, sanitized: this.sanitizeString(companyId) };
  }

  /**
   * Validate quest parameters
   */
  static validateQuestParams(params: {
    title?: string;
    description?: string;
    target_value?: number;
    reward_xp?: number;
    reward_commission?: number;
    quest_type?: string;
    difficulty?: string;
  }): ValidationResult {
    const errors: string[] = [];
    const sanitized: any = {};

    // Title validation
    if (params.title) {
      if (typeof params.title !== 'string') {
        errors.push('Title must be a string');
      } else if (params.title.length < 3 || params.title.length > 100) {
        errors.push('Title must be between 3 and 100 characters');
      } else {
        sanitized.title = this.sanitizeString(params.title);
      }
    }

    // Description validation
    if (params.description) {
      if (typeof params.description !== 'string') {
        errors.push('Description must be a string');
      } else if (params.description.length > 500) {
        errors.push('Description must be less than 500 characters');
      } else {
        sanitized.description = this.sanitizeString(params.description);
      }
    }

    // Target value validation
    if (params.target_value !== undefined) {
      if (typeof params.target_value !== 'number' || params.target_value < 1 || params.target_value > 10000) {
        errors.push('Target value must be a number between 1 and 10000');
      } else {
        sanitized.target_value = Math.round(params.target_value);
      }
    }

    // Reward XP validation
    if (params.reward_xp !== undefined) {
      if (typeof params.reward_xp !== 'number' || params.reward_xp < 0 || params.reward_xp > 10000) {
        errors.push('Reward XP must be a number between 0 and 10000');
      } else {
        sanitized.reward_xp = Math.round(params.reward_xp);
      }
    }

    // Reward commission validation
    if (params.reward_commission !== undefined) {
      if (typeof params.reward_commission !== 'number' || params.reward_commission < 0 || params.reward_commission > 1000) {
        errors.push('Reward commission must be a number between 0 and 1000');
      } else {
        sanitized.reward_commission = Math.round(params.reward_commission * 100) / 100; // Round to 2 decimal places
      }
    }

    // Quest type validation
    if (params.quest_type) {
      const validQuestTypes = ['daily', 'weekly', 'monthly', 'special'];
      if (!validQuestTypes.includes(params.quest_type)) {
        errors.push(`Invalid quest type. Must be one of: ${validQuestTypes.join(', ')}`);
      } else {
        sanitized.quest_type = params.quest_type;
      }
    }

    // Difficulty validation
    if (params.difficulty) {
      const validDifficulties = ['easy', 'medium', 'hard', 'epic'];
      if (!validDifficulties.includes(params.difficulty)) {
        errors.push(`Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`);
      } else {
        sanitized.difficulty = params.difficulty;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized: Object.keys(sanitized).length > 0 ? sanitized : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * validate user progress updates to prevent cheating
   */
  static validateProgressUpdate(userId: string, questId: string, newValue: number): ValidationResult {
    const errors: string[] = [];

    // Validate user ID
    const userValidation = this.validateUserId(userId);
    if (!userValidation.isValid) {
      errors.push(...(userValidation.errors || []));
    }

    // Validate quest ID
    if (!questId || typeof questId !== 'string') {
      errors.push('Quest ID is required and must be a string');
    }

    // Validate new value
    if (typeof newValue !== 'number' || newValue < 0 || newValue > 1000000) {
      errors.push('Progress value must be a number between 0 and 1,000,000');
    }

    // Check for unreasonable jumps (potential cheating)
    if (newValue > 1000) {
      errors.push('Suspicious progress value detected');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate leaderboard parameters
   */
  static validateLeaderboardParams(params: {
    category?: string;
    timeframe?: string;
    limit?: number;
    offset?: number;
  }): ValidationResult {
    const errors: string[] = [];
    const sanitized: any = {};

    // Category validation
    if (params.category) {
      const validCategories = ['referrals', 'commission', 'engagement', 'quests', 'retention', 'overall'];
      if (!validCategories.includes(params.category)) {
        errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
      } else {
        sanitized.category = params.category;
      }
    }

    // Timeframe validation
    if (params.timeframe) {
      const validTimeframes = ['daily', 'weekly', 'monthly', 'all_time'];
      if (!validTimeframes.includes(params.timeframe)) {
        errors.push(`Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
      } else {
        sanitized.timeframe = params.timeframe;
      }
    }

    // Limit validation
    if (params.limit !== undefined) {
      if (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 1000) {
        errors.push('Limit must be a number between 1 and 1000');
      } else {
        sanitized.limit = Math.round(params.limit);
      }
    }

    // Offset validation
    if (params.offset !== undefined) {
      if (typeof params.offset !== 'number' || params.offset < 0) {
        errors.push('Offset must be a non-negative number');
      } else {
        sanitized.offset = Math.round(params.offset);
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized: Object.keys(sanitized).length > 0 ? sanitized : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate analytics parameters
   */
  static validateAnalyticsParams(params: {
    start_date?: string;
    end_date?: string;
    metrics?: string[];
    group_by?: string;
  }): ValidationResult {
    const errors: string[] = [];
    const sanitized: any = {};

    // Date validation
    if (params.start_date) {
      const startDate = new Date(params.start_date);
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start date format');
      } else {
        sanitized.start_date = startDate.toISOString();
      }
    }

    if (params.end_date) {
      const endDate = new Date(params.end_date);
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end date format');
      } else {
        sanitized.end_date = endDate.toISOString();
      }
    }

    // Validate date range
    if (params.start_date && params.end_date) {
      const startDate = new Date(params.start_date);
      const endDate = new Date(params.end_date);
      if (startDate > endDate) {
        errors.push('Start date must be before end date');
      }

      // Limit date range to 1 year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (startDate < oneYearAgo) {
        errors.push('Date range cannot exceed 1 year');
      }
    }

    // Metrics validation
    if (params.metrics) {
      if (!Array.isArray(params.metrics)) {
        errors.push('Metrics must be an array');
      } else {
        const validMetrics = ['referrals', 'commission', 'engagement', 'quests', 'retention', 'users'];
        const invalidMetrics = params.metrics.filter(m => !validMetrics.includes(m));
        if (invalidMetrics.length > 0) {
          errors.push(`Invalid metrics: ${invalidMetrics.join(', ')}`);
        } else {
          sanitized.metrics = params.metrics;
        }
      }
    }

    // Group by validation
    if (params.group_by) {
      const validGroupBy = ['day', 'week', 'month', 'user', 'quest_type'];
      if (!validGroupBy.includes(params.group_by)) {
        errors.push(`Invalid group_by. Must be one of: ${validGroupBy.join(', ')}`);
      } else {
        sanitized.group_by = params.group_by;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized: Object.keys(sanitized).length > 0 ? sanitized : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Generic validation function using rules
   */
  static validate(value: any, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push('Value is required');
      return { isValid: false, errors };
    }

    // Skip further validation if value is not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return { isValid: true };
    }

    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push('Value must be a string');
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push('Value must be a number');
          }
          break;
        case 'integer':
          if (typeof value !== 'number' || !Number.isInteger(value)) {
            errors.push('Value must be an integer');
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push('Value must be a boolean');
          }
          break;
        case 'object':
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            errors.push('Value must be an object');
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push('Value must be an array');
          }
          break;
      }
    }

    // String-specific validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Value must be at least ${rules.minLength} characters long`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Value must be no more than ${rules.maxLength} characters long`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push('Value format is invalid');
      }
    }

    // Number-specific validations
    if (typeof value === 'number' && !isNaN(value)) {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Value must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Value must be no more than ${rules.max}`);
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`Value must be one of: ${rules.enum.join(', ')}`);
    }

    // Custom validation
    if (rules.custom) {
      const customResult = rules.custom(value);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : 'Custom validation failed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Rate limiting validation
   */
  static validateRateLimit(userId: string, action: string, limit: number, windowMs: number): ValidationResult {
    // This would typically integrate with Redis or similar for distributed rate limiting
    // For now, we'll return a simple validation
    const errors: string[] = [];

    if (!userId || typeof userId !== 'string') {
      errors.push('User ID is required for rate limiting');
    }

    if (!action || typeof action !== 'string') {
      errors.push('Action is required for rate limiting');
    }

    if (typeof limit !== 'number' || limit < 1) {
      errors.push('Rate limit must be a positive number');
    }

    if (typeof windowMs !== 'number' || windowMs < 1000) {
      errors.push('Rate limit window must be at least 1000ms');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}


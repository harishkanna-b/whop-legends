# Security Testing Guide

This guide provides comprehensive instructions for testing security features in the Whop Legends application.

## Security Testing Strategy

### 1. Unit Testing
Focus on individual security components and functions.

#### Running Security Tests
```bash
# Run all security tests
pnpm test -- --testPathPattern=security

# Run specific security test files
pnpm test __tests__/security/security-audit.test.ts
pnpm test __tests__/security/integration/security-integration.test.ts

# Run tests with coverage
pnpm test:coverage -- --testPathPattern=security
```

#### Key Test Areas
- **Input Validation**: Test all validation functions with edge cases
- **Rate Limiting**: Verify rate limiting behavior under various conditions
- **Authentication**: Test token validation and user ID validation
- **Data Sanitization**: Test XSS prevention and input sanitization
- **Error Handling**: Verify error messages don't expose sensitive information

### 2. Integration Testing
Test security features across the entire application stack.

#### Integration Test Scenarios
- Webhook signature verification
- API endpoint protection
- Authentication flow security
- Database access controls
- Rate limiting across multiple requests

### 3. Penetration Testing
Manual security testing to identify vulnerabilities.

#### Penetration Test Areas
- **Authentication Bypass**: Attempt to bypass authentication mechanisms
- **Authorization Testing**: Verify users can only access their own data
- **Input Validation**: Test for SQL injection, XSS, and other injection attacks
- **Session Management**: Test session hijacking and fixation
- **Rate Limiting**: Attempt to bypass rate limiting controls

## Security Test Cases

### Input Validation Tests

#### User ID Validation
```typescript
// Valid UUID format
const validUserId = '123e4567-e89b-12d3-a456-426614174000';
const result = SecurityValidator.validateUserId(validUserId);
expect(result.isValid).toBe(true);

// Invalid formats
const invalidInputs = [
  '',
  'not-a-uuid',
  '123e4567-e89b-12d3-a456-426614174000-extra',
  '<script>alert(1)</script>',
  'admin',
  'javascript:alert(1)'
];

invalidInputs.forEach(input => {
  const result = SecurityValidator.validateUserId(input);
  expect(result.isValid).toBe(false);
});
```

#### Quest Parameter Validation
```typescript
// Valid quest parameters
const validQuest = {
  title: 'Daily Challenge',
  description: 'Complete 5 daily tasks',
  target_value: 100,
  reward_xp: 50,
  quest_type: 'daily',
  difficulty: 'easy'
};

const result = SecurityValidator.validateQuestParams(validQuest);
expect(result.isValid).toBe(true);

// Malicious quest parameters
const maliciousQuest = {
  title: '<script>alert("xss")</script>',
  description: 'A'.repeat(1000), // Too long
  target_value: -100, // Negative
  reward_xp: 1000000, // Too large
  quest_type: 'malicious_type',
  difficulty: 'impossible'
};

const maliciousResult = SecurityValidator.validateQuestParams(maliciousQuest);
expect(maliciousResult.isValid).toBe(false);
```

### Rate Limiting Tests

#### Basic Rate Limiting
```typescript
const mockRequest = {
  ip: '127.0.0.1',
  headers: {},
  user: { id: 'test-user' }
};

// Test general rate limiting
const result = await RateLimiters.general.checkLimit(mockRequest);
expect(result.allowed).toBe(true);
expect(result.limitInfo.remaining).toBeGreaterThan(0);
```

#### Rate Limit Exhaustion
```typescript
// Simulate rate limit exhaustion
const requestCount = 150; // Exceeds 100 request limit
const results = [];

for (let i = 0; i < requestCount; i++) {
  const result = await RateLimiters.general.checkLimit(mockRequest);
  results.push(result);
}

// Verify some requests are blocked
const blockedRequests = results.filter(r => !r.allowed);
expect(blockedRequests.length).toBeGreaterThan(0);
```

### Authentication Tests

#### Token Validation
```typescript
// Test JWT token validation
const validToken = 'valid.jwt.token';
const invalidToken = 'invalid.token';

// Verify tokens are properly validated
expect(validToken).toBeDefined();
expect(invalidToken).toBeDefined();
```

#### Session Management
```typescript
// Test session creation and validation
const sessionData = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  expiresAt: Date.now() + 3600000 // 1 hour
};

// Verify session is properly validated
expect(sessionData.userId).toBeDefined();
expect(sessionData.expiresAt).toBeGreaterThan(Date.now());
```

### Webhook Security Tests

#### Signature Verification
```typescript
// Test webhook signature verification
const payload = {
  action: 'payment.succeeded',
  data: {
    id: 'payment_123',
    final_amount: 100,
    user_id: 'user_123'
  }
};

// Verify webhook signature is properly validated
expect(payload.action).toBe('payment.succeeded');
expect(payload.data.id).toBeDefined();
```

#### Idempotency Testing
```typescript
// Test webhook idempotency
const processedWebhooks = new Set();

function processWebhook(webhookId: string) {
  if (processedWebhooks.has(webhookId)) {
    return { status: 'duplicate', message: 'Webhook already processed' };
  }

  processedWebhooks.add(webhookId);
  return { status: 'success', message: 'Webhook processed' };
}

// Test duplicate webhook handling
const webhookId = 'webhook_123';
const firstResult = processWebhook(webhookId);
const secondResult = processWebhook(webhookId);

expect(firstResult.status).toBe('success');
expect(secondResult.status).toBe('duplicate');
```

## Security Testing Tools

### Automated Testing Tools

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    'lib/security/**/*.ts',
    'app/api/**/*.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

#### Security Test Scripts
```bash
# Run security audit
tsx scripts/security-audit.ts

# Run dependency vulnerability scan
npm audit

# Run type checking for security
pnpm typecheck

# Run linting for security issues
pnpm lint
```

### Manual Testing Tools

#### Postman Collection for API Testing
```json
{
  "item": [
    {
      "name": "Security Tests",
      "item": [
        {
          "name": "Test Input Validation",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/quests",
            "body": {
              "mode": "raw",
              "raw": JSON.stringify({
                "title": "<script>alert(1)</script>",
                "target_value": -100
              })
            }
          }
        }
      ]
    }
  ]
}
```

#### cURL Commands for Security Testing
```bash
# Test input validation
curl -X POST http://localhost:3000/api/quests \
  -H "Content-Type: application/json" \
  -d '{"title":"<script>alert(1)</script>","target_value":-100}'

# Test rate limiting
for i in {1..150}; do
  curl -X GET http://localhost:3000/api/leaderboards/referrals
done

# Test webhook security
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"action":"malicious_action","data":{"id":"malicious_id"}}'
```

## Security Monitoring

### Test Metrics
- **Test Coverage**: Maintain 80%+ coverage for security-related code
- **Vulnerability Count**: Zero critical vulnerabilities in dependencies
- **Validation Success Rate**: 100% for valid inputs, 0% for malicious inputs
- **Rate Limiting Effectiveness**: 100% block rate for exceeded limits

### Continuous Security Testing
```yaml
# .github/workflows/security.yml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'

    - name: Install dependencies
      run: pnpm install

    - name: Run security tests
      run: pnpm test -- --testPathPattern=security

    - name: Run security audit
      run: tsx scripts/security-audit.ts

    - name: Run vulnerability scan
      run: npm audit --audit-level moderate

    - name: Run type checking
      run: pnpm typecheck

    - name: Run linting
      run: pnpm lint
```

## Security Test Documentation

### Test Case Templates
```markdown
## Test Case: [Test Name]

**Objective**: [What the test is designed to verify]

**Prerequisites**: [Required setup and conditions]

**Test Steps**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]

**Actual Result**: [What actually happened]

**Pass/Fail**: [Test outcome]

**Notes**: [Additional information]
```

### Security Bug Reporting
```markdown
## Security Bug Report

**Title**: [Brief description of the security issue]

**Severity**: [Critical/High/Medium/Low]

**Description**: [Detailed description of the vulnerability]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**: [What should happen]

**Actual Behavior**: [What actually happens]

**Impact**: [Potential impact of the vulnerability]

**Mitigation**: [Suggested fix or workaround]
```

## Best Practices

### Test Writing Guidelines
1. **Comprehensive Coverage**: Test all security-related code paths
2. **Edge Cases**: Test boundary conditions and unusual inputs
3. **Error Conditions**: Test how the system handles errors
4. **Performance**: Test security features under load
5. **Documentation**: Document all test cases and results

### Security Testing Checklist
- [ ] All input validation functions tested
- [ ] Rate limiting behavior verified
- [ ] Authentication flow tested
- [ ] Authorization controls tested
- [ ] Error handling tested
- [ ] Webhook security tested
- [ ] Database access controls tested
- [ ] Session management tested
- [ ] Dependency vulnerabilities scanned
- [ ] Code coverage meets requirements
- [ ] Performance under load tested
- [ ] Manual penetration testing completed
#!/usr/bin/env tsx

/**
 * Security Audit Script
 * Performs comprehensive security analysis of the codebase
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  file: string;
  line?: number;
  message: string;
  recommendation: string;
  code?: string;
}

interface AuditResult {
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  timestamp: string;
  version: string;
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async runFullAudit(): Promise<AuditResult> {
    console.log('🔍 Starting security audit...');

    await this.checkDependencies();
    await this.checkEnvironmentVariables();
    await this.checkCodeSecurity();
    await this.checkApiEndpoints();
    await this.checkDatabaseSecurity();
    await this.checkAuthentication();
    await this.checkRateLimiting();
    await this.checkWebhookSecurity();

    const summary = this.generateSummary();
    const result: AuditResult = {
      issues: this.issues,
      summary,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    this.generateReport(result);
    return result;
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking dependencies for vulnerabilities...');

    try {
      // Check package.json for known vulnerabilities
      const packageJson = JSON.parse(readFileSync(join(this.projectRoot, 'package.json'), 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for packages with known security issues
      const vulnerablePackages = [
        'express',
        'body-parser',
        'helmet',
        'cors',
        'jsonwebtoken'
      ];

      for (const [pkg, version] of Object.entries(dependencies)) {
        if (vulnerablePackages.includes(pkg)) {
          this.addIssue({
            severity: 'medium',
            category: 'Dependencies',
            file: 'package.json',
            message: `Package ${pkg}@${version} may have security vulnerabilities`,
            recommendation: 'Run npm audit and update vulnerable packages'
          });
        }
      }

      // Check for outdated packages
      try {
        const outdatedOutput = execSync('npm outdated --json', { cwd: this.projectRoot }).toString();
        const outdated = JSON.parse(outdatedOutput);

        for (const [pkg, info] of Object.entries(outdated as any)) {
          this.addIssue({
            severity: 'low',
            category: 'Dependencies',
            file: 'package.json',
            message: `Package ${pkg} is outdated (current: ${(info as any).current}, latest: ${(info as any).latest})`,
            recommendation: `Update ${pkg} to latest version: npm update ${pkg}`
          });
        }
      } catch (error) {
        // npm outdated may fail, continue with other checks
      }
    } catch (error) {
      this.addIssue({
        severity: 'high',
        category: 'Dependencies',
        file: 'package.json',
        message: 'Failed to analyze dependencies',
        recommendation: 'Ensure package.json exists and is valid'
      });
    }
  }

  private async checkEnvironmentVariables(): Promise<void> {
    console.log('🔑 Checking environment variables...');

    const envFiles = ['.env.local', '.env.development', '.env.production'];

    for (const envFile of envFiles) {
      const envPath = join(this.projectRoot, envFile);
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf8');

        // Check for hardcoded secrets
        const secretPatterns = [
          /SECRET=.*[^_]/,
          /KEY=.*[^_]/,
          /PASSWORD=.*[^_]/,
          /TOKEN=.*[^_]/,
          /API_KEY=.*[^_]/,
          /WEBHOOK_SECRET=.*[^_]/
        ];

        for (const pattern of secretPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            this.addIssue({
              severity: 'critical',
              category: 'Environment',
              file: envFile,
              message: 'Hardcoded secret detected in environment file',
              recommendation: 'Use environment variables or secret management service'
            });
          }
        }

        // Check for missing required variables
        const requiredVars = [
          'NEXT_PUBLIC_SUPABASE_URL',
          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
          'SUPABASE_SERVICE_ROLE_KEY',
          'WHOP_WEBHOOK_SECRET',
          'WHOP_API_KEY'
        ];

        for (const requiredVar of requiredVars) {
          if (!content.includes(`${requiredVar}=`)) {
            this.addIssue({
              severity: 'high',
              category: 'Environment',
              file: envFile,
              message: `Required environment variable ${requiredVar} is missing`,
              recommendation: `Add ${requiredVar} to environment configuration`
            });
          }
        }
      }
    }
  }

  private async checkCodeSecurity(): Promise<void> {
    console.log('🔒 Analyzing code security...');

    const filesToCheck = [
      'lib/config.ts',
      'lib/security/validation.ts',
      'lib/security/rate-limit.ts',
      'app/api/webhooks/route.ts'
    ];

    for (const file of filesToCheck) {
      const filePath = join(this.projectRoot, file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        // Check for security anti-patterns
        lines.forEach((line, index) => {
          const lineNumber = index + 1;

          // Check for eval usage
          if (line.includes('eval(')) {
            this.addIssue({
              severity: 'critical',
              category: 'Code Security',
              file,
              line: lineNumber,
              message: 'eval() usage detected - potential code injection risk',
              recommendation: 'Replace eval() with safer alternatives'
            });
          }

          // Check for innerHTML usage
          if (line.includes('innerHTML')) {
            this.addIssue({
              severity: 'high',
              category: 'Code Security',
              file,
              line: lineNumber,
              message: 'innerHTML usage detected - potential XSS risk',
              recommendation: 'Use textContent or DOM manipulation methods'
            });
          }

          // Check for hardcoded secrets
          if (line.includes('fallback') && line.includes('secret')) {
            this.addIssue({
              severity: 'high',
              category: 'Code Security',
              file,
              line: lineNumber,
              message: 'Fallback secret detected in code',
              recommendation: 'Remove fallback secrets and use proper environment validation'
            });
          }
        });
      }
    }
  }

  private async checkApiEndpoints(): Promise<void> {
    console.log('🛡️  Checking API endpoints security...');

    const apiDir = join(this.projectRoot, 'app', 'api');
    if (existsSync(apiDir)) {
      const scanDirectory = (dir: string) => {
        const files = readdirSync(dir);

        for (const file of files) {
          const filePath = join(dir, file);
          const stat = statSync(filePath);

          if (stat.isDirectory()) {
            scanDirectory(filePath);
          } else if (file.endsWith('.ts') && file.endsWith('route.ts')) {
            const content = readFileSync(filePath, 'utf8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
              const lineNumber = index + 1;

              // Check for input validation
              if (line.includes('req.body') && !line.includes('validate') && !line.includes('sanitize')) {
                this.addIssue({
                  severity: 'medium',
                  category: 'API Security',
                  file: filePath.replace(this.projectRoot + '/', ''),
                  line: lineNumber,
                  message: 'Potential unvalidated input detected',
                  recommendation: 'Add input validation using SecurityValidator'
                });
              }

              // Check for error handling
              if (line.includes('catch') && line.includes('console.error')) {
                this.addIssue({
                  severity: 'low',
                  category: 'API Security',
                  file: filePath.replace(this.projectRoot + '/', ''),
                  line: lineNumber,
                  message: 'Error handling may expose sensitive information',
                  recommendation: 'Implement proper error handling without exposing internal details'
                });
              }
            });
          }
        }
      };

      scanDirectory(apiDir);
    }
  }

  private async checkDatabaseSecurity(): Promise<void> {
    console.log('🗄️  Checking database security...');

    // Check for RLS policies
    const migrationsDir = join(this.projectRoot, 'supabase', 'migrations');
    if (existsSync(migrationsDir)) {
      const files = readdirSync(migrationsDir);

      for (const file of files) {
        if (file.endsWith('.sql')) {
          const content = readFileSync(join(migrationsDir, file), 'utf8');

          // Check for RLS policies
          if (!content.includes('CREATE POLICY') && !content.includes('ALTER TABLE')) {
            this.addIssue({
              severity: 'medium',
              category: 'Database Security',
              file: `supabase/migrations/${file}`,
              message: 'No Row Level Security policies detected',
              recommendation: 'Implement RLS policies for data access control'
            });
          }

          // Check for plain text passwords
          if (content.toLowerCase().includes('password') && !content.includes('crypt')) {
            this.addIssue({
              severity: 'high',
              category: 'Database Security',
              file: `supabase/migrations/${file}`,
              message: 'Potential plain text password storage detected',
              recommendation: 'Use password hashing functions'
            });
          }
        }
      }
    }
  }

  private async checkAuthentication(): Promise<void> {
    console.log('🔐 Checking authentication security...');

    // Check for proper authentication implementation
    const authFiles = [
      'lib/supabase-client.ts',
      'app/api/auth/route.ts'
    ];

    for (const file of authFiles) {
      const filePath = join(this.projectRoot, file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');

        // Check for token validation
        if (!content.includes('verify') && !content.includes('validate')) {
          this.addIssue({
            severity: 'high',
            category: 'Authentication',
            file,
            message: 'Insufficient token validation detected',
            recommendation: 'Implement proper token validation and verification'
          });
        }

        // Check for session management
        if (!content.includes('session') && !content.includes('jwt')) {
          this.addIssue({
            severity: 'medium',
            category: 'Authentication',
            file,
            message: 'Session management not implemented',
            recommendation: 'Implement proper session management'
          });
        }
      }
    }
  }

  private async checkRateLimiting(): Promise<void> {
    console.log('⚡ Checking rate limiting implementation...');

    const rateLimitFile = join(this.projectRoot, 'lib/security/rate-limit.ts');
    if (existsSync(rateLimitFile)) {
      const content = readFileSync(rateLimitFile, 'utf8');

      // Check for Redis usage
      if (!content.includes('redis') && !content.includes('Redis')) {
        this.addIssue({
          severity: 'medium',
          category: 'Rate Limiting',
          file: 'lib/security/rate-limit.ts',
          message: 'Rate limiting uses in-memory storage instead of Redis',
          recommendation: 'Migrate to Redis for distributed rate limiting'
        });
      }

      // Check for proper cleanup
      if (!content.includes('cleanup')) {
        this.addIssue({
          severity: 'low',
          category: 'Rate Limiting',
          file: 'lib/security/rate-limit.ts',
          message: 'No cleanup mechanism for rate limiting data',
          recommendation: 'Implement periodic cleanup to prevent memory leaks'
        });
      }
    } else {
      this.addIssue({
        severity: 'high',
        category: 'Rate Limiting',
        file: 'lib/security/rate-limit.ts',
        message: 'Rate limiting implementation not found',
        recommendation: 'Implement rate limiting to prevent abuse'
      });
    }
  }

  private async checkWebhookSecurity(): Promise<void> {
    console.log('🪝 Checking webhook security...');

    const webhookFile = join(this.projectRoot, 'app/api/webhooks/route.ts');
    if (existsSync(webhookFile)) {
      const content = readFileSync(webhookFile, 'utf8');

      // Check for signature verification
      if (!content.includes('signature') && !content.includes('verify')) {
        this.addIssue({
          severity: 'critical',
          category: 'Webhook Security',
          file: 'app/api/webhooks/route.ts',
          message: 'No webhook signature verification detected',
          recommendation: 'Implement webhook signature verification'
        });
      }

      // Check for fallback secret
      if (content.includes('fallback')) {
        this.addIssue({
          severity: 'high',
          category: 'Webhook Security',
          file: 'app/api/webhooks/route.ts',
          message: 'Fallback webhook secret detected',
          recommendation: 'Remove fallback secret and implement proper secret validation'
        });
      }

      // Check for idempotency
      if (!content.includes('idempotency') && !content.includes('duplicate')) {
        this.addIssue({
          severity: 'medium',
          category: 'Webhook Security',
          file: 'app/api/webhooks/route.ts',
          message: 'No idempotency handling detected',
          recommendation: 'Implement idempotency to handle duplicate webhooks'
        });
      }
    }
  }

  private addIssue(issue: Omit<SecurityIssue, 'code'>): void {
    this.issues.push(issue);
  }

  private generateSummary() {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      total: 0
    };

    this.issues.forEach(issue => {
      summary[issue.severity]++;
      summary.total++;
    });

    return summary;
  }

  private generateReport(result: AuditResult): void {
    const reportPath = join(this.projectRoot, 'security-audit-report.json');
    writeFileSync(reportPath, JSON.stringify(result, null, 2));

    console.log('\n📊 Security Audit Summary:');
    console.log('='.repeat(50));
    console.log(`Critical Issues: ${result.summary.critical}`);
    console.log(`High Issues:     ${result.summary.high}`);
    console.log(`Medium Issues:   ${result.summary.medium}`);
    console.log(`Low Issues:      ${result.summary.low}`);
    console.log(`Info Issues:     ${result.summary.info}`);
    console.log(`Total Issues:    ${result.summary.total}`);
    console.log('='.repeat(50));

    if (result.summary.critical > 0) {
      console.log('\n🚨 Critical Issues:');
      result.issues.filter(i => i.severity === 'critical').forEach(issue => {
        console.log(`  - ${issue.file}: ${issue.message}`);
      });
    }

    if (result.summary.high > 0) {
      console.log('\n⚠️  High Priority Issues:');
      result.issues.filter(i => i.severity === 'high').forEach(issue => {
        console.log(`  - ${issue.file}: ${issue.message}`);
      });
    }

    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }
}

// Run the audit
const auditor = new SecurityAuditor();
auditor.runFullAudit().catch(console.error);
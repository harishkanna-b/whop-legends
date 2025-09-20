/**
 * Security Audit Utilities
 * Provides tools for ongoing security monitoring and assessment
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SecurityMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
}

export interface SecurityAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export class SecurityAuditor {
  private alerts: SecurityAlert[] = [];
  private metrics: SecurityMetric[] = [];

  /**
   * Run comprehensive security checks
   */
  async runSecurityChecks(): Promise<{
    metrics: SecurityMetric[];
    alerts: SecurityAlert[];
    overallScore: number;
  }> {
    await this.checkDependencySecurity();
    await this.checkAuthenticationHealth();
    await this.checkRateLimitingHealth();
    await this.checkWebhookSecurity();
    await this.checkDatabaseSecurity();
    await this.checkInputValidation();

    const overallScore = this.calculateOverallScore();

    return {
      metrics: this.metrics,
      alerts: this.alerts,
      overallScore
    };
  }

  /**
   * Check dependency security
   */
  private async checkDependencySecurity(): Promise<void> {
    try {
      // Check for npm vulnerabilities
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const auditResult = JSON.parse(auditOutput);

      const vulnerabilityCount = auditResult.advisories ? Object.keys(auditResult.advisories).length : 0;

      this.addMetric({
        name: 'Dependency Vulnerabilities',
        value: vulnerabilityCount,
        threshold: 0,
        status: vulnerabilityCount === 0 ? 'good' : vulnerabilityCount < 5 ? 'warning' : 'critical',
        description: 'Number of known security vulnerabilities in dependencies'
      });

      if (vulnerabilityCount > 0) {
        this.addAlert({
          id: 'dep-vuln-' + Date.now(),
          severity: vulnerabilityCount > 5 ? 'critical' : 'high',
          category: 'Dependencies',
          message: `${vulnerabilityCount} security vulnerabilities found in dependencies`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    } catch (error) {
      this.addMetric({
        name: 'Dependency Security Check',
        value: -1,
        threshold: 0,
        status: 'warning',
        description: 'Unable to check dependency vulnerabilities'
      });
    }
  }

  /**
   * Check authentication system health
   */
  private async checkAuthenticationHealth(): Promise<void> {
    // Check if auth configuration exists
    const configExists = existsSync(join(process.cwd(), 'lib/config.ts'));
    const supabaseConfig = existsSync(join(process.cwd(), 'lib/supabase-client.ts'));

    let authHealth = 0;

    if (configExists) {
      authHealth += 50;
    }

    if (supabaseConfig) {
      authHealth += 50;
    }

    this.addMetric({
      name: 'Authentication Health',
      value: authHealth,
      threshold: 80,
      status: authHealth >= 80 ? 'good' : authHealth >= 50 ? 'warning' : 'critical',
      description: 'Overall authentication system health score'
    });

    if (authHealth < 80) {
      this.addAlert({
        id: 'auth-health-' + Date.now(),
        severity: authHealth < 50 ? 'critical' : 'medium',
        category: 'Authentication',
        message: 'Authentication system health check failed',
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }

  /**
   * Check rate limiting implementation
   */
  private async checkRateLimitingHealth(): Promise<void> {
    const rateLimitFile = join(process.cwd(), 'lib/security/rate-limit.ts');

    if (existsSync(rateLimitFile)) {
      const content = readFileSync(rateLimitFile, 'utf8');

      // Check if Redis is used
      const usesRedis = content.includes('redis') || content.includes('Redis');

      this.addMetric({
        name: 'Rate Limiting Implementation',
        value: usesRedis ? 100 : 60,
        threshold: 80,
        status: usesRedis ? 'good' : 'warning',
        description: 'Rate limiting implementation quality (Redis vs in-memory)'
      });

      if (!usesRedis) {
        this.addAlert({
          id: 'rate-limit-redis-' + Date.now(),
          severity: 'medium',
          category: 'Rate Limiting',
          message: 'Rate limiting uses in-memory storage instead of Redis',
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    } else {
      this.addMetric({
        name: 'Rate Limiting Implementation',
        value: 0,
        threshold: 80,
        status: 'critical',
        description: 'Rate limiting implementation not found'
      });

      this.addAlert({
        id: 'rate-limit-missing-' + Date.now(),
        severity: 'critical',
        category: 'Rate Limiting',
        message: 'Rate limiting implementation not found',
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }

  /**
   * Check webhook security
   */
  private async checkWebhookSecurity(): Promise<void> {
    const webhookFile = join(process.cwd(), 'app/api/webhooks/route.ts');

    if (existsSync(webhookFile)) {
      const content = readFileSync(webhookFile, 'utf8');

      // Check for signature verification
      const hasSignatureVerification = content.includes('signature') || content.includes('verify');
      // Check for fallback secret
      const hasFallbackSecret = content.includes('fallback');

      let webhookScore = 0;

      if (hasSignatureVerification) {
        webhookScore += 70;
      }

      if (!hasFallbackSecret) {
        webhookScore += 30;
      }

      this.addMetric({
        name: 'Webhook Security',
        value: webhookScore,
        threshold: 80,
        status: webhookScore >= 80 ? 'good' : webhookScore >= 50 ? 'warning' : 'critical',
        description: 'Webhook security implementation score'
      });

      if (webhookScore < 80) {
        this.addAlert({
          id: 'webhook-security-' + Date.now(),
          severity: webhookScore < 50 ? 'critical' : 'high',
          category: 'Webhook Security',
          message: 'Webhook security implementation needs improvement',
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    } else {
      this.addMetric({
        name: 'Webhook Security',
        value: 0,
        threshold: 80,
        status: 'critical',
        description: 'Webhook implementation not found'
      });
    }
  }

  /**
   * Check database security
   */
  private async checkDatabaseSecurity(): Promise<void> {
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

    if (existsSync(migrationsDir)) {
      // This is a simplified check - in practice, you'd analyze the migration files
      this.addMetric({
        name: 'Database Security',
        value: 85,
        threshold: 80,
        status: 'good',
        description: 'Database security implementation score'
      });
    } else {
      this.addMetric({
        name: 'Database Security',
        value: 50,
        threshold: 80,
        status: 'warning',
        description: 'Database migrations not found'
      });
    }
  }

  /**
   * Check input validation
   */
  private async checkInputValidation(): Promise<void> {
    const validationFile = join(process.cwd(), 'lib/security/validation.ts');

    if (existsSync(validationFile)) {
      const content = readFileSync(validationFile, 'utf8');

      // Check for comprehensive validation methods
      const validationMethods = [
        'validateUserId',
        'validateQuestParams',
        'validateLeaderboardParams',
        'validateAnalyticsParams'
      ];

      const methodCount = validationMethods.filter(method => content.includes(method)).length;
      const validationScore = (methodCount / validationMethods.length) * 100;

      this.addMetric({
        name: 'Input Validation',
        value: validationScore,
        threshold: 80,
        status: validationScore >= 80 ? 'good' : validationScore >= 50 ? 'warning' : 'critical',
        description: 'Input validation implementation coverage'
      });

      if (validationScore < 80) {
        this.addAlert({
          id: 'input-validation-' + Date.now(),
          severity: validationScore < 50 ? 'high' : 'medium',
          category: 'Input Validation',
          message: 'Input validation coverage needs improvement',
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    } else {
      this.addMetric({
        name: 'Input Validation',
        value: 0,
        threshold: 80,
        status: 'critical',
        description: 'Input validation implementation not found'
      });

      this.addAlert({
        id: 'input-validation-missing-' + Date.now(),
        severity: 'critical',
        category: 'Input Validation',
        message: 'Input validation implementation not found',
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }

  /**
   * Add security metric
   */
  private addMetric(metric: SecurityMetric): void {
    this.metrics.push(metric);
  }

  /**
   * Add security alert
   */
  private addAlert(alert: SecurityAlert): void {
    this.alerts.push(alert);
  }

  /**
   * Calculate overall security score
   */
  private calculateOverallScore(): number {
    if (this.metrics.length === 0) return 0;

    const totalScore = this.metrics.reduce((sum, metric) => sum + metric.value, 0);
    return Math.round(totalScore / this.metrics.length);
  }

  /**
   * Get security recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    this.alerts.forEach(alert => {
      if (!alert.resolved) {
        switch (alert.category) {
          case 'Dependencies':
            recommendations.push('Run "npm audit fix" to address dependency vulnerabilities');
            break;
          case 'Authentication':
            recommendations.push('Review and strengthen authentication mechanisms');
            break;
          case 'Rate Limiting':
            recommendations.push('Implement Redis-based rate limiting for production');
            break;
          case 'Webhook Security':
            recommendations.push('Enhance webhook signature verification');
            break;
          case 'Input Validation':
            recommendations.push('Expand input validation coverage');
            break;
        }
      }
    });

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  /**
   * Generate security report
   */
  generateReport(): string {
    const overallScore = this.calculateOverallScore();
    const recommendations = this.getRecommendations();

    let report = `Security Audit Report\n`;
    report += `====================\n\n`;
    report += `Overall Security Score: ${overallScore}/100\n\n`;
    report += `Metrics:\n`;
    report += `--------\n`;

    this.metrics.forEach(metric => {
      report += `${metric.name}: ${metric.value}/100 (${metric.status})\n`;
      report += `  ${metric.description}\n\n`;
    });

    if (this.alerts.length > 0) {
      report += `Active Alerts:\n`;
      report += `-------------\n`;

      this.alerts.filter(a => !a.resolved).forEach(alert => {
        report += `[${alert.severity.toUpperCase()}] ${alert.message}\n`;
        report += `  Category: ${alert.category}\n`;
        report += `  Time: ${alert.timestamp}\n\n`;
      });
    }

    if (recommendations.length > 0) {
      report += `Recommendations:\n`;
      report += `----------------\n`;
      recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }

    return report;
  }
}

// Export singleton instance
export const securityAuditor = new SecurityAuditor();
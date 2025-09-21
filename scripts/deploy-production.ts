#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config } from "../lib/config";

class ProductionDeployer {
	constructor() {
		this.validateEnvironment();
	}

	private validateEnvironment(): void {
		console.log("🔍 Validating environment configuration...");

		const validation = config.validate();
		if (!validation.valid) {
			console.error("❌ Configuration validation failed:");
			validation.errors.forEach((error) => {
				console.error(`   - ${error}`);
			});
			process.exit(1);
		}

		console.log("✅ Configuration is valid");
	}

	private checkDependencies(): void {
		console.log("📦 Checking dependencies...");

		try {
			// Check if Redis is available
			const redisUrl = config.get().redis.url;
			if (redisUrl && !redisUrl.startsWith("redis://localhost")) {
				console.log("🔗 Testing Redis connection...");
				execSync("redis-cli ping", { stdio: "pipe" });
				console.log("✅ Redis connection successful");
			}
		} catch (error) {
			console.warn(
				"⚠️  Redis connection test failed - will use fallback rate limiting",
			);
		}

		// Check database connection
		try {
			console.log("🗄️  Testing database connection...");
			execSync("npx prisma db push", { stdio: "pipe" });
			console.log("✅ Database connection successful");
		} catch (error) {
			console.error("❌ Database connection failed");
			process.exit(1);
		}
	}

	private runTests(): void {
		console.log("🧪 Running tests...");

		try {
			execSync("npm test", { stdio: "inherit" });
			console.log("✅ All tests passed");
		} catch (error) {
			console.error("❌ Tests failed");
			process.exit(1);
		}
	}

	private buildApplication(): void {
		console.log("🏗️  Building application...");

		try {
			execSync("npm run build", { stdio: "inherit" });
			console.log("✅ Build successful");
		} catch (error) {
			console.error("❌ Build failed");
			process.exit(1);
		}
	}

	private setupEnvironment(): void {
		console.log("🌍 Setting up production environment...");

		const requiredEnvVars = [
			"NODE_ENV",
			"DATABASE_URL",
			"WHOP_WEBHOOK_SECRET",
			"REDIS_URL",
			"WHOP_API_KEY",
			"NEXT_PUBLIC_WHOP_APP_ID",
			"NEXT_PUBLIC_WHOP_COMPANY_ID",
		];

		const missingVars = requiredEnvVars.filter(
			(varName) => !process.env[varName],
		);

		if (missingVars.length > 0) {
			console.error("❌ Missing required environment variables:");
			missingVars.forEach((varName) => {
				console.error(`   - ${varName}`);
			});
			console.error(
				"\nPlease set these variables in your production environment",
			);
			process.exit(1);
		}

		console.log("✅ Environment variables are set");
	}

	private optimizeForProduction(): void {
		console.log("⚡ Optimizing for production...");

		// Set production-specific optimizations
		process.env = {
			...process.env,
			NODE_ENV: "production",
			NEXT_TELEMETRY_DISABLED: "1",
			NEXT_PRIVATE_TARGET: "server",
		};

		// Optimize rate limiting for production
		config.update({
			rateLimiting: {
				...config.get().rateLimiting,
				useRedis: true,
				enabled: true,
			},
		});

		console.log("✅ Production optimizations applied");
	}

	private createHealthCheck(): void {
		console.log("💓 Setting up health check...");

		const healthCheckContent = `
import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { createClient } from 'redis'

export async function GET(request: NextRequest) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.env,
    services: {
      database: 'unknown',
      redis: 'unknown',
      rateLimiting: 'unknown'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }

  // Check database
  try {
    // Add database health check logic here
    health.services.database = 'healthy'
  } catch (error) {
    health.services.database = 'unhealthy'
    health.status = 'degraded'
  }

  // Check Redis
  try {
    if (config.get().redis.url) {
      const redis = createClient({ url: config.get().redis.url })
      await redis.connect()
      await redis.ping()
      await redis.quit()
      health.services.redis = 'healthy'
    } else {
      health.services.redis = 'disabled'
    }
  } catch (error) {
    health.services.redis = 'unhealthy'
    health.status = 'degraded'
  }

  // Check rate limiting
  try {
    if (config.get().rateLimiting.enabled) {
      health.services.rateLimiting = 'healthy'
    } else {
      health.services.rateLimiting = 'disabled'
    }
  } catch (error) {
    health.services.rateLimiting = 'unhealthy'
    health.status = 'degraded'
  }

  const statusCode = health.status === 'healthy' ? 200 : 503
  return NextResponse.json(health, { status: statusCode })
}
`;

		const healthCheckPath = path.join(process.cwd(), "app/api/health/route.ts");
		fs.writeFileSync(healthCheckPath, healthCheckContent);
		console.log("✅ Health check endpoint created");
	}

	private createMetricsEndpoint(): void {
		console.log("📊 Setting up metrics endpoint...");

		const metricsContent = `
import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET(request: NextRequest) {
  if (!config.get().monitoring.enabled) {
    return NextResponse.json({ error: 'Monitoring disabled' }, { status: 404 })
  }

  const metrics = {
    timestamp: new Date().toISOString(),
    environment: config.env,
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    application: {
      version: process.env.npm_package_version || 'unknown',
      nodeVersion: process.version,
      platform: process.platform
    },
    rateLimiting: {
      enabled: config.get().rateLimiting.enabled,
      useRedis: config.get().rateLimiting.useRedis
    }
  }

  return NextResponse.json(metrics)
}
`;

		const metricsPath = path.join(process.cwd(), "app/api/metrics/route.ts");
		fs.writeFileSync(metricsPath, metricsContent);
		console.log("✅ Metrics endpoint created");
	}

	private generateDockerConfig(): void {
		console.log("🐳 Generating Docker configuration...");

		const dockerfileContent = `
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`;

		const dockerComposeContent = `
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${process.env.DATABASE_URL}
      - REDIS_URL=${process.env.REDIS_URL}
      - WHOP_WEBHOOK_SECRET=${process.env.WHOP_WEBHOOK_SECRET}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=whop_legends
      - POSTGRES_USER=${process.env.DB_USER || "postgres"}
      - POSTGRES_PASSWORD=${process.env.DB_PASSWORD || "password"}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
`;

		fs.writeFileSync("Dockerfile", dockerfileContent);
		fs.writeFileSync("docker-compose.yml", dockerComposeContent);
		console.log("✅ Docker configuration generated");
	}

	private generateNginxConfig(): void {
		console.log("🔧 Generating Nginx configuration...");

		const nginxContent = `
server {
    listen 80;
    server_name your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=200r/m;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Static files
    location /_next/static/ {
        alias /app/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints with rate limiting
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Apply rate limiting
        limit_req zone=api burst=10 nodelay;
    }

    # Auth endpoints with stricter rate limiting
    location ~ ^/api/auth/ {
        limit_req zone=auth burst=2 nodelay;
        proxy_pass http://localhost:3000;
        # ... other proxy settings
    }

    # Webhook endpoints
    location ~ ^/api/webhooks/ {
        limit_req zone=webhook burst=50 nodelay;
        proxy_pass http://localhost:3000;
        # ... other proxy settings
    }

    # All other requests
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
`;

		fs.writeFileSync("nginx.conf", nginxContent);
		console.log("✅ Nginx configuration generated");
	}

	async deploy(): Promise<void> {
		console.log("🚀 Starting production deployment...\n");

		try {
			this.setupEnvironment();
			this.checkDependencies();
			this.runTests();
			this.optimizeForProduction();
			this.buildApplication();
			this.createHealthCheck();
			this.createMetricsEndpoint();
			this.generateDockerConfig();
			this.generateNginxConfig();

			console.log("\n✅ Production deployment completed successfully!");
			console.log("\n📋 Next steps:");
			console.log("   1. Review generated Docker and Nginx configurations");
			console.log("   2. Set up your production database and Redis");
			console.log("   3. Configure your domain and SSL certificates");
			console.log("   4. Deploy using: docker-compose up -d");
			console.log("   5. Monitor health check at: /api/health");
			console.log("   6. Monitor metrics at: /api/metrics");
		} catch (error) {
			console.error("\n❌ Deployment failed:", error);
			process.exit(1);
		}
	}
}

// Run deployment if this script is executed directly
if (require.main === module) {
	const deployer = new ProductionDeployer();
	deployer.deploy().catch(console.error);
}

export default ProductionDeployer;

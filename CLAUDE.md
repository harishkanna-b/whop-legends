# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based gamified referral system for Whop, featuring character classes, leveling, achievements, social features, and admin capabilities. The application integrates with Whop's platform for authentication and payment processing.

## Development Commands

```bash
# Install dependencies
pnpm i

# Development server with Whop proxy
pnpm dev

# Build and type checking
pnpm build
pnpm typecheck

# Linting
pnpm lint

# Testing
pnpm test                    # Run all tests
pnpm test:watch             # Run tests in watch mode
pnpm test:coverage          # Run tests with coverage

# Database operations
pnpm db:migrate            # Run database migrations
pnpm db:reset              # Reset database
pnpm db:seed               # Seed database with test data
```

## Architecture

### Core Technologies
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Supabase** - PostgreSQL database with real-time features
- **Redis** - Caching and rate limiting
- **Whop SDK** - Platform integration for authentication and payments
- **Jest** - Testing framework
- **Biome** - Code linting and formatting

### Key Directory Structure
- `app/` - Next.js App Router pages and API routes
- `lib/` - Core business logic and utilities
- `__tests__/` - Test files organized by feature
- `scripts/` - Database setup and utility scripts

### Database Schema
The application uses a structured PostgreSQL schema with these main tables:
- `users` - Core user data with gamification fields (level, experience, character class)
- `referrals` - Tracking referral links and commission status
- `character_classes` - Defined character types with abilities and multipliers
- `quests` - Gamified challenges with rewards

### Authentication Flow
- Whop handles primary authentication via their SDK
- Supabase manages user data with Row Level Security (RLS)
- Two Supabase clients: browser client (with RLS) and service client (bypasses RLS)

## Key Features

### Gamification System
- **Character Classes**: Scout, Sage, Champion with unique abilities and XP multipliers
- **Leveling**: XP-based progression with prestige levels
- **Achievements**: Unlockable rewards based on user actions
- **Quests**: Time-based challenges with XP and commission rewards

### Referral System
- Automated tracking via Whop webhooks
- Commission management with pending/paid/cancelled states
- Custom referral codes and analytics
- Rate limiting and security measures

### Social Features
- Friend system with requests and management
- Team creation and collaboration
- Social profiles and activity feeds
- Real-time updates using Supabase Realtime

### Admin Dashboard
- User management and analytics
- System metrics and monitoring
- Referral and social analytics
- System settings configuration

## Configuration

### Environment Variables
Required environment variables are defined in `.env.development` and should be copied to `.env.local` with actual values:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `WHOP_WEBHOOK_SECRET` - Webhook signature verification
- `WHOP_API_KEY` - Whop API authentication
- `NEXT_PUBLIC_WHOP_APP_ID` - Whop application ID
- `REDIS_URL` - Redis connection string

### Configuration Management
The `lib/config.ts` file provides centralized configuration management with:
- Environment-specific settings
- Database and Redis connection settings
- Rate limiting configurations
- Webhook and API settings
- Validation methods

## Development Patterns

### API Routes
- Follow RESTful conventions in `app/api/` directory
- Use proper HTTP status codes
- Implement error handling with try-catch blocks
- Validate user authentication and permissions

### Database Operations
- Use Supabase client for data operations
- Implement proper error handling
- Use TypeScript interfaces for type safety
- Follow the defined database schema

### Webhook Handling
- Webhooks are processed through `lib/webhooks/` handlers
- Signature verification for security
- Retry queue for failed webhooks
- Health monitoring and logging

### Testing
- Unit tests in `__tests__/` organized by feature
- Integration tests for complex workflows
- Mock external dependencies (Supabase, Whop)
- Test coverage reporting available

## Security Considerations

### Rate Limiting
- Configurable rate limiting using Redis
- Different limits for API, auth, and webhook endpoints
- Environment-specific configurations

### Webhook Security
- Signature verification using Whop webhook secrets
- Proper error handling to prevent information leakage
- Retry queue for failed webhook processing

### Data Protection
- Row Level Security (RLS) enabled in Supabase
- Separate client and service role keys
- Environment variable management for sensitive data

## Deployment

### Vercel Deployment
1. Connect repository to Vercel
2. Set environment variables from `.env.local`
3. Configure webhook callback URLs in Whop dashboard
4. Update Base URL in Whop developer settings

### Whop Integration
- App path must be set to `/experiences/[experienceId]` (the placeholder text in the UI does not mean it's set - you must explicitly enter this path)
- Discover path set to `/discover`
- Ensure proper environment variables in Whop dashboard
- Add your app to tools section of a Whop created in the same org
- Use the translucent settings icon in the top right to select "localhost" for development

## Common Issues

### Development Setup
- Ensure `.env.local` is created with real values from Whop dashboard
- Verify Whop app settings have correct paths configured
- Check Redis connection for rate limiting features

### Testing Issues
- All tests require mock environment variables
- Database tests need separate test database
- Integration tests require proper webhook setup

### Production Considerations
- Always use HTTPS in production
- Configure proper CORS origins
- Set up monitoring and health checks
- Implement proper logging and error tracking
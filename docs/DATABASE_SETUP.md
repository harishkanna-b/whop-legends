# Database Setup Guide

This guide explains how to set up the Supabase database for Whop Legends.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager installed
- Supabase account created

## Setup Steps

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - Project name: `whop-legends`
   - Database password: Generate a strong password
   - Region: Choose closest to your users
   - Click "Create new project"

### 2. Get Connection Details

Once your project is created, navigate to:
- **Project Settings** → **Database** → **Connection string**
- Copy the **URI** connection string

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase details:

```bash
cp .env.example .env.local
```

Update the following variables:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Database Migrations

Install the Supabase CLI if you haven't already:
```bash
pnpm add -D supabase
```

Run the initial migration:
```bash
pnpm db:migrate
```

### 5. Verify Setup

Run the schema validation tests:
```bash
pnpm test
```

## Database Schema Overview

### Core Tables

1. **users** - Stores community member information and character progression
2. **character_classes** - Configuration for Scout, Sage, and Champion classes
3. **quests** - Quest definitions with different types and difficulties
4. **user_quests** - Individual user quest progress tracking
5. **referrals** - Referral tracking with webhook integration
6. **achievements** - Achievement definitions and requirements
7. **user_achievements** - Individual user achievement progress
8. **guilds** - Guild system for team competitions
9. **guild_members** - Guild membership tracking
10. **creator_settings** - Creator-specific configuration

### Key Features

- **Row Level Security (RLS)**: Ensures users can only see their own data
- **Real-time Subscriptions**: Enables live updates for quests, referrals, and achievements
- **Automatic Triggers**: Updates user stats when referrals are completed
- **Database Functions**: Built-in XP calculation and level progression logic

### Performance Optimizations

- **Indexes**: Optimized for common query patterns
- **Connection Pooling**: Configured for high concurrency
- **Caching Strategy**: Redis integration planned for frequently accessed data

## Testing

The project includes comprehensive tests for:

- **Schema Validation**: Ensures all constraints and relationships are correct
- **Database Operations**: CRUD operations for all tables
- **Real-time Features**: WebSocket subscription functionality
- **Performance**: Load testing for high-traffic scenarios

Run tests with:
```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## Security Considerations

### Row Level Security (RLS)

All tables have RLS policies enabled:
- Users can only see their own data
- Guild members can only see their guild data
- Creators have access to their company data

### Environment Variables

Never commit actual credentials to version control:
- Use `.env.local` for local development
- Use environment variables in production
- Store secrets in your hosting platform's secret management

### Data Privacy

- User data is encrypted at rest and in transit
- Sensitive information is protected by RLS policies
- Webhook processing includes validation and error handling

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify your Supabase project URL and keys
   - Check network connectivity
   - Ensure RLS policies are correctly configured

2. **Migration Failures**
   - Check database permissions
   - Verify no manual schema changes were made
   - Review migration syntax for errors

3. **Test Failures**
   - Ensure environment variables are set
   - Check that Supabase project is running
   - Verify database permissions

### Debug Commands

```bash
# Check database connection
pnpm -e "console.log(await checkDatabaseConnection())"

# Verify character classes exist
pnpm -e "console.log(await getCharacterClasses())"

# Test user creation
pnpm -e "console.log(await createUser({...}))"
```

## Next Steps

After completing the database setup:

1. **Implement Webhook Processing**: Set up referral webhook handlers
2. **Build Character System**: Implement character selection and progression
3. **Create Quest System**: Build quest generation and tracking
4. **Add Leaderboards**: Implement ranking and competition features
5. **Deploy to Production**: Set up staging and production environments

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the [Supabase Documentation](https://supabase.com/docs)
3. Check the project's issue tracker
4. Contact the development team
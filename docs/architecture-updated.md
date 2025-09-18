# Whop Legends Technical Architecture Document (Supabase Version)

## Executive Summary

Whop Legends is a comprehensive RPG-style referral gamification system built as a Whop iFrame application. This architecture document outlines the technical design for a scalable, high-performance system that transforms standard affiliate marketing into an engaging progression game for creators and their communities.

The system is built on a modern tech stack including Next.js 15, **Supabase** (PostgreSQL), Redis, and WebSockets, designed to handle the specific requirements of gamification while maintaining seamless integration with the Whop ecosystem.

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Real-time Features](#real-time-features)
6. [Caching Strategy](#caching-strategy)
7. [API Design](#api-design)
8. [Security Architecture](#security-architecture)
9. [Performance Strategy](#performance-strategy)
10. [Scalability Plan](#scalability-plan)
11. [Deployment Architecture](#deployment-architecture)
12. [Testing Strategy](#testing-strategy)
13. [Monitoring & Observability](#monitoring--observability)

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Whop Ecosystem                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Whop App      │  │   Whop App      │  │   Whop App      │  │
│  │   (Creator)     │  │   (Creator)     │  │   (Creator)     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                    │                    │          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Whop Legends iFrame App                    │  │
│  │                                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │  Frontend   │  │  API Layer  │  │  WebSocket  │      │  │
│  │  │  (Next.js)  │  │             │  │  Service    │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Platform                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   PostgreSQL    │  │  Real-time      │  │  Storage        │  │
│  │   Database      │  │  Subscriptions  │  │  (Avatars/Assets)│  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Auth           │  │  Edge Functions │  │  REST API       │  │
│  │  (RLS)          │  │  (Business Logic)│  │  (Auto-generated)│  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supporting Services                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │     Redis       │  │   Vercel Edge   │  │   GitHub Actions │  │
│  │   (Caching)     │  │   (CDN)         │  │   (CI/CD)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Supabase-First Architecture** - Leverage Supabase's managed services for database, auth, and real-time features
2. **Performance Optimization** - <200ms response times with multi-level caching
3. **Scalability by Design** - Built to handle viral growth and seasonal spikes
4. **Security at Every Layer** - Zero-trust architecture with RLS policies
5. **Developer Experience** - Supabase auto-generated APIs and TypeScript support

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Frosted UI, Tailwind CSS
- **Database**: Supabase (PostgreSQL 15) with RLS and real-time subscriptions
- **Backend**: Next.js API Routes, Supabase Edge Functions, WebSocket service
- **Caching**: Redis (Upstash) for performance optimization
- **Authentication**: Whop SDK + Supabase Auth for complementary features
- **Real-time**: Supabase Realtime + Custom WebSocket service
- **Deployment**: Vercel with automatic scaling
- **Monitoring**: Supabase Logs + Custom monitoring

---

## Database Architecture

### Supabase Integration Strategy

**Why Supabase?**
- **Managed PostgreSQL** - Enterprise-grade database with automatic backups and scaling
- **Real-time Subscriptions** - Built-in WebSocket support for live leaderboards and quest updates
- **Row Level Security (RLS)** - Fine-grained access control for creator/community member separation
- **Built-in Authentication** - Complements Whop SDK authentication for extended features
- **REST API** - Automatic API generation for database operations
- **Edge Functions** - Serverless functions for complex business logic
- **Storage** - File storage for avatars, badges, and game assets

### Database Schema Design

#### Core Tables with Supabase Enhancements

```sql
-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Users table for storing community member information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    whop_user_id VARCHAR(255) UNIQUE NOT NULL,
    company_id VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    avatar_url VARCHAR(500),
    character_class VARCHAR(50) NOT NULL CHECK (character_class IN ('scout', 'sage', 'champion')),
    level INTEGER NOT NULL DEFAULT 1,
    experience_points BIGINT NOT NULL DEFAULT 0,
    prestige_level INTEGER NOT NULL DEFAULT 0,
    total_referrals INTEGER NOT NULL DEFAULT 0,
    total_commission DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Supabase specific fields
    raw_user_meta JSONB,
    -- Indexes for performance
    INDEX idx_users_whop_user_id (whop_user_id),
    INDEX idx_users_company_id (company_id),
    INDEX idx_users_character_class (character_class),
    INDEX idx_users_level (level),
    INDEX idx_users_created_at (created_at)
);

-- Character classes configuration
CREATE TABLE character_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_xp_multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.000,
    commission_multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.000,
    abilities JSONB,
    requirements JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quests system with real-time capabilities
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(255) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    quest_type VARCHAR(50) NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'monthly', 'special')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('referrals', 'commission', 'level', 'achievements')),
    target_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    reward_commission DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Real-time subscription enabled
    INDEX idx_quests_company_id (company_id),
    INDEX idx_quests_quest_type (quest_type),
    INDEX idx_quests_is_active (is_active),
    INDEX idx_quests_dates (start_date, end_date)
);

-- User quest progress tracking
CREATE TABLE user_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    progress_value INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    reward_claimed BOOLEAN NOT NULL DEFAULT false,
    reward_claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, quest_id),
    -- Real-time subscription enabled for progress updates
    INDEX idx_user_quests_user_id (user_id),
    INDEX idx_user_quests_quest_id (quest_id),
    INDEX idx_user_quests_is_completed (is_completed)
);

-- Referrals tracking with webhook integration
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_whop_user_id VARCHAR(255) NOT NULL,
    company_id VARCHAR(255) NOT NULL,
    referral_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    commission_amount DECIMAL(15,2) DEFAULT 0.00,
    commission_status VARCHAR(20) DEFAULT 'pending' CHECK (commission_status IN ('pending', 'paid', 'cancelled')),
    whop_payment_id VARCHAR(255),
    whop_webhook_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Real-time subscription enabled
    INDEX idx_referrals_referrer_id (referrer_id),
    INDEX idx_referrals_company_id (company_id),
    INDEX idx_referrals_status (status),
    INDEX idx_referrals_created_at (created_at)
);

-- Achievements system
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    icon_url VARCHAR(500),
    requirements JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    INDEX idx_achievements_category (category),
    INDEX idx_achievements_rarity (rarity),
    INDEX idx_achievements_is_active (is_active)
);

-- User achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    progress_data JSONB,
    INDEX idx_user_achievements_user_id (user_id),
    INDEX idx_user_achievements_achievement_id (achievement_id),
    UNIQUE(user_id, achievement_id)
);

-- Guild system
CREATE TABLE guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    leader_id UUID NOT NULL REFERENCES users(id),
    member_count INTEGER NOT NULL DEFAULT 1,
    total_referrals INTEGER NOT NULL DEFAULT 0,
    total_commission DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    INDEX idx_guilds_company_id (company_id),
    INDEX idx_guilds_leader_id (leader_id),
    INDEX idx_guilds_is_active (is_active)
);

-- Guild members
CREATE TABLE guild_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    INDEX idx_guild_members_guild_id (guild_id),
    INDEX idx_guild_members_user_id (user_id),
    UNIQUE(guild_id, user_id)
);

-- Creator settings and preferences
CREATE TABLE creator_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(255) UNIQUE NOT NULL,
    quest_templates JSONB,
    reward_settings JSONB,
    notification_preferences JSONB,
    analytics_settings JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own quests
CREATE POLICY "Users can view own quests" ON user_quests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quests" ON user_quests
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own referrals
CREATE POLICY "Users can view own referrals" ON referrals
    FOR SELECT USING (auth.uid() = referrer_id);

-- Users can only see their own achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Guild members can view their guild data
CREATE POLICY "Guild members can view guild data" ON guilds
    FOR SELECT USING (
        id IN (
            SELECT guild_id FROM guild_members
            WHERE user_id = auth.uid()
        )
    );

-- Guild members can view their guild member data
CREATE POLICY "Guild members can view member data" ON guild_members
    FOR SELECT USING (
        guild_id IN (
            SELECT guild_id FROM guild_members
            WHERE user_id = auth.uid()
        )
    );
```

### Real-time Subscriptions Setup

```sql
-- Add real-time publication for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE user_quests;
ALTER PUBLICATION supabase_realtime ADD TABLE referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE guilds;
ALTER PUBLICATION supabase_realtime ADD TABLE guild_members;
```

### Database Functions

```sql
-- Function to calculate user level based on XP
CREATE OR REPLACE FUNCTION calculate_level(xp BIGINT)
RETURNS INTEGER AS $$
DECLARE
    level INTEGER := 1;
    xp_required BIGINT := 100;
BEGIN
    WHILE xp >= xp_required LOOP
        level := level + 1;
        xp_required := xp_required * 15; -- 15% increase per level
    END LOOP;
    RETURN level - 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update user stats on new referral
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        total_referrals = total_referrals + 1,
        total_commission = total_commission + COALESCE(NEW.commission_amount, 0),
        experience_points = experience_points + COALESCE(NEW.commission_amount, 0) * 100,
        level = calculate_level(experience_points + COALESCE(NEW.commission_amount, 0) * 100),
        updated_at = NOW()
    WHERE id = NEW.referrer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic stat updates
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();
```

---

## Backend Architecture

### Supabase Integration Layer

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser-side use (RLS enforced)
export const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Service client for server-side use (bypasses RLS)
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Real-time subscriptions setup
export const setupRealtimeSubscriptions = (userId: string) => {
  const channel = supabase
    .channel('user-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_quests',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Quest update received:', payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'referrals',
        filter: `referrer_id=eq.${userId}`
      },
      (payload) => {
        console.log('Referral update received:', payload);
      }
    )
    .subscribe();

  return channel;
};
```

### API Routes Structure

```
app/api/
├── auth/
│   └── callback/      # Whop auth callback
├── webhooks/
│   └── whop/          # Whop webhook handler
├── users/
│   ├── profile/       # User profile management
│   └── progress/      # User progress tracking
├── quests/
│   ├── active/        # Active quests
│   └── complete/      # Quest completion
├── referrals/
│   ├── track/         # Referral tracking
│   └── stats/         # Referral statistics
├── guilds/
│   ├── create/        # Guild creation
│   └── manage/        # Guild management
└── analytics/
    ├── user/          # User analytics
    └── creator/       # Creator analytics
```

### Webhook Processing Service

```typescript
// app/api/webhooks/whop/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { verifyWhopWebhook } from '@/lib/webhook-verification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature
    const isValid = await verifyWhopWebhook(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 });
    }

    // Handle different webhook events
    switch (body.type) {
      case 'payment_affiliate_reward_created':
        await handleAffiliateReward(body.data);
        break;
      case 'membership_went_valid':
        await handleMembershipValid(body.data);
        break;
      default:
        console.log('Unhandled webhook type:', body.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleAffiliateReward(data: any) {
  const { affiliateUserId, amount, paymentId } = data;

  // Find user by Whop user ID
  const { data: user, error } = await supabaseService
    .from('users')
    .select('id')
    .eq('whop_user_id', affiliateUserId)
    .single();

  if (error || !user) {
    console.error('User not found for affiliate reward:', affiliateUserId);
    return;
  }

  // Create referral record
  await supabaseService
    .from('referrals')
    .insert({
      referrer_id: user.id,
      company_id: data.companyId,
      commission_amount: amount,
      whop_payment_id: paymentId,
      status: 'completed'
    });

  // Update quest progress
  await supabaseService.rpc('update_quest_progress', {
    user_id: user.id,
    quest_type: 'referrals',
    progress_value: 1
  });
}
```

### Edge Functions for Complex Logic

```typescript
// supabase/functions/process-quest-completion/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';

serve(async (req) => {
  const { userId, questId } = await req.json();

  // Get quest details
  const questResponse = await fetch(`${SupabaseUrl}/rest/v1/quests?id=eq.${questId}`, {
    headers: { apikey: SupabaseServiceKey }
  });

  const quest = await questResponse.json();

  // Calculate rewards with multipliers
  const baseXP = quest[0].reward_xp;
  const baseCommission = quest[0].reward_commission;

  // Get user character class for multipliers
  const userResponse = await fetch(`${SupabaseUrl}/rest/v1/users?id=eq.${userId}`, {
    headers: { apikey: SupabaseServiceKey }
  });

  const user = await userResponse.json();
  const characterClass = user[0].character_class;

  // Apply character class multipliers
  const finalXP = Math.floor(baseXP * getClassMultiplier(characterClass, 'xp'));
  const finalCommission = baseCommission * getClassMultiplier(characterClass, 'commission');

  // Update user stats
  await fetch(`${SupabaseUrl}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { apikey: SupabaseServiceKey },
    body: JSON.stringify({
      experience_points: `experience_points + ${finalXP}`,
      total_commission: `total_commission + ${finalCommission}`
    })
  });

  return new Response(JSON.stringify({ success: true, xp: finalXP, commission: finalCommission }));
});
```

---

## Frontend Architecture

### React Component Structure with Frosted UI

```
src/components/
├── common/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── UI/
│   │   ├── FrostedCard.tsx
│   │   ├── FrostedButton.tsx
│   │   ├── FrostedProgress.tsx
│   │   └── FrostedBadge.tsx
│   └── Loading/
│       ├── Spinner.tsx
│       └── Skeleton.tsx
├── features/
│   ├── auth/
│   │   ├── Login.tsx
│   │   └── Callback.tsx
│   ├── character/
│   │   ├── Selection.tsx
│   │   ├── Profile.tsx
│   │   └── Customization.tsx
│   ├── quests/
│   │   ├── QuestLog.tsx
│   │   ├── QuestDetails.tsx
│   │   └── QuestProgress.tsx
│   ├── referrals/
│   │   ├── Dashboard.tsx
│   │   ├── Stats.tsx
│   │   └── Leaderboard.tsx
│   └── guilds/
│       ├── GuildList.tsx
│       ├── GuildDetails.tsx
│       └── GuildManagement.tsx
├── creator/
│   ├── dashboard/
│   │   ├── Overview.tsx
│   │   ├── Analytics.tsx
│   │   └── Members.tsx
│   ├── quests/
│   │   ├── CreatorQuestList.tsx
│   │   ├── QuestBuilder.tsx
│   │   └── QuestTemplates.tsx
│   └── settings/
│       ├── Preferences.tsx
│       └── Integrations.tsx
└── hooks/
    ├── useAuth.ts
    ├── useRealtime.ts
    ├── useQuests.ts
    └── useUserProgress.ts
```

### State Management with Redux Toolkit

```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authSlice } from './slices/auth';
import { userSlice } from './slices/user';
import { questsSlice } from './slices/quests';
import { referralsSlice } from './slices/referrals';
import { supabaseApi } from './services/supabase';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    user: userSlice.reducer,
    quests: questsSlice.reducer,
    referrals: referralsSlice.reducer,
    [supabaseApi.reducerPath]: supabaseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(supabaseApi.middleware),
});

setupListeners(store.dispatch);

// store/slices/user.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { supabaseApi } from '../services/supabase';

interface UserState {
  currentUser: any;
  characterClass: string;
  level: number;
  experiencePoints: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  characterClass: '',
  level: 1,
  experiencePoints: 0,
  isLoading: false,
  error: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<any>) => {
      state.currentUser = action.payload;
      state.characterClass = action.payload.character_class;
      state.level = action.payload.level;
      state.experiencePoints = action.payload.experience_points;
    },
    updateProgress: (state, action: PayloadAction<{ xp: number; level: number }>) => {
      state.experiencePoints += action.payload.xp;
      state.level = action.payload.level;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(supabaseApi.endpoints.getUser.matchPending, (state) => {
        state.isLoading = true;
      })
      .addMatcher(supabaseApi.endpoints.getUser.matchFulfilled, (state, action) => {
        state.isLoading = false;
        state.currentUser = action.payload;
      })
      .addMatcher(supabaseApi.endpoints.getUser.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});

export const { setUser, updateProgress, setLoading, setError } = userSlice.actions;
```

### Real-time Data Hooks

```typescript
// hooks/useRealtime.ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { store } from '@/store';

export const useRealtime = (userId: string) => {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) return;

    // Set up real-time subscriptions
    channelRef.current = supabase
      .channel(`user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_quests',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          store.dispatch({ type: 'quests/questUpdated', payload });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${userId}`
        },
        (payload) => {
          store.dispatch({ type: 'referrals/referralUpdated', payload });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          store.dispatch({ type: 'user/achievementUnlocked', payload });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId]);
};

// hooks/useQuests.ts
import { useQuery } from '@reduxjs/toolkit/query/react';
import { supabaseApi } from '@/store/services/supabase';

export const useQuests = (userId: string) => {
  return useQuery({
    queryKey: ['quests', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_quests')
        .select(`
          *,
          quest:quests(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};
```

### Frosted UI Component Integration

```typescript
// components/common/UI/FrostedCard.tsx
import React from 'react';
import { Card } from '@frosted/ui/components/Card';
import { cn } from '@/lib/utils';

interface FrostedCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated';
  interactive?: boolean;
  onClick?: () => void;
}

export const FrostedCard: React.FC<FrostedCardProps> = ({
  children,
  className,
  variant = 'default',
  interactive = false,
  onClick,
}) => {
  const variants = {
    default: 'bg-white/80 backdrop-blur-sm border border-white/20',
    glass: 'bg-white/60 backdrop-blur-md border border-white/30 shadow-lg',
    elevated: 'bg-white/90 backdrop-blur-sm border border-white/20 shadow-xl',
  };

  return (
    <Card
      className={cn(
        'transition-all duration-300',
        variants[variant],
        interactive && 'cursor-pointer hover:scale-[1.02] hover:shadow-xl',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  );
};

// components/features/character/Selection.tsx
import React from 'react';
import { useAppDispatch } from '@/store';
import { setSelectedClass } from '@/store/slices/user';
import { FrostedCard } from '@/components/common/UI/FrostedCard';
import { FrostedButton } from '@/components/common/UI/FrostedButton';

interface CharacterClass {
  id: string;
  name: string;
  displayName: string;
  description: string;
  baseXpMultiplier: number;
  commissionMultiplier: number;
  abilities: string[];
}

const characterClasses: CharacterClass[] = [
  {
    id: 'scout',
    name: 'scout',
    displayName: 'Scout',
    description: 'Fast and efficient referral specialist with 1.2x XP multiplier',
    baseXpMultiplier: 1.2,
    commissionMultiplier: 1.0,
    abilities: ['Fast Tracking', 'Network Analysis', 'Quick Conversion']
  },
  {
    id: 'sage',
    name: 'sage',
    displayName: 'Sage',
    description: 'Wisdom-driven approach with 1.1x XP and quest bonuses',
    baseXpMultiplier: 1.1,
    commissionMultiplier: 1.05,
    abilities: ['Quest Mastery', 'Insightful Analysis', 'Knowledge Network']
  },
  {
    id: 'champion',
    name: 'champion',
    displayName: 'Champion',
    description: 'High-impact specialist with 1.3x XP multiplier',
    baseXpMultiplier: 1.3,
    commissionMultiplier: 1.0,
    abilities: ['Charismatic Influence', 'Network Expansion', 'Conversion Mastery']
  }
];

export const CharacterSelection: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedClass, setSelectedClass] = React.useState<string>('');

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
    dispatch(setSelectedClass(classId));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-gradient">
        Choose Your Legend
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {characterClasses.map((charClass) => (
          <FrostedCard
            key={charClass.id}
            variant="glass"
            interactive
            className={`p-6 border-2 transition-all ${
              selectedClass === charClass.id
                ? 'border-purple-500 shadow-purple-500/25'
                : 'border-transparent'
            }`}
            onClick={() => handleClassSelect(charClass.id)}
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚔️</span>
              </div>

              <h3 className="text-xl font-bold mb-2">{charClass.displayName}</h3>
              <p className="text-gray-600 mb-4 text-sm">{charClass.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>XP Multiplier:</span>
                  <span className="font-bold text-purple-600">
                    {charClass.baseXpMultiplier}x
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Commission:</span>
                  <span className="font-bold text-blue-600">
                    {charClass.commissionMultiplier}x
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">Abilities:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {charClass.abilities.map((ability, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1 h-1 bg-purple-500 rounded-full mr-2"></span>
                      {ability}
                    </li>
                  ))}
                </ul>
              </div>

              <FrostedButton
                variant={selectedClass === charClass.id ? 'primary' : 'secondary'}
                className="w-full"
              >
                {selectedClass === charClass.id ? 'Selected' : 'Select'}
              </FrostedButton>
            </div>
          </FrostedCard>
        ))}
      </div>
    </div>
  );
};
```

---

## Real-time Features

### Supabase Realtime + Custom WebSocket Service

```typescript
// lib/websocket.ts
import { WebSocketServer } from 'ws';
import { supabase } from './supabase';

interface WebSocketMessage {
  type: string;
  data: any;
  userId: string;
  roomId?: string;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const userId = this.getUserIdFromRequest(req);
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      this.clients.set(userId, ws);

      ws.on('message', async (message: string) => {
        try {
          const data: WebSocketMessage = JSON.parse(message);
          await this.handleMessage(userId, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(userId);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        data: { userId, timestamp: Date.now() }
      }));
    });
  }

  private async handleMessage(userId: string, message: WebSocketMessage) {
    switch (message.type) {
      case 'join_room':
        await this.handleJoinRoom(userId, message.data);
        break;
      case 'quest_progress':
        await this.handleQuestProgress(userId, message.data);
        break;
      case 'leaderboard_request':
        await this.handleLeaderboardRequest(userId);
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  private async handleJoinRoom(userId: string, data: any) {
    // Add user to room for group notifications
    const room = `room_${data.roomId}`;

    // Notify room members
    this.broadcastToRoom(room, {
      type: 'user_joined',
      data: { userId, username: data.username },
      userId
    });
  }

  private async handleQuestProgress(userId: string, data: any) {
    // Update quest progress in database
    const { data: updatedQuest, error } = await supabase
      .from('user_quests')
      .update({ progress_value: data.progress })
      .eq('user_id', userId)
      .eq('quest_id', data.questId)
      .select()
      .single();

    if (error) {
      this.sendToUser(userId, {
        type: 'error',
        data: { message: 'Failed to update quest progress' }
      });
      return;
    }

    // Broadcast quest progress to user's room
    this.broadcastToRoom(`user_${userId}`, {
      type: 'quest_progress_updated',
      data: updatedQuest,
      userId
    });

    // Check if quest is completed
    if (updatedQuest.progress_value >= updatedQuest.quest.target_value) {
      await this.handleQuestCompletion(userId, updatedQuest);
    }
  }

  private async handleQuestCompletion(userId: string, quest: any) {
    // Update quest status
    const { data: completedQuest, error } = await supabase
      .from('user_quests')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', quest.id)
      .select()
      .single();

    if (error) return;

    // Award rewards
    const { data: user, error: userError } = await supabase
      .from('users')
      .update({
        experience_points: `experience_points + ${completedQuest.quest.reward_xp}`,
        total_commission: `total_commission + ${completedQuest.quest.reward_commission}`
      })
      .eq('id', userId)
      .select()
      .single();

    // Broadcast completion event
    this.broadcastToRoom(`user_${userId}`, {
      type: 'quest_completed',
      data: {
        quest: completedQuest,
        rewards: {
          xp: completedQuest.quest.reward_xp,
          commission: completedQuest.quest.reward_commission
        }
      },
      userId
    });

    // Check for achievements
    await this.checkAndAwardAchievements(userId);
  }

  private async checkAndAwardAchievements(userId: string) {
    // Logic to check and award achievements based on user progress
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Check for level-based achievements
    const levelAchievements = await supabase
      .from('achievements')
      .select('*')
      .eq('category', 'level')
      .lte('requirements->>level', user.level);

    for (const achievement of levelAchievements) {
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id)
        .single();

      if (!existing) {
        await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id
          });

        this.broadcastToRoom(`user_${userId}`, {
          type: 'achievement_unlocked',
          data: achievement,
          userId
        });
      }
    }
  }

  private sendToUser(userId: string, message: any) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  private broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
    // This would typically use a room-based broadcasting system
    // For simplicity, we'll implement a basic version
    this.clients.forEach((client, userId) => {
      if (userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private getUserIdFromRequest(req: any): string | null {
    // Extract user ID from request (would use JWT or session)
    return req.headers['x-user-id'] || null;
  }
}
```

### Real-time React Hooks

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';

interface WebSocketHook {
  sendMessage: (message: any) => void;
  lastMessage: any;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

export const useWebSocket = (userId: string): WebSocketHook => {
  const ws = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = React.useState<any>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      setConnectionStatus('connecting');

      ws.current = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}?userId=${userId}`);

      ws.current.onopen = () => {
        setConnectionStatus('connected');
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      };

      ws.current.onclose = () => {
        setConnectionStatus('disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [userId]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  return { sendMessage, lastMessage, connectionStatus };
};

// hooks/useRealtimeQuests.ts
import { useWebSocket } from './useWebSocket';
import { useQueryClient } from '@tanstack/react-query';

export const useRealtimeQuests = (userId: string) => {
  const { sendMessage, lastMessage } = useWebSocket(userId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'quest_progress_updated':
        queryClient.setQueryData(['quests', userId], (oldData: any) => {
          if (!oldData) return oldData;

          return oldData.map((quest: any) =>
            quest.id === lastMessage.data.id ? lastMessage.data : quest
          );
        });
        break;

      case 'quest_completed':
        // Show completion notification
        queryClient.invalidateQueries(['quests', userId]);
        queryClient.invalidateQueries(['user', userId]);

        // Show completion modal
        break;

      case 'achievement_unlocked':
        queryClient.invalidateQueries(['achievements', userId]);
        break;
    }
  }, [lastMessage, queryClient, userId]);

  const updateQuestProgress = useCallback((questId: string, progress: number) => {
    sendMessage({
      type: 'quest_progress',
      data: { questId, progress }
    });
  }, [sendMessage]);

  return { updateQuestProgress, lastQuestEvent: lastMessage };
};
```

---

## Caching Strategy

### Redis Integration with Supabase

```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export default redis;

// Cache helpers
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userQuests: (userId: string) => `user:${userId}:quests`,
  userProgress: (userId: string) => `user:${userId}:progress`,
  leaderboard: (companyId: string, type: string) => `leaderboard:${companyId}:${type}`,
  guild: (guildId: string) => `guild:${guildId}`,
  creatorStats: (companyId: string) => `creator:${companyId}:stats`,
};

export const cacheTTL = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 3600, // 1 hour
  veryLong: 86400, // 24 hours
};

// Cache wrapper functions
export const getCachedData = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = cacheTTL.medium
): Promise<T> => {
  try {
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const data = await fetchFn();

    // Cache the result
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('Cache error:', error);
    return fetchFn(); // Fallback to direct fetch
  }
};

export const invalidateCache = async (keys: string[]) => {
  try {
    await redis.del(...keys);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

// Cache invalidation strategies
export const invalidateUserCache = async (userId: string) => {
  const keys = [
    cacheKeys.user(userId),
    cacheKeys.userQuests(userId),
    cacheKeys.userProgress(userId),
  ];
  await invalidateCache(keys);
};

export const invalidateLeaderboardCache = async (companyId: string) => {
  const keys = [
    cacheKeys.leaderboard(companyId, 'referrals'),
    cacheKeys.leaderboard(companyId, 'level'),
    cacheKeys.leaderboard(companyId, 'commission'),
  ];
  await invalidateCache(keys);
};
```

### Database Query Optimization with Caching

```typescript
// lib/queries.ts
import { supabase } from './supabase';
import { getCachedData, invalidateUserCache } from './redis';

export const queries = {
  // User queries with caching
  getUser: async (userId: string) => {
    return getCachedData(
      cacheKeys.user(userId),
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return data;
      },
      cacheTTL.medium
    );
  },

  getUserQuests: async (userId: string) => {
    return getCachedData(
      cacheKeys.userQuests(userId),
      async () => {
        const { data, error } = await supabase
          .from('user_quests')
          .select(`
            *,
            quest:quests(*)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      cacheTTL.short
    );
  },

  getLeaderboard: async (companyId: string, type: 'referrals' | 'level' | 'commission') => {
    return getCachedData(
      cacheKeys.leaderboard(companyId, type),
      async () => {
        let query = supabase
          .from('users')
          .select('id, username, level, total_referrals, total_commission, avatar_url')
          .eq('company_id', companyId)
          .order(type, { ascending: false })
          .limit(100);

        const { data, error } = await query;
        if (error) throw error;
        return data;
      },
      cacheTTL.short
    );
  },

  // Optimized referral tracking
  getReferralStats: async (userId: string) => {
    return getCachedData(
      cacheKeys.userProgress(userId),
      async () => {
        const { data, error } = await supabase
          .from('referrals')
          .select('status, commission_amount, created_at')
          .eq('referrer_id', userId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        if (error) throw error;

        const stats = {
          totalReferrals: data.length,
          completedReferrals: data.filter(r => r.status === 'completed').length,
          totalCommission: data.reduce((sum, r) => sum + Number(r.commission_amount), 0),
          monthlyGrowth: this.calculateMonthlyGrowth(data),
        };

        return stats;
      },
      cacheTTL.medium
    );
  },

  calculateMonthlyGrowth: (referrals: any[]) => {
    // Calculate growth rate over the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentReferrals = referrals.filter(r =>
      new Date(r.created_at) >= thirtyDaysAgo
    );

    return recentReferrals.length;
  },
};

// Event-based cache invalidation
export const setupCacheInvalidation = () => {
  // Invalidate user cache when user data changes
  supabase
    .channel('user-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users'
      },
      (payload) => {
        invalidateUserCache(payload.new.id);
      }
    )
    .subscribe();

  // Invalidate leaderboard cache when referrals change
  supabase
    .channel('referral-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'referrals'
      },
      (payload) => {
        // This would need to be enhanced to get company_id
        invalidateLeaderboardCache(payload.new.company_id);
      }
    )
    .subscribe();
};
```

---

## API Design

### RESTful API with Supabase Integration

```typescript
// app/api/users/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { queries } from '@/lib/queries';
import { invalidateUserCache } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const progress = await queries.getUserQuests(userId);
    const stats = await queries.getReferralStats(userId);

    return NextResponse.json({
      quests: progress,
      stats: stats,
    });
  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, questId, progress } = await request.json();

    if (!userId || !questId) {
      return NextResponse.json({ error: 'User ID and Quest ID required' }, { status: 400 });
    }

    // Update quest progress
    const { data: updatedQuest, error } = await supabaseService
      .from('user_quests')
      .update({ progress_value: progress })
      .eq('user_id', userId)
      .eq('quest_id', questId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invalidate cache
    await invalidateUserCache(userId);

    return NextResponse.json({ success: true, quest: updatedQuest });
  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { queries } from '@/lib/queries';
import { invalidateLeaderboardCache } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type') || 'referrals';

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const leaderboard = await queries.getLeaderboard(companyId, type as any);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// app/api/quests/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { invalidateUserCache } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { userId, questId } = await request.json();

    if (!userId || !questId) {
      return NextResponse.json({ error: 'User ID and Quest ID required' }, { status: 400 });
    }

    // Get quest details
    const { data: userQuest, error: questError } = await supabaseService
      .from('user_quests')
      .select(`
        *,
        quest:quests(*)
      `)
      .eq('user_id', userId)
      .eq('quest_id', questId)
      .single();

    if (questError || !userQuest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    // Check if quest is already completed
    if (userQuest.is_completed) {
      return NextResponse.json({ error: 'Quest already completed' }, { status: 400 });
    }

    // Check if progress meets requirements
    if (userQuest.progress_value < userQuest.quest.target_value) {
      return NextResponse.json({ error: 'Quest requirements not met' }, { status: 400 });
    }

    // Mark quest as completed
    const { data: completedQuest, error: completeError } = await supabaseService
      .from('user_quests')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', userQuest.id)
      .select()
      .single();

    if (completeError) {
      return NextResponse.json({ error: completeError.message }, { status: 500 });
    }

    // Award rewards
    const { data: user, error: userError } = await supabaseService
      .from('users')
      .update({
        experience_points: `experience_points + ${userQuest.quest.reward_xp}`,
        total_commission: `total_commission + ${userQuest.quest.reward_commission}`
      })
      .eq('id', userId)
      .select()
      .single();

    // Invalidate user cache
    await invalidateUserCache(userId);

    return NextResponse.json({
      success: true,
      quest: completedQuest,
      rewards: {
        xp: userQuest.quest.reward_xp,
        commission: userQuest.quest.reward_commission,
        newLevel: user.level,
        newXP: user.experience_points
      }
    });
  } catch (error) {
    console.error('Quest completion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Supabase Edge Functions for Complex Operations

```typescript
// supabase/functions/calculate-rankings/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();

    // Calculate rankings for different categories
    const rankings = await calculateRankings(companyId);

    // Cache the results
    await cacheRankings(companyId, rankings);

    return new Response(JSON.stringify(rankings), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

async function calculateRankings(companyId: string) {
  // This would call the Supabase database to calculate rankings
  // For now, return mock data
  return {
    referrals: await getTopReferrers(companyId),
    level: await getTopLevels(companyId),
    commission: await getTopCommissions(companyId),
    guilds: await getTopGuilds(companyId),
  };
}

async function getTopReferrers(companyId: string) {
  const response = await fetch(`${SupabaseUrl}/rest/v1/users?select=id,username,total_referrals,avatar_url&company_id=eq.${companyId}&order=total_referrals.desc&limit=10`, {
    headers: { apikey: SupabaseServiceKey }
  });

  return await response.json();
}
```

---

## Security Architecture

### Supabase RLS + Whop Authentication

```typescript
// lib/auth.ts
import { createClient } from '@supabase/supabase-js';
import { verifyWhopToken } from '@whop/sdk';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthUser {
  id: string;
  whopUserId: string;
  companyId: string;
  email?: string;
  username: string;
  role: 'creator' | 'community_member';
}

export const authenticateUser = async (request: NextRequest): Promise<AuthUser | null> => {
  try {
    // Get Whop token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // Verify Whop token
    const whopUser = await verifyWhopToken(token);
    if (!whopUser) {
      return null;
    }

    // Check if user exists in our database
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('whop_user_id', whopUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error);
      return null;
    }

    // Create user if doesn't exist
    if (!existingUser) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          whop_user_id: whopUser.id,
          company_id: whopUser.companyId,
          username: whopUser.username || whopUser.email,
          email: whopUser.email,
        })
        .select()
        .single();

      if (createError) {
        console.error('User creation error:', createError);
        return null;
      }

      return {
        id: newUser.id,
        whopUserId: newUser.whop_user_id,
        companyId: newUser.company_id,
        email: newUser.email,
        username: newUser.username,
        role: 'community_member',
      };
    }

    return {
      id: existingUser.id,
      whopUserId: existingUser.whop_user_id,
      companyId: existingUser.company_id,
      email: existingUser.email,
      username: existingUser.username,
      role: 'community_member',
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

export const authorizeCreator = async (request: NextRequest, companyId: string): Promise<boolean> => {
  const user = await authenticateUser(request);
  if (!user) return false;

  // Check if user is a creator for this company
  // This would typically involve checking against a creator permissions table
  // For now, we'll assume the user is a creator if they're accessing creator endpoints
  return user.companyId === companyId;
};

// Middleware for API routes
export const withAuth = (handler: (req: NextRequest, user: AuthUser) => Promise<Response>) => {
  return async (req: NextRequest) => {
    const user = await authenticateUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    return handler(req, user);
  };
};

export const withCreatorAuth = (handler: (req: NextRequest, user: AuthUser) => Promise<Response>) => {
  return async (req: NextRequest) => {
    const user = await authenticateUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId') || '';

    if (!await authorizeCreator(req, companyId)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    return handler(req, user);
  };
};
```

### RLS Policies for Data Security

```sql
-- Enhanced RLS policies for creator/community member separation

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = whop_user_id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = whop_user_id);

-- Quest visibility based on company and user
CREATE POLICY "Users can view company quests" ON quests
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users
            WHERE auth.uid()::text = whop_user_id
        )
    );

CREATE POLICY "Creators can manage company quests" ON quests
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users
            WHERE auth.uid()::text = whop_user_id
            AND EXISTS (
                SELECT 1 FROM creator_permissions
                WHERE user_id = auth.uid()::text AND role = 'creator'
            )
        )
    );

-- Referrals are private to users
CREATE POLICY "Users can view own referrals" ON referrals
    FOR SELECT USING (auth.uid()::text = (
        SELECT whop_user_id FROM users
        WHERE users.id = referrals.referrer_id
    ));

-- Guild members can see guild data
CREATE POLICY "Guild members can view guild data" ON guilds
    FOR SELECT USING (
        id IN (
            SELECT guild_id FROM guild_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Guild members can view member data" ON guild_members
    FOR SELECT USING (
        guild_id IN (
            SELECT guild_id FROM guild_members
            WHERE user_id = auth.uid()
        )
    );

-- Creator analytics access
CREATE POLICY "Creators can view company analytics" ON creator_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users
            WHERE auth.uid()::text = whop_user_id
            AND EXISTS (
                SELECT 1 FROM creator_permissions
                WHERE user_id = auth.uid()::text AND role = 'creator'
            )
        )
    );
```

---

## Performance Strategy

### Supabase Optimization Techniques

```typescript
// lib/performance.ts
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export class OptimizedQueries {
  // Select only needed columns
  static optimizedUserQuery(supabase: any, userId: string) {
    return supabase
      .from('users')
      .select(`
        id,
        username,
        character_class,
        level,
        experience_points,
        total_referrals,
        total_commission,
        avatar_url
      `)
      .eq('id', userId)
      .single();
  }

  // Use pagination for large datasets
  static paginatedLeaderboard(supabase: any, companyId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    return supabase
      .from('users')
      .select('id, username, level, total_referrals, total_commission, avatar_url', { count: 'exact' })
      .eq('company_id', companyId)
      .order('total_referrals', { ascending: false })
      .range(offset, offset + limit - 1);
  }

  // Use indexes effectively
  static optimizedQuestQuery(supabase: any, userId: string) {
    return supabase
      .from('user_quests')
      .select(`
        id,
        progress_value,
        is_completed,
        quest:quests(id, title, description, quest_type, difficulty, target_value, reward_xp)
      `)
      .eq('user_id', userId)
      .in('quest_type', ['daily', 'weekly'])
      .eq('is_completed', false)
      .order('created_at', { ascending: false });
  }

  // Batch operations for better performance
  static batchUpdateQuestProgress(supabase: any, updates: Array<{userId: string, questId: string, progress: number}>) {
    const operations = updates.map(update =>
      supabase
        .from('user_quests')
        .update({ progress_value: update.progress })
        .eq('user_id', update.userId)
        .eq('quest_id', update.questId)
    );

    return Promise.all(operations);
  }
}

// Connection pooling and query optimization
export const connectionPool = {
  // Configure connection pool settings
  maxConnections: 20,
  idleTimeout: 30000,
  maxLifetime: 3600000,
};

// Query performance monitoring
export const queryMonitor = {
  slowQueryThreshold: 1000, // 1 second

  logSlowQuery: (query: string, duration: number) => {
    if (duration > queryMonitor.slowQueryThreshold) {
      console.warn(`Slow query detected (${duration}ms):`, query);
    }
  },
};
```

### Frontend Performance Optimization

```typescript
// lib/performance-frontend.ts
import { useEffect, useRef, useCallback } from 'react';

// Image optimization with Supabase Storage
export const getOptimizedImageUrl = (url: string, options: {
  width?: number;
  height?: number;
  quality?: number;
} = {}) => {
  const params = new URLSearchParams();

  if (options.width) params.set('width', options.width.toString());
  if (options.height) params.set('height', options.height.toString());
  if (options.quality) params.set('quality', options.quality.toString());

  return `${url}?${params.toString()}`;
};

// Lazy loading for images and components
export const useIntersectionObserver = (
  elementRef: React.RefObject<Element>,
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) => {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(callback, options);
    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef, callback, options]);
};

// Debounced search for better performance
export const useDebouncedSearch = (delay: number = 300) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debounce = useCallback((func: Function, ...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      func(...args);
    }, delay);
  }, [delay]);

  return debounce;
};

// Virtual scrolling for large lists
export const useVirtualScroll = (
  items: any[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
};

// Performance monitoring
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Monitor page load performance
    if (typeof window !== 'undefined') {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation.loadEventEnd - navigation.loadEventStart > 2000) {
        console.warn('Slow page load detected:', {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        });
      }
    }

    // Monitor API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const response = await originalFetch(...args);
      const end = performance.now();

      if (end - start > 1000) {
        console.warn('Slow API call:', {
          url: args[0],
          duration: end - start,
        });
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);
};
```

---

## Deployment Architecture

### Vercel Deployment with Supabase

```yaml
# vercel.json
{
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
      "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_key",
      "NEXT_PUBLIC_WS_URL": "@websocket_url",
      "UPSTASH_REDIS_URL": "@upstash_redis_url",
      "UPSTASH_REDIS_TOKEN": "@upstash_redis_token",
      "WHOP_APP_ID": "@whop_app_id",
      "WHOP_API_KEY": "@whop_api_key"
    }
  },
  "functions": {
    "app/api/webhooks/**": {
      "maxDuration": 30
    },
    "app/api/analytics/**": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/daily-quests",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/leaderboard-cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/cache-warmup",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### CI/CD Pipeline with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:unit
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build
      env:
        NODE_ENV: production

    - name: Deploy to Vercel
      uses: vercel/action@v1
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

    - name: Run database migrations
      run: npm run db:migrate
      env:
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}

    - name: Warm up cache
      run: npm run cache:warmup
      env:
        UPSTASH_REDIS_URL: ${{ secrets.UPSTASH_REDIS_URL }}
        UPSTASH_REDIS_TOKEN: ${{ secrets.UPSTASH_REDIS_TOKEN }}
```

### Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
NEXT_PUBLIC_WS_URL=your-websocket-url
UPSTASH_REDIS_URL=your-upstash-redis-url
UPSTASH_REDIS_TOKEN=your-upstash-redis-token
WHOP_APP_ID=your-whop-app-id
WHOP_API_KEY=your-whop-api-key
NEXT_PUBLIC_WHOP_APP_ID=your-whop-app-id
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your-whop-agent-user-id
NEXT_PUBLIC_WHOP_COMPANY_ID=your-whop-company-id
```

---

## Testing Strategy

### Comprehensive Testing with Supabase

```typescript
// tests/setup.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

// Test database setup
export const testSupabase = createClient(
  process.env.SUPABASE_TEST_URL!,
  process.env.SUPABASE_TEST_SERVICE_KEY!
);

// Test Redis setup
export const testRedis = new Redis({
  url: process.env.UPSTASH_REDIS_TEST_URL!,
  token: process.env.UPSTASH_REDIS_TEST_TOKEN!,
});

// Test data factory
export const testFactories = {
  createUser: async (overrides = {}) => {
    const userData = {
      whop_user_id: `test_${Math.random()}`,
      company_id: 'test_company',
      username: `testuser_${Math.random()}`,
      character_class: 'scout',
      level: 1,
      experience_points: 0,
      ...overrides,
    };

    const { data, error } = await testSupabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  createQuest: async (overrides = {}) => {
    const questData = {
      company_id: 'test_company',
      title: 'Test Quest',
      description: 'Test quest description',
      quest_type: 'daily',
      difficulty: 'easy',
      target_type: 'referrals',
      target_value: 5,
      reward_xp: 100,
      reward_commission: 10.00,
      ...overrides,
    };

    const { data, error } = await testSupabase
      .from('quests')
      .insert(questData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Test utilities
export const testUtils = {
  cleanupDatabase: async () => {
    // Clean up test data
    await testSupabase.from('user_quests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await testSupabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await testSupabase.from('quests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  },

  cleanupRedis: async () => {
    await testRedis.flushdb();
  },
};

// tests/api/users.progress.test.ts
import { testSupabase, testFactories, testUtils } from '../setup';

describe('User Progress API', () => {
  beforeEach(async () => {
    await testUtils.cleanupDatabase();
    await testUtils.cleanupRedis();
  });

  afterEach(async () => {
    await testUtils.cleanupDatabase();
    await testUtils.cleanupRedis();
  });

  describe('GET /api/users/progress', () => {
    it('should return user progress data', async () => {
      const user = await testFactories.createUser();
      const quest = await testFactories.createQuest();

      // Create user quest
      await testSupabase.from('user_quests').insert({
        user_id: user.id,
        quest_id: quest.id,
        progress_value: 3,
      });

      const response = await fetch(`/api/users/progress?userId=${user.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.quests).toHaveLength(1);
      expect(data.quests[0].progress_value).toBe(3);
    });

    it('should return 400 for missing userId', async () => {
      const response = await fetch('/api/users/progress');

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('User ID required');
    });
  });

  describe('POST /api/users/progress', () => {
    it('should update quest progress', async () => {
      const user = await testFactories.createUser();
      const quest = await testFactories.createQuest();

      // Create user quest
      await testSupabase.from('user_quests').insert({
        user_id: user.id,
        quest_id: quest.id,
        progress_value: 0,
      });

      const response = await fetch('/api/users/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          questId: quest.id,
          progress: 5,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.quest.progress_value).toBe(5);
    });

    it('should return 400 for invalid progress', async () => {
      const response = await fetch('/api/users/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'invalid-id',
          questId: 'invalid-quest',
          progress: -1,
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});

// tests/components/CharacterSelection.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterSelection } from '@/components/features/character/Selection';
import { Provider } from 'react-redux';
import { store } from '@/store';

describe('CharacterSelection', () => {
  it('should render character selection screen', () => {
    render(
      <Provider store={store}>
        <CharacterSelection />
      </Provider>
    );

    expect(screen.getByText('Choose Your Legend')).toBeInTheDocument();
    expect(screen.getAllByText('Select')).toHaveLength(3);
  });

  it('should allow character selection', () => {
    render(
      <Provider store={store}>
        <CharacterSelection />
      </Provider>
    );

    const scoutCard = screen.getByText('Scout').closest('div');
    fireEvent.click(scoutCard);

    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('should display character abilities', () => {
    render(
      <Provider store={store}>
        <CharacterSelection />
      </Provider>
    );

    expect(screen.getByText('Fast Tracking')).toBeInTheDocument();
    expect(screen.getByText('Quest Mastery')).toBeInTheDocument();
    expect(screen.getByText('Charismatic Influence')).toBeInTheDocument();
  });
});
```

---

## Monitoring & Observability

### Supabase Logs + Custom Monitoring

```typescript
// lib/monitoring.ts
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  log(level: LogEntry['level'], message: string, metadata?: LogEntry['metadata']) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Send to external monitoring service
    this.sendToExternalService(entry);

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, metadata);
    }
  }

  info(message: string, metadata?: LogEntry['metadata']) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: LogEntry['metadata']) {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: LogEntry['metadata']) {
    this.log('error', message, metadata);
  }

  private async sendToExternalService(entry: LogEntry) {
    // Send to monitoring service (e.g., Datadog, Sentry, etc.)
    if (process.env.MONITORING_SERVICE_URL) {
      try {
        await fetch(process.env.MONITORING_SERVICE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
      } catch (error) {
        console.error('Failed to send log to external service:', error);
      }
    }
  }

  getLogs(filter?: {
    level?: LogEntry['level'];
    userId?: string;
    startTime?: string;
    endTime?: string;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }
      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
      }
    }

    return filteredLogs;
  }
}

export const monitoring = new MonitoringService();

// Performance monitoring
export const trackPerformance = (name: string, fn: () => Promise<any>) => {
  const start = performance.now();

  return fn()
    .then(result => {
      const duration = performance.now() - start;
      monitoring.info(`Performance: ${name}`, { duration, success: true });
      return result;
    })
    .catch(error => {
      const duration = performance.now() - start;
      monitoring.error(`Performance: ${name}`, { duration, success: false, error: error.message });
      throw error;
    });
};

// API route monitoring middleware
export const withMonitoring = (handler: (req: NextRequest) => Promise<Response>) => {
  return async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();

    try {
      const response = await handler(req);
      const duration = performance.now() - startTime;

      monitoring.info('API request completed', {
        requestId,
        method: req.method,
        url: req.url,
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      monitoring.error('API request failed', {
        requestId,
        method: req.method,
        url: req.url,
        duration,
        error: error.message,
      });

      throw error;
    }
  };
};

// Business metrics tracking
export const trackBusinessMetric = (metric: string, value: number, tags?: Record<string, string>) => {
  monitoring.info('Business metric', { metric, value, tags });
};

// Usage examples:
// monitoring.info('User logged in', { userId: '123', method: 'oauth' });
// monitoring.error('Database connection failed', { error: 'Connection timeout' });
// trackPerformance('user-query', () => supabase.from('users').select('*'));
// trackBusinessMetric('user_registration', 1, { source: 'web' });
```

### Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { redis } from '@/lib/redis';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
      websocket: 'unknown',
    },
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
  };

  // Check database connectivity
  try {
    const { data, error } = await supabaseService
      .from('users')
      .select('count', { count: 'exact', head: true });

    health.checks.database = error ? 'unhealthy' : 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
  }

  // Check Redis connectivity
  try {
    await redis.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
  }

  // Check WebSocket service (simplified)
  health.checks.websocket = 'healthy'; // Would need actual WebSocket health check

  // Determine overall health
  const unhealthyChecks = Object.values(health.checks).filter(check => check === 'unhealthy');
  health.status = unhealthyChecks.length > 0 ? 'degraded' : 'healthy';

  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 503,
  });
}
```

This comprehensive architecture document provides a complete technical foundation for building Whop Legends using Supabase as the primary database and backend service. The architecture leverages Supabase's managed services to reduce infrastructure overhead while providing scalability, real-time capabilities, and robust security features.

Key benefits of this architecture:

1. **Managed Infrastructure** - Supabase handles database, authentication, and real-time features
2. **Built-in Scalability** - Supabase automatically scales with your usage
3. **Real-time Capabilities** - Built-in WebSocket support for live features
4. **Security** - Row Level Security provides fine-grained access control
5. **Developer Experience** - Auto-generated APIs and TypeScript support
6. **Cost Effective** - Pay only for what you use with transparent pricing

The architecture is designed to support the dual-user experience (Creator oversight + Community Member gamification) while maintaining performance, security, and scalability requirements.
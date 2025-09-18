# Whop Legends Technical Architecture Document

## Executive Summary

Whop Legends is a comprehensive RPG-style referral gamification system built as a Whop iFrame application. This architecture document outlines the technical design for a scalable, high-performance system that transforms standard affiliate marketing into an engaging progression game for creators and their communities.

The system is built on a modern tech stack including Next.js 15, Supabase (PostgreSQL), Redis, and WebSockets, designed to handle the specific requirements of gamification while maintaining seamless integration with the Whop ecosystem.

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
│                    Backend Infrastructure                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   API       │  │   Webhook   │  │   WebSocket  │  │   Redis │ │
│  │  Routes     │  │  Processor  │  │  Server      │  │  Cache  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│           │                    │                    │         │   │
│           ▼                    ▼                    ▼         │   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │         │   │
│  │ PostgreSQL  │  │ PostgreSQL  │  │ PostgreSQL  │  │         │   │
│  │  (Primary)  │  │  (Read Rep) │  │  (Read Rep) │  │         │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  │         │   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Relationships

1. **Whop iFrame Integration**: The application runs within the Whop ecosystem, leveraging the `@whop/react` SDK for authentication and user context
2. **Frontend Layer**: React-based UI with Frosted UI components for consistent design
3. **API Layer**: Next.js API routes handling business logic and data access
4. **Real-time Layer**: WebSocket server for live updates and notifications
5. **Data Layer**: PostgreSQL for transactional data, Redis for caching and session management
6. **External Integration**: Whop webhooks for referral tracking and commission processing

### Key Design Principles

- **Performance First**: All API endpoints designed for <200ms response times
- **Scalability**: Architecture supports viral growth and seasonal spikes
- **Reliability**: Guaranteed webhook processing with retry mechanisms
- **Security**: Zero-trust architecture with proper authentication and authorization
- **Maintainability**: Modular design with clear separation of concerns

---

## Database Architecture

### Database Schema Design

#### Core Tables

```sql
-- Users table for storing community member information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Quests system
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
    INDEX idx_user_quests_user_id (user_id),
    INDEX idx_user_quests_quest_id (quest_id),
    INDEX idx_user_quests_is_completed (is_completed)
);

-- Referrals tracking
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
    whop_affiliate_reward_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    INDEX idx_referrals_referrer_id (referrer_id),
    INDEX idx_referrals_company_id (company_id),
    INDEX idx_referrals_status (status),
    INDEX idx_referrals_created_at (created_at),
    INDEX idx_referrals_referral_code (referral_code)
);

-- Achievements and badges
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(500),
    category VARCHAR(50) NOT NULL,
    requirements JSONB NOT NULL,
    reward_xp INTEGER DEFAULT 0,
    reward_commission DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    INDEX idx_achievements_category (category),
    INDEX idx_achievements_is_active (is_active)
);

-- User achievements tracking
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, achievement_id),
    INDEX idx_user_achievements_user_id (user_id),
    INDEX idx_user_achievements_achievement_id (achievement_id)
);

-- Guilds system (Phase 2)
CREATE TABLE guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    leader_id UUID NOT NULL REFERENCES users(id),
    max_members INTEGER NOT NULL DEFAULT 50,
    current_members INTEGER NOT NULL DEFAULT 1,
    total_xp BIGINT NOT NULL DEFAULT 0,
    guild_level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    INDEX idx_guilds_company_id (company_id),
    INDEX idx_guilds_leader_id (leader_id),
    INDEX idx_guilds_is_active (is_active)
);

-- Guild membership
CREATE TABLE guild_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(guild_id, user_id),
    INDEX idx_guild_members_guild_id (guild_id),
    INDEX idx_guild_members_user_id (user_id)
);

-- Leaderboards
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(255) NOT NULL,
    leaderboard_type VARCHAR(50) NOT NULL CHECK (leaderboard_type IN ('global', 'class', 'guild', 'weekly', 'monthly')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('level', 'referrals', 'commission', 'xp')),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    value BIGINT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    INDEX idx_leaderboard_entries_company_id (company_id),
    INDEX idx_leaderboard_entries_type (leaderboard_type),
    INDEX idx_leaderboard_entries_category (category),
    INDEX idx_leaderboard_entries_period (period_start, period_end),
    INDEX idx_leaderboard_entries_rank (rank)
);

-- System configuration
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(255) NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(company_id, config_key),
    INDEX idx_system_config_company_id (company_id),
    INDEX idx_system_config_key (config_key)
);

-- Audit log for tracking changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    company_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    INDEX idx_audit_log_company_id (company_id),
    INDEX idx_audit_log_user_id (user_id),
    INDEX idx_audit_log_action (action),
    INDEX idx_audit_log_created_at (created_at)
);
```

### Database Optimization Strategy

1. **Indexing Strategy**: Comprehensive indexing on frequently queried columns
2. **Partitioning**: Time-based partitioning for large tables (referrals, leaderboard_entries)
3. **Connection Pooling**: Using connection pooling for optimal performance
4. **Read Replicas**: Configuring read replicas for analytics queries
5. **Vacuum & Analyze**: Regular maintenance for optimal query performance

---

## Backend Architecture

### Next.js API Routes Structure

```
app/api/
├── auth/
│   └── route.ts           # Authentication validation
├── users/
│   ├── route.ts           # User CRUD operations
│   └── [userId]/
│       ├── route.ts       # Specific user operations
│       └── profile/
│           └── route.ts   # User profile management
├── quests/
│   ├── route.ts           # Quest management
│   └── [questId]/
│       ├── route.ts       # Specific quest operations
│       └── complete/
│           └── route.ts   # Quest completion
├── referrals/
│   ├── route.ts           # Referral tracking
│   ├── generate/
│   │   └── route.ts       # Generate referral codes
│   └── track/
│       └── route.ts       # Track referral clicks
├── leaderboards/
│   ├── route.ts           # Leaderboard data
│   ├── global/
│   │   └── route.ts       # Global leaderboards
│   └── class/
│       └── route.ts       # Class-specific leaderboards
├── guilds/                # Phase 2
│   ├── route.ts
│   ├── [guildId]/
│   │   ├── route.ts
│   │   └── members/
│   │       └── route.ts
├── analytics/
│   ├── route.ts           # Analytics dashboard
│   └── exports/
│       └── route.ts       # Data export functionality
├── webhooks/
│   └── route.ts           # Webhook processing
├── websocket/
│   └── route.ts           # WebSocket authentication
└── health/
    └── route.ts           # Health check endpoint
```

### Core Service Architecture

#### 1. UserService

```typescript
// lib/services/user.service.ts
export class UserService {
  private userRepository: UserRepository;
  private cacheService: CacheService;

  async createUser(userData: CreateUserData): Promise<User> {
    // Validate input
    // Check for existing user
    // Create user with default character class
    // Initialize user quests
    // Cache user data
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    // Check cache first
    // Retrieve user data
    // Calculate XP to next level
    // Get active quests
    // Get recent achievements
    // Cache composite result
  }

  async updateUserLevel(userId: string, newLevel: number): Promise<void> {
    // Validate level progression
    // Check for level-up rewards
    // Update user level
    // Trigger level-up events
    // Update leaderboards
  }
}
```

#### 2. QuestService

```typescript
// lib/services/quest.service.ts
export class QuestService {
  private questRepository: QuestRepository;
  private userQuestRepository: UserQuestRepository;
  private eventBus: EventBus;

  async generateDailyQuests(companyId: string): Promise<Quest[]> {
    // Get company-specific quest templates
    // Apply difficulty scaling based on user levels
    // Generate personalized quests
    // Save to database
    // Notify users via WebSocket
  }

  async updateQuestProgress(userId: string, questId: string, progress: number): Promise<void> {
    // Validate quest belongs to user
    // Update progress
    // Check for completion
    // Award rewards if completed
    // Send real-time notifications
  }

  async completeQuest(userId: string, questId: string): Promise<QuestReward> {
    // Validate quest completion
    // Calculate rewards
    // Apply XP multipliers
    // Update user stats
    // Trigger achievements
    // Send completion notification
  }
}
```

#### 3. ReferralService

```typescript
// lib/services/referral.service.ts
export class ReferralService {
  private referralRepository: ReferralRepository;
  private whopWebhookService: WhopWebhookService;

  async generateReferralCode(userId: string): Promise<string> {
    // Generate unique code
    // Associate with user
    // Set expiration if applicable
    // Return formatted referral link
  }

  async trackReferralClick(referralCode: string, clickData: ClickData): Promise<void> {
    // Validate referral code
    // Record click analytics
    // Check for fraud patterns
    // Update click tracking
  }

  async processReferralCompletion(whopPaymentData: WhopPaymentData): Promise<void> {
    // Validate payment data
    // Find matching referral
    // Calculate commission
    // Update referral status
    // Award XP to referrer
    // Trigger achievements
    // Send notifications
  }
}
```

#### 4. LeaderboardService

```typescript
// lib/services/leaderboard.service.ts
export class LeaderboardService {
  private leaderboardRepository: LeaderboardRepository;
  private cacheService: CacheService;

  async updateLeaderboard(category: string, period: string): Promise<void> {
    // Calculate rankings
    // Handle ties
    // Update database
    // Cache results
    // Invalidate old cache
  }

  async getLeaderboard(category: string, period: string, limit: number): Promise<LeaderboardEntry[]> {
    // Check cache first
    // Apply ranking filters
    // Include user context
    // Return formatted results
  }
}
```

### Webhook Processing Architecture

#### 1. Webhook Handler

```typescript
// lib/webhooks/handler.ts
export class WebhookHandler {
  private validators: Map<string, WebhookValidator>;
  private processors: Map<string, WebhookProcessor>;
  private retryService: RetryService;

  async handleWebhook(event: string, data: any): Promise<void> {
    // Validate webhook signature
    // Parse and validate payload
    // Route to appropriate processor
    // Handle failures with retry logic
  }

  async processPaymentSucceeded(paymentData: PaymentData): Promise<void> {
    // Extract user and referral information
    // Process referral rewards
    // Update user statistics
    // Trigger gamification events
    // Send notifications
  }
}
```

#### 2. Retry Mechanism

```typescript
// lib/services/retry.service.ts
export class RetryService {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    // Implement exponential backoff
    // Track retry attempts
    // Log failures
    // Eventually give up or move to dead letter queue
  }
}
```

---

## Frontend Architecture

### Component Structure

```
components/
├── layout/
│   ├── Header.tsx           # Application header
│   ├── Sidebar.tsx          # Navigation sidebar
│   └── Footer.tsx           # Application footer
├── auth/
│   ├── Login.tsx            # Login component
│   └── ProtectedRoute.tsx   # Route protection wrapper
├── character/
│   ├── CharacterSelection.tsx    # Class selection screen
│   ├── CharacterCard.tsx         # Individual class display
│   └── CharacterProgress.tsx      # Progress visualization
├── dashboard/
│   ├── Dashboard.tsx             # Main dashboard
│   ├── StatsOverview.tsx         # Statistics cards
│   ├── ActiveQuests.tsx          # Active quests display
│   └── RecentActivity.tsx        # Activity feed
├── quests/
│   ├── QuestList.tsx             # Quest listing
│   ├── QuestDetails.tsx          # Individual quest view
│   ├── QuestProgress.tsx         # Progress tracking
│   └── QuestRewards.tsx          # Rewards display
├── referrals/
│   ├── ReferralDashboard.tsx     # Referral management
│   ├── ReferralLink.tsx          # Link generation
│   └── ReferralStats.tsx         # Performance analytics
├── leaderboards/
│   ├── LeaderboardView.tsx       # Leaderboard display
│   ├── LeaderboardFilters.tsx    # Filtering controls
│   └── LeaderboardEntry.tsx      # Individual entry
├── guilds/                       # Phase 2
│   ├── GuildList.tsx
│   ├── GuildDetails.tsx
│   └── GuildManagement.tsx
├── profile/
│   ├── ProfileView.tsx           # User profile
│   ├── Achievements.tsx          # Achievement showcase
│   └── Settings.tsx              # User settings
├── analytics/
│   ├── AnalyticsDashboard.tsx    # Creator analytics
│   ├── Charts.tsx                # Data visualization
│   └── Reports.tsx               # Report generation
└── common/
    ├── LoadingSpinner.tsx        # Loading indicator
    ├── ErrorMessage.tsx          # Error display
    ├── NotificationToast.tsx     # Toast notifications
    └── Modal.tsx                 # Modal wrapper
```

### State Management Architecture

#### 1. Redux Toolkit Store Structure

```typescript
// store/index.ts
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    user: userSlice.reducer,
    quests: questsSlice.reducer,
    referrals: referralsSlice.reducer,
    leaderboards: leaderboardsSlice.reducer,
    guilds: guildsSlice.reducer,
    analytics: analyticsSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      websocketMiddleware,
      analyticsMiddleware,
      cacheMiddleware
    ),
});
```

#### 2. Key State Slices

```typescript
// store/slices/user.slice.ts
export interface UserState {
  currentUser: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => { /* ... */ },
    updateLevel: (state, action: PayloadAction<number>) => { /* ... */ },
    addExperience: (state, action: PayloadAction<number>) => { /* ... */ },
    completeQuest: (state, action: PayloadAction<QuestCompletion>) => { /* ... */ },
    unlockAchievement: (state, action: PayloadAction<Achievement>) => { /* ... */ },
  },
});
```

### Frosted UI Integration Strategy

#### 1. Theme Configuration

```typescript
// styles/theme.ts
export const whopLegendsTheme = {
  ...frostedTheme,
  colors: {
    ...frostedTheme.colors,
    primary: '#6B46C1', // Whop purple
    secondary: '#3B82F6', // Whop blue
    accent: '#F59E0B', // Gold accent for gamification
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  spacing: {
    ...frostedTheme.spacing,
    // Custom spacing for game elements
  },
  typography: {
    ...frostedTheme.typography,
    fontFamily: {
      ...frostedTheme.typography.fontFamily,
      heading: '"Cinzel", serif', // Fantasy font for headers
    },
  },
  components: {
    // Custom component overrides
    Button: {
      variants: {
        fantasy: {
          backgroundColor: 'accent',
          borderColor: 'primary',
          borderWidth: 2,
        },
      },
    },
  },
};
```

#### 2. Custom Components

```typescript
// components/ui/LevelProgress.tsx
export const LevelProgress: React.FC<LevelProgressProps> = ({
  currentLevel,
  currentXP,
  xpToNextLevel,
}) => {
  const progress = (currentXP / xpToNextLevel) * 100;

  return (
    <div className="level-progress-container">
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-bold fantasy-font">Level {currentLevel}</span>
        <span className="text-sm text-gray-600">
          {currentXP.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
```

### Real-time Features Integration

#### 1. WebSocket Hook

```typescript
// hooks/useWebSocket.ts
export const useWebSocket = (userId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WEBSOCKET_URL}?userId=${userId}`);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'authenticate', userId }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setLastMessage(message);
      // Dispatch to Redux store
      store.dispatch(websocketMessageReceived(message));
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Implement reconnection logic
    };

    return () => ws.close();
  }, [userId]);

  return { isConnected, lastMessage };
};
```

#### 2. Event Types

```typescript
// types/websocket.ts
export type WebSocketMessage =
  | { type: 'quest_completed'; data: QuestCompletion }
  | { type: 'level_up'; data: LevelUpData }
  | { type: 'achievement_unlocked'; data: Achievement }
  | { type: 'referral_completed'; data: ReferralData }
  | { type: 'leaderboard_updated'; data: LeaderboardUpdate }
  | { type: 'guild_message'; data: GuildMessage }
  | { type: 'system_notification'; data: SystemNotification };
```

---

## Real-time Features

### WebSocket Architecture

#### 1. WebSocket Server

```typescript
// lib/websocket/server.ts
export class WebSocketServer {
  private server: WebSocketServer;
  private clients: Map<string, WebSocket[]> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private messageQueue: MessageQueue;

  constructor() {
    this.server = new WebSocket.Server({ port: WEBSOCKET_PORT });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.server.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  private async handleConnection(ws: WebSocket, req: http.IncomingMessage): Promise<void> {
    // Extract user ID from query parameters
    const userId = this.extractUserId(req);

    // Authenticate user
    const isAuthenticated = await this.authenticateUser(userId);

    if (!isAuthenticated) {
      ws.close(4001, 'Authentication failed');
      return;
    }

    // Add to client pool
    this.addClient(userId, ws);

    // Setup message handlers
    ws.on('message', (data) => this.handleMessage(userId, data));
    ws.on('close', () => this.handleDisconnection(userId, ws));

    // Send initial state
    await this.sendInitialState(userId, ws);
  }

  public broadcastToRoom(roomId: string, message: any): void {
    const clients = this.rooms.get(roomId) || new Set();

    clients.forEach(userId => {
      const userClients = this.clients.get(userId) || [];
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    });
  }

  public sendToUser(userId: string, message: any): void {
    const userClients = this.clients.get(userId) || [];
    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}
```

#### 2. Room Management

```typescript
// lib/websocket/rooms.ts
export class RoomManager {
  private rooms: Map<string, Set<string>> = new Map();

  joinRoom(userId: string, roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(userId);
  }

  leaveRoom(userId: string, roomId: string): void {
    this.rooms.get(roomId)?.delete(userId);
    if (this.rooms.get(roomId)?.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  getRoomMembers(roomId: string): string[] {
    return Array.from(this.rooms.get(roomId) || []);
  }

  getUserRooms(userId: string): string[] {
    const userRooms: string[] = [];
    this.rooms.forEach((members, roomId) => {
      if (members.has(userId)) {
        userRooms.push(roomId);
      }
    });
    return userRooms;
  }
}
```

### Server-Sent Events (SSE) Fallback

```typescript
// lib/sse/server.ts
export class SSEServer {
  private clients: Map<string, Response> = new Map();

  async handleSSEConnection(req: NextRequest, userId: string): Promise<Response> {
    const stream = new ReadableStream({
      start: (controller) => {
        this.clients.set(userId, controller);

        // Send initial data
        this.sendEvent(userId, {
          type: 'connected',
          data: { timestamp: Date.now() }
        });

        // Cleanup on disconnect
        req.signal.addEventListener('abort', () => {
          this.clients.delete(userId);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  }

  sendEvent(userId: string, event: SSEEvent): void {
    const controller = this.clients.get(userId);
    if (!controller) return;

    const data = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(new TextEncoder().encode(data));
  }

  broadcastEvent(event: SSEEvent): void {
    this.clients.forEach((controller) => {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    });
  }
}
```

### Real-time Event System

#### 1. Event Bus

```typescript
// lib/events/bus.ts
export class EventBus {
  private subscribers: Map<string, Function[]> = new Map();
  private redisPub: Redis;
  private redisSub: Redis;

  constructor() {
    this.setupRedisPubSub();
  }

  private setupRedisPubSub(): void {
    this.redisSub.subscribe('whop-legends-events', (message) => {
      const event = JSON.parse(message);
      this.emit(event.type, event.data);
    });
  }

  subscribe(eventType: string, handler: Function): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  emit(eventType: string, data: any): void {
    // Local subscribers
    const handlers = this.subscribers.get(eventType) || [];
    handlers.forEach(handler => handler(data));

    // Redis pub/sub for cross-instance communication
    this.redisPub.publish('whop-legends-events', JSON.stringify({
      type: eventType,
      data,
      timestamp: Date.now()
    }));
  }
}
```

#### 2. Event Types

```typescript
// types/events.ts
export type GameEvent =
  | { type: 'user_level_up'; data: { userId: string; newLevel: number; } }
  | { type: 'quest_completed'; data: { userId: string; questId: string; rewards: QuestReward; } }
  | { type: 'referral_made'; data: { referrerId: string; referralId: string; amount: number; } }
  | { type: 'achievement_unlocked'; data: { userId: string; achievementId: string; } }
  | { type: 'leaderboard_updated'; data: { category: string; period: string; } }
  | { type: 'guild_message'; data: { guildId: string; message: GuildMessage; } }
  | { type: 'system_notification'; data: { message: string; severity: 'info' | 'warning' | 'error'; } };
```

---

## Caching Strategy

### Redis Cache Architecture

#### 1. Cache Service

```typescript
// lib/cache/redis.service.ts
export class RedisCacheService {
  private redis: Redis;
  private defaultTTL: number = 3600; // 1 hour

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }
}
```

#### 2. Cache Keys Strategy

```typescript
// lib/cache/keys.ts
export class CacheKeys {
  // User-related keys
  static userProfile(userId: string): string {
    return `user:${userId}:profile`;
  }

  static userProgress(userId: string): string {
    return `user:${userId}:progress`;
  }

  static userStats(userId: string): string {
    return `user:${userId}:stats`;
  }

  // Quest-related keys
  static userQuests(userId: string): string {
    return `user:${userId}:quests`;
  }

  static dailyQuests(companyId: string): string {
    return `company:${companyId}:quests:daily:${new Date().toISOString().split('T')[0]}`;
  }

  // Leaderboard keys
  static leaderboard(category: string, period: string): string {
    return `leaderboard:${category}:${period}`;
  }

  static userRank(userId: string, category: string): string {
    return `leaderboard:${category}:user:${userId}:rank`;
  }

  // Analytics keys
  static companyAnalytics(companyId: string, period: string): string {
    return `company:${companyId}:analytics:${period}`;
  }

  // Session keys
  static userSession(userId: string): string {
    return `session:${userId}`;
  }

  // Rate limiting keys
  static rateLimit(userId: string, action: string): string {
    return `rate_limit:${userId}:${action}:${new Date().toISOString().split('T')[0]}`;
  }
}
```

### Cache Implementation Patterns

#### 1. Repository with Caching

```typescript
// lib/repositories/base.repository.ts
export abstract class BaseRepository<T> {
  protected cache: RedisCacheService;
  protected db: Database;

  constructor(cache: RedisCacheService, db: Database) {
    this.cache = cache;
    this.db = db;
  }

  async findById(id: string): Promise<T | null> {
    const cacheKey = this.getCacheKey(id);
    const cached = await this.cache.get<T>(cacheKey);

    if (cached) {
      return cached;
    }

    const entity = await this.db.findById(id);
    if (entity) {
      await this.cache.set(cacheKey, entity);
    }

    return entity;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.db.update(id, data);

    // Invalidate cache
    await this.cache.invalidate(this.getCacheKey(id));

    // Invalidate related caches
    await this.invalidateRelatedCaches(id);

    return updated;
  }

  protected abstract getCacheKey(id: string): string;
  protected abstract invalidateRelatedCaches(id: string): Promise<void>;
}
```

#### 2. Multi-level Caching

```typescript
// lib/cache/multi-level.ts
export class MultiLevelCache {
  private l1Cache: Map<string, { value: any; expires: number }> = new Map();
  private l2Cache: RedisCacheService;

  constructor(redisCache: RedisCacheService) {
    this.l2Cache = redisCache;
  }

  async get<T>(key: string): Promise<T | null> {
    // Level 1: In-memory cache
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && l1Entry.expires > Date.now()) {
      return l1Entry.value;
    }

    // Level 2: Redis cache
    const l2Value = await this.l2Cache.get<T>(key);
    if (l2Value) {
      // Promote to L1 cache
      this.l1Cache.set(key, {
        value: l2Value,
        expires: Date.now() + 60000 // 1 minute
      });
      return l2Value;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    // Set in L1 cache
    this.l1Cache.set(key, {
      value,
      expires: Date.now() + Math.min(ttl * 1000, 60000) // Max 1 minute in L1
    });

    // Set in L2 cache
    await this.l2Cache.set(key, value, ttl);
  }

  async invalidate(key: string): Promise<void> {
    this.l1Cache.delete(key);
    await this.l2Cache.invalidate(key);
  }
}
```

### Cache Invalidation Strategy

#### 1. Event-based Invalidation

```typescript
// lib/cache/invalidation.ts
export class CacheInvalidationService {
  private eventBus: EventBus;
  private cache: RedisCacheService;

  constructor(eventBus: EventBus, cache: RedisCacheService) {
    this.eventBus = eventBus;
    this.cache = cache;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.subscribe('user_level_up', (data) => {
      this.handleUserUpdate(data.userId);
    });

    this.eventBus.subscribe('quest_completed', (data) => {
      this.handleUserUpdate(data.userId);
    });

    this.eventBus.subscribe('referral_made', (data) => {
      this.handleUserUpdate(data.referrerId);
      this.handleLeaderboardUpdate();
    });
  }

  private async handleUserUpdate(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}:*`,
      `leaderboard:*:user:${userId}:*`
    ];

    for (const pattern of patterns) {
      await this.cache.invalidate(pattern);
    }
  }

  private async handleLeaderboardUpdate(): Promise<void> {
    await this.cache.invalidate('leaderboard:*');
  }
}
```

#### 2. Time-based Invalidation

```typescript
// lib/cache/ttl.ts
export class CacheTTLManager {
  static getTTL(key: string): number {
    if (key.includes('leaderboard')) {
      return 300; // 5 minutes for leaderboards
    }

    if (key.includes('quests:daily')) {
      return 86400; // 24 hours for daily quests
    }

    if (key.includes('analytics')) {
      return 1800; // 30 minutes for analytics
    }

    return 3600; // Default 1 hour
  }

  static getTimeToMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }
}
```

---

## API Design

### RESTful API Endpoints

#### 1. User Management

```typescript
// app/api/users/route.ts
export async function GET(request: NextRequest) {
  // Get users with pagination and filtering
}

export async function POST(request: NextRequest) {
  // Create new user
}

// app/api/users/[userId]/route.ts
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  // Get specific user
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  // Update user
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  // Delete user
}
```

#### 2. Quest Management

```typescript
// app/api/quests/route.ts
export async function GET(request: NextRequest) {
  // Get quests with filtering
}

export async function POST(request: NextRequest) {
  // Create new quest
}

// app/api/quests/[questId]/complete/route.ts
export async function POST(request: NextRequest, { params }: { params: { questId: string } }) {
  // Complete quest and award rewards
}
```

#### 3. Referral System

```typescript
// app/api/referrals/route.ts
export async function GET(request: NextRequest) {
  // Get referrals with filtering
}

export async function POST(request: NextRequest) {
  // Create new referral
}

// app/api/referrals/generate/route.ts
export async function POST(request: NextRequest) {
  // Generate referral code
}

// app/api/referrals/track/route.ts
export async function POST(request: NextRequest) {
  // Track referral click
}
```

#### 4. Analytics

```typescript
// app/api/analytics/route.ts
export async function GET(request: NextRequest) {
  // Get analytics data
}

// app/api/analytics/exports/route.ts
export async function POST(request: NextRequest) {
  // Export analytics data
}
```

### API Response Formats

#### 1. Standard Response

```typescript
// types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

#### 2. Error Handling

```typescript
// lib/errors/handler.ts
export class ApiErrorHandler {
  static handleError(error: Error): NextResponse {
    console.error('API Error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details
        }
      }, { status: 400 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 });
  }
}
```

### API Rate Limiting

```typescript
// lib/middleware/rate-limit.ts
export class RateLimitMiddleware {
  static async apply(req: NextRequest, userId: string, limit: number, window: number): Promise<boolean> {
    const key = CacheKeys.rateLimit(userId, 'api');
    const cache = new RedisCacheService();

    const current = await cache.increment(key);
    const ttl = CacheTTLManager.getTimeToMidnight();

    if (current > limit) {
      return false;
    }

    await cache.set(key, current, ttl);
    return true;
  }
}
```

### API Versioning

```typescript
// app/api/v1/...
// app/api/v2/...

export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2'
} as const;
```

---

## Security Architecture

### Authentication & Authorization

#### 1. Whop SDK Integration

```typescript
// lib/auth/whop-auth.ts
export class WhopAuthService {
  private whopSdk: any;

  constructor() {
    this.whopSdk = initializeWhopSDK({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
      apiKey: process.env.WHOP_API_KEY,
      companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID
    });
  }

  async authenticateUser(request: NextRequest): Promise<WhopUser | null> {
    try {
      const user = await this.whopSdk.getCurrentUser(request);
      return user;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  async validateUserAccess(userId: string, companyId: string): Promise<boolean> {
    // Validate user has access to company
    const userCompanies = await this.whopSdk.getUserCompanies(userId);
    return userCompanies.includes(companyId);
  }
}
```

#### 2. Role-based Access Control

```typescript
// lib/auth/rbac.ts
export enum UserRole {
  ADMIN = 'admin',
  CREATOR = 'creator',
  MODERATOR = 'moderator',
  MEMBER = 'member'
}

export enum Permission {
  MANAGE_USERS = 'manage_users',
  MANAGE_QUESTS = 'manage_quests',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_GUILDS = 'manage_guilds',
  PARTICIPATE_IN_GAMIFICATION = 'participate_in_gamification'
}

export class RBACService {
  private rolePermissions: Map<UserRole, Permission[]> = new Map([
    [UserRole.ADMIN, Object.values(Permission)],
    [UserRole.CREATOR, [
      Permission.MANAGE_USERS,
      Permission.MANAGE_QUESTS,
      Permission.VIEW_ANALYTICS,
      Permission.MANAGE_GUILDS
    ]],
    [UserRole.MODERATOR, [
      Permission.MANAGE_USERS,
      Permission.MANAGE_QUESTS,
      Permission.VIEW_ANALYTICS
    ]],
    [UserRole.MEMBER, [
      Permission.PARTICIPATE_IN_GAMIFICATION
    ]]
  ]);

  hasRole(user: User, role: UserRole): boolean {
    return user.role === role;
  }

  hasPermission(user: User, permission: Permission): boolean {
    const userPermissions = this.rolePermissions.get(user.role) || [];
    return userPermissions.includes(permission);
  }

  canAccessResource(user: User, resource: string, action: string): boolean {
    // Implement resource-based access control
    return true;
  }
}
```

### Data Protection

#### 1. Encryption Service

```typescript
// lib/security/encryption.ts
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;

  async encrypt(data: string): Promise<{ encrypted: string; iv: string; tag: string }> {
    const iv = crypto.randomBytes(16);
    const key = await this.getKey();

    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('whop-legends', 'utf8'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  async decrypt(encrypted: string, iv: string, tag: string): Promise<string> {
    const key = await this.getKey();
    const decipher = crypto.createDecipher(this.algorithm, key);

    decipher.setAAD(Buffer.from('whop-legends', 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private async getKey(): Promise<Buffer> {
    const keyMaterial = process.env.ENCRYPTION_KEY;
    return crypto.createHash('sha256').update(keyMaterial).digest();
  }
}
```

#### 2. Data Masking

```typescript
// lib/security/masking.ts
export class DataMaskingService {
  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }

  static maskPhoneNumber(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  static maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked = { ...data };
    const sensitiveFields = ['email', 'phone', 'address', 'ssn'];

    sensitiveFields.forEach(field => {
      if (masked[field]) {
        masked[field] = this.maskDataByType(field, masked[field]);
      }
    });

    return masked;
  }

  private static maskDataByType(field: string, value: string): string {
    if (field.includes('email')) {
      return this.maskEmail(value);
    }

    if (field.includes('phone')) {
      return this.maskPhoneNumber(value);
    }

    return '*'.repeat(Math.min(value.length, 10));
  }
}
```

### Input Validation

#### 1. Validation Service

```typescript
// lib/validation/service.ts
export class ValidationService {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateReferralCode(code: string): boolean {
    return /^[A-Z0-9]{8,12}$/i.test(code);
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  static validatePositiveInteger(value: any): boolean {
    const num = parseInt(value);
    return !isNaN(num) && num > 0 && Number.isInteger(num);
  }
}
```

### Security Middleware

```typescript
// lib/middleware/security.ts
export class SecurityMiddleware {
  static async apply(request: NextRequest): Promise<NextResponse> {
    // Apply security headers
    const response = NextResponse.next();

    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('Content-Security-Policy', this.getCSP());

    return response;
  }

  private static getCSP(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' wss: https:",
      "frame-src https://whop.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }
}
```

### Audit Logging

```typescript
// lib/security/audit.ts
export class AuditService {
  static async logAction(
    userId: string,
    companyId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    const auditLog = {
      userId,
      companyId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent()
    };

    // Store in database
    await this.storeAuditLog(auditLog);

    // Also send to security monitoring
    await this.sendToSecurityMonitoring(auditLog);
  }

  private static async storeAuditLog(log: AuditLog): Promise<void> {
    // Implementation depends on your database
  }

  private static async sendToSecurityMonitoring(log: AuditLog): Promise<void> {
    // Send to external security monitoring service
  }
}
```

---

## Performance Strategy

### Performance Targets

- **API Response Time**: <200ms for all endpoints
- **Page Load Time**: <2 seconds for initial page load
- **WebSocket Latency**: <100ms for real-time updates
- **Cache Hit Rate**: >80% for frequently accessed data
- **Database Query Time**: <50ms for read operations

### Optimization Strategies

#### 1. Database Optimization

```typescript
// lib/db/optimizer.ts
export class DatabaseOptimizer {
  static async optimizeQueries(): Promise<void> {
    // Implement query optimization strategies
    await this.createIndexes();
    await this.optimizeJoins();
    await this.implementQueryCaching();
  }

  private static async createIndexes(): Promise<void> {
    // Create composite indexes for common query patterns
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_user_company_level ON users(company_id, level)',
      'CREATE INDEX IF NOT EXISTS idx_referral_status_created ON referrals(status, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_quest_company_type ON quests(company_id, quest_type)'
    ];

    for (const index of indexes) {
      await this.executeQuery(index);
    }
  }

  private static async optimizeJoins(): Promise<void> {
    // Implement join optimization strategies
  }

  private static async implementQueryCaching(): Promise<void> {
    // Implement query result caching
  }
}
```

#### 2. API Optimization

```typescript
// lib/api/optimizer.ts
export class ApiOptimizer {
  static async optimizeResponse(response: NextResponse): Promise<NextResponse> {
    // Apply compression
    const compressed = await this.compressResponse(response);

    // Add caching headers
    this.addCacheHeaders(compressed);

    return compressed;
  }

  private static async compressResponse(response: NextResponse): Promise<NextResponse> {
    // Implement response compression
    return response;
  }

  private static addCacheHeaders(response: NextResponse): void {
    // Add appropriate cache headers
    response.headers.set('Cache-Control', 'public, max-age=300');
    response.headers.set('ETag', this.generateETag(response));
  }

  private static generateETag(response: NextResponse): string {
    // Generate ETag for response
    return crypto.createHash('md5').update(JSON.stringify(response)).digest('hex');
  }
}
```

#### 3. Frontend Optimization

```typescript
// lib/frontend/optimizer.ts
export class FrontendOptimizer {
  static optimizeImages(): void {
    // Implement image optimization strategies
  }

  static optimizeBundles(): void {
    // Implement bundle optimization strategies
  }

  static implementLazyLoading(): void {
    // Implement lazy loading for components
  }
}
```

### Performance Monitoring

#### 1. Monitoring Service

```typescript
// lib/monitoring/performance.ts
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  static async trackMetric(name: string, value: number, tags: Record<string, string> = {}): Promise<void> {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    // Store metric
    await this.storeMetric(metric);

    // Send to monitoring service
    await this.sendToMonitoringService(metric);

    // Check for alerts
    await this.checkAlerts(metric);
  }

  private static async storeMetric(metric: PerformanceMetric): Promise<void> {
    // Store metric in database or time series store
  }

  private static async sendToMonitoringService(metric: PerformanceMetric): Promise<void> {
    // Send to external monitoring service
  }

  private static async checkAlerts(metric: PerformanceMetric): Promise<void> {
    // Check if metric exceeds thresholds and trigger alerts
  }
}
```

#### 2. Middleware for Performance Tracking

```typescript
// lib/middleware/performance.ts
export class PerformanceMiddleware {
  static async apply(request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      const response = await next();
      const duration = Date.now() - startTime;

      // Track performance metric
      await PerformanceMonitor.trackMetric('api_response_time', duration, {
        endpoint: request.nextUrl.pathname,
        method: request.method
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track error metric
      await PerformanceMonitor.trackMetric('api_error_count', 1, {
        endpoint: request.nextUrl.pathname,
        method: request.method,
        error: error.message
      });

      throw error;
    }
  }
}
```

### Load Testing Strategy

#### 1. Load Test Scenarios

```typescript
// lib/testing/load.ts
export class LoadTestScenarios {
  static async runApiLoadTest(): Promise<void> {
    // Implement API load testing scenarios
  }

  static async runWebSocketLoadTest(): Promise<void> {
    // Implement WebSocket load testing scenarios
  }

  static async runDatabaseLoadTest(): Promise<void> {
    // Implement database load testing scenarios
  }
}
```

---

## Scalability Plan

### Horizontal Scaling Strategy

#### 1. Application Scaling

```typescript
// lib/scaling/application.ts
export class ApplicationScaling {
  static scaleOut(): void {
    // Implement horizontal scaling for application servers
  }

  static scaleIn(): void {
    // Implement horizontal scaling for application servers
  }

  static autoScale(): void {
    // Implement auto-scaling based on metrics
  }
}
```

#### 2. Database Scaling

```typescript
// lib/scaling/database.ts
export class DatabaseScaling {
  static setupReadReplicas(): void {
    // Implement read replica setup
  }

  static implementSharding(): void {
    // Implement database sharding
  }

  static optimizeConnections(): void {
    // Implement connection pooling optimization
  }
}
```

### Caching Scalability

#### 1. Redis Cluster Setup

```typescript
// lib/scaling/redis.ts
export class RedisScaling {
  static setupCluster(): void {
    // Implement Redis cluster setup
  }

  static optimizeMemory(): void {
    // Implement Redis memory optimization
  }

  static implementFailover(): void {
    // Implement Redis failover strategy
  }
}
```

### Load Balancing

#### 1. Load Balancer Configuration

```typescript
// lib/scaling/load-balancer.ts
export class LoadBalancer {
  static configureStickySessions(): void {
    // Configure sticky sessions for WebSocket connections
  }

  static implementHealthChecks(): void {
    // Implement health checks for load balancer
  }

  static optimizeRouting(): void {
    // Optimize routing rules
  }
}
```

### CDN Integration

#### 1. Content Delivery

```typescript
// lib/scaling/cdn.ts
export class CDNIntegration {
  static configureStaticAssets(): void {
    // Configure CDN for static assets
  }

  static implementEdgeCaching(): void {
    // Implement edge caching for API responses
  }

  static optimizeGlobalDelivery(): void {
    // Optimize content delivery globally
  }
}
```

---

## Deployment Architecture

### Vercel Deployment Strategy

#### 1. Environment Configuration

```yaml
# vercel.yaml
framework: nextjs
functions:
  app/api/**/*.ts:
    maxDuration: 30s
    memory: 1024MB
  app/api/webhooks/route.ts:
    maxDuration: 60s
    memory: 1536MB

env:
  production:
    NODE_ENV: production
    DATABASE_URL: $DATABASE_URL
    REDIS_URL: $REDIS_URL
    WHOP_API_KEY: $WHOP_API_KEY
    WHOP_WEBHOOK_SECRET: $WHOP_WEBHOOK_SECRET
    ENCRYPTION_KEY: $ENCRYPTION_KEY
```

#### 2. Build Configuration

```json
// next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['whop.com', 'cdn.whop.com'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default nextConfig;
```

### CI/CD Pipeline

#### 1. GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v2
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

#### 2. Database Migrations

```typescript
// lib/migrations/runner.ts
export class MigrationRunner {
  static async runMigrations(): Promise<void> {
    // Implement database migration runner
  }

  static async rollbackMigrations(): Promise<void> {
    // Implement database rollback
  }
}
```

### Environment Management

#### 1. Environment Variables

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://localhost/whop_legends_dev
REDIS_URL=redis://localhost:6379
WHOP_API_KEY=your_whop_api_key
WHOP_WEBHOOK_SECRET=your_webhook_secret
ENCRYPTION_KEY=your_encryption_key
```

#### 2. Staging Environment

```typescript
// lib/config/staging.ts
export const stagingConfig = {
  database: {
    url: process.env.STAGING_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  },
  redis: {
    url: process.env.STAGING_REDIS_URL
  },
  features: {
    enableExperimentalFeatures: true,
    enableDebugMode: true
  }
};
```

---

## Testing Strategy

### Testing Framework

#### 1. Unit Testing

```typescript
// tests/unit/user.service.test.ts
describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn()
    };

    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    it('should create a new user with default values', async () => {
      const userData = {
        whopUserId: 'test-user',
        companyId: 'test-company',
        username: 'testuser'
      };

      const result = await userService.createUser(userData);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...userData,
        level: 1,
        experiencePoints: 0,
        characterClass: 'scout'
      });
    });
  });
});
```

#### 2. Integration Testing

```typescript
// tests/integration/api.test.ts
describe('API Integration Tests', () => {
  let app: NextApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        whopUserId: 'test-user',
        companyId: 'test-company',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(userData.username);
    });
  });
});
```

#### 3. E2E Testing

```typescript
// tests/e2e/character-selection.test.ts
describe('Character Selection Flow', () => {
  let page: Page;

  beforeAll(async () => {
    page = await browser.newPage();
  });

  afterAll(async () => {
    await page.close();
  });

  it('should allow user to select a character class', async () => {
    await page.goto('/character-selection');

    // Wait for character cards to load
    await page.waitForSelector('[data-testid="character-card"]');

    // Select Scout class
    await page.click('[data-testid="scout-card"]');
    await page.click('[data-testid="confirm-selection"]');

    // Verify redirection to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify user level and class
    const levelText = await page.textContent('[data-testid="user-level"]');
    expect(levelText).toContain('Level 1');

    const classText = await page.textContent('[data-testid="user-class"]');
    expect(classText).toContain('Scout');
  });
});
```

### Test Data Management

#### 1. Test Database Setup

```typescript
// tests/setup/database.ts
export class TestDatabase {
  private static connection: any;

  static async setup(): Promise<void> {
    this.connection = await createTestConnection();
    await this.runMigrations();
    await this.seedTestData();
  }

  static async teardown(): Promise<void> {
    await this.connection.close();
  }

  private static async runMigrations(): Promise<void> {
    // Run database migrations
  }

  private static async seedTestData(): Promise<void> {
    // Seed test data
  }
}
```

#### 2. Mock Services

```typescript
// tests/mocks/whop-sdk.mock.ts
export const createMockWhopSdk = () => ({
  getCurrentUser: jest.fn().mockResolvedValue({
    id: 'test-user',
    email: 'test@example.com',
    companyId: 'test-company'
  }),

  getUserCompanies: jest.fn().mockResolvedValue(['test-company']),

  createAffiliateLink: jest.fn().mockResolvedValue({
    id: 'test-link',
    url: 'https://whop.com/r/test'
  })
});
```

### Performance Testing

#### 1. Load Testing

```typescript
// tests/load/api-performance.test.ts
describe('API Performance Tests', () => {
  it('should handle 1000 concurrent users', async () => {
    const results = await loadTest({
      url: '/api/users',
      concurrency: 1000,
      duration: 30000
    });

    expect(results.avgResponseTime).toBeLessThan(200);
    expect(results.errorRate).toBeLessThan(0.01);
  });
});
```

#### 2. Stress Testing

```typescript
// tests/stress/database.test.ts
describe('Database Stress Tests', () => {
  it('should handle 10,000 concurrent write operations', async () => {
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 10000; i++) {
      promises.push(createTestUser());
    }

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(30000); // 30 seconds
  });
});
```

---

## Monitoring & Observability

### Logging Strategy

#### 1. Structured Logging

```typescript
// lib/logging/structured.ts
export class StructuredLogger {
  static info(message: string, data: any = {}): void {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  }

  static error(message: string, error: Error, data: any = {}): void {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...data
    }));
  }

  static warn(message: string, data: any = {}): void {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
}
```

#### 2. Request Logging Middleware

```typescript
// lib/middleware/logging.ts
export class LoggingMiddleware {
  static async apply(request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    StructuredLogger.info('Request started', {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: this.getClientIP(request)
    });

    try {
      const response = await next();
      const duration = Date.now() - startTime;

      StructuredLogger.info('Request completed', {
        requestId,
        duration,
        status: response.status,
        contentLength: response.headers.get('content-length')
      });

      response.headers.set('X-Request-ID', requestId);
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      StructuredLogger.error('Request failed', error as Error, {
        requestId,
        duration
      });

      throw error;
    }
  }

  private static generateRequestId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private static getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') ||
           request.headers.get('x-real-ip') ||
           'unknown';
  }
}
```

### Metrics Collection

#### 1. Metrics Service

```typescript
// lib/metrics/service.ts
export class MetricsService {
  private metrics: Map<string, Metric[]> = new Map();

  static increment(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    const metric = {
      name,
      value,
      type: 'counter',
      timestamp: Date.now(),
      tags
    };

    this.recordMetric(metric);
  }

  static gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric = {
      name,
      value,
      type: 'gauge',
      timestamp: Date.now(),
      tags
    };

    this.recordMetric(metric);
  }

  static timing(name: string, duration: number, tags: Record<string, string> = {}): void {
    const metric = {
      name,
      value: duration,
      type: 'timing',
      timestamp: Date.now(),
      tags
    };

    this.recordMetric(metric);
  }

  private static recordMetric(metric: Metric): void {
    // Store metric
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    this.metrics.get(metric.name)!.push(metric);

    // Send to monitoring service
    this.sendToMonitoringService(metric);

    // Clean up old metrics
    this.cleanupOldMetrics();
  }

  private static async sendToMonitoringService(metric: Metric): Promise<void> {
    // Send to external monitoring service
  }

  private static cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    this.metrics.forEach((metrics, name) => {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(name, filtered);
    });
  }
}
```

#### 2. Business Metrics

```typescript
// lib/metrics/business.ts
export class BusinessMetrics {
  static trackUserRegistration(): void {
    MetricsService.increment('user_registrations');
  }

  static trackReferralCreated(value: number): void {
    MetricsService.increment('referrals_created');
    MetricsService.increment('referral_value', value);
  }

  static trackQuestCompleted(): void {
    MetricsService.increment('quests_completed');
  }

  static trackLevelUp(fromLevel: number, toLevel: number): void {
    MetricsService.increment('level_ups');
    MetricsService.gauge('user_levels', toLevel);
  }

  static trackGuildCreated(): void {
    MetricsService.increment('guilds_created');
  }
}
```

### Error Tracking

#### 1. Error Tracking Service

```typescript
// lib/errors/tracking.ts
export class ErrorTrackingService {
  static async trackError(error: Error, context: any = {}): Promise<void> {
    const errorData = {
      message: error.message,
      stack: error.stack,
      type: error.name,
      timestamp: new Date().toISOString(),
      context,
      environment: process.env.NODE_ENV,
      requestId: context.requestId
    };

    // Send to error tracking service
    await this.sendToErrorTracking(errorData);

    // Log locally
    StructuredLogger.error('Error tracked', error, context);
  }

  private static async sendToErrorTracking(errorData: any): Promise<void> {
    // Send to external error tracking service
  }
}
```

#### 2. Global Error Handler

```typescript
// lib/errors/global.ts
export class GlobalErrorHandler {
  static handleUnhandledRejection(error: Error): void {
    ErrorTrackingService.trackError(error, {
      type: 'unhandled_rejection'
    });
  }

  static handleUncaughtException(error: Error): void {
    ErrorTrackingService.trackError(error, {
      type: 'uncaught_exception'
    });
  }
}

// Set up global error handlers
process.on('unhandledRejection', GlobalErrorHandler.handleUnhandledRejection);
process.on('uncaughtException', GlobalErrorHandler.handleUncaughtException);
```

### Health Checks

#### 1. Health Check Service

```typescript
// lib/health/service.ts
export class HealthCheckService {
  static async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkWhopAPI(),
      this.checkWebSockets()
    ]);

    const status = {
      healthy: checks.every(check => check.status === 'fulfilled'),
      checks: checks.map((check, index) => ({
        name: ['database', 'redis', 'whop-api', 'websockets'][index],
        healthy: check.status === 'fulfilled',
        error: check.status === 'rejected' ? check.reason.message : null
      })),
      timestamp: new Date().toISOString()
    };

    return status;
  }

  private static async checkDatabase(): Promise<void> {
    // Check database connectivity
  }

  private static async checkRedis(): Promise<void> {
    // Check Redis connectivity
  }

  private static async checkWhopAPI(): Promise<void> {
    // Check Whop API connectivity
  }

  private static async checkWebSockets(): Promise<void> {
    // Check WebSocket server
  }
}
```

#### 2. Health Check Endpoint

```typescript
// app/api/health/route.ts
export async function GET(request: NextRequest): Promise<NextResponse> {
  const health = await HealthCheckService.check();

  return NextResponse.json(health, {
    status: health.healthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    }
  });
}
```

---

## Conclusion

This technical architecture document provides a comprehensive blueprint for building Whop Legends, a scalable and performant RPG-style referral gamification system. The architecture is designed to:

1. **Scale efficiently** - Handle viral growth and seasonal spikes through horizontal scaling and optimized caching
2. **Perform reliably** - Maintain <200ms response times through database optimization and caching strategies
3. **Integrate seamlessly** - Work within the Whop iFrame ecosystem using their SDK and webhook systems
4. **Secure user data** - Implement robust security measures including encryption, authentication, and authorization
5. **Provide real-time experiences** - Use WebSocket technology for live updates and notifications
6. **Monitor effectively** - Comprehensive logging, metrics, and error tracking for operational excellence

The architecture follows modern best practices and is designed to be maintainable, testable, and extensible as the product evolves from MVP through Phase 2 and beyond.

### Next Steps

1. **Setup Development Environment** - Configure local development with Docker containers
2. **Implement Core Services** - Build out the UserService, QuestService, and ReferralService
3. **Set up Database** - Implement the PostgreSQL schema and Redis caching
4. **Build API Layer** - Create the RESTful API endpoints with proper validation and error handling
5. **Develop Frontend** - Implement the React components with Frosted UI integration
6. **Set up Monitoring** - Configure logging, metrics, and error tracking
7. **Deploy to Staging** - Test the application in a staging environment
8. **Launch MVP** - Deploy to production with proper monitoring and alerting

This architecture provides a solid foundation for building a successful gamification platform that will drive engagement and revenue for creators within the Whop ecosystem.
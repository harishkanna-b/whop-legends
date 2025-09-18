# Whop Legends Product Requirements Document (PRD)

## Goals and Background Context

### Goals
- Transform standard affiliate links into an engaging RPG-style progression game for creators and communities
- Drive increased referral activity and creator revenue through gamification mechanics
- Establish Whop Legends as the definitive market leader in referral gamification with clear path to $1M+ ARR
- Provide immediate value to community managers through automation of referral management processes
- Achieve first-year ARR of at least $420,000, growing to $1.2M in Year 2

### Background Context
Whop Legends addresses a significant pain point within the Whop ecosystem: the limitations and lack of engagement in basic affiliate systems. Currently, creators and community managers face manual, unengaging referral processes that lead to missed revenue opportunities. The solution introduces RPG elements like character classes, quests, and leaderboards to transform mundane affiliate marketing into an engaging progression game. This represents a "blue ocean opportunity" within the $180 billion creator economy, with Whop processing over $1 billion in annual creator earnings, creating substantial untapped market potential.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-09-17 | v1.0 | Initial PRD creation based on Project Brief | John (PM) |

## Requirements

### Functional Requirements

**Must Have (MVP):**
- **FR1**: The system shall integrate with Whop's native affiliate system to track referrals and commissions through webhooks *(M)*
- **FR2**: The system shall provide three distinct character classes (Scout, Sage, Champion) with unique XP multipliers and progression paths *(M)*
- **FR3**: The system shall implement a progressive leveling system based on successful referrals with level-based unlocks *(M)*
- **FR4**: The system shall include a quest system with daily, weekly, and monthly quests to drive user engagement *(M)*
- **FR5**: The system shall provide real-time conversion attribution and multi-touch referral journey mapping *(M)*
- **FR6**: The system shall maintain user profiles showing level, XP, achievements, and referral history *(M)*
- **FR11**: The system shall implement comprehensive error handling for webhook failures and Whop API unavailability *(M)*
- **FR12**: The system shall provide basic creator tools for managing community members and viewing referral analytics *(M)*

**Should Have (Phase 1):**
- **FR7**: The system shall offer leaderboards displaying rankings across different categories and time periods *(S)*
- **FR8**: The system shall support a prestige system for max-level users to reset progress with enhanced benefits *(S)*
- **FR9**: The system shall provide creators with analytics dashboards showing referral performance and community engagement *(S)*

**Could Have (Phase 2):**
- **FR10**: The system shall enable guild formation and management for collaborative gameplay and team competitions *(C)*

### Non-Functional Requirements

**Must Have (MVP):**
- **NFR1**: The system must achieve API response times under 200ms for all user interactions *(M)*
- **NFR2**: The system must maintain 99.9% uptime with automatic failover capabilities *(M)*
- **NFR3**: The application must be fully responsive and function seamlessly within the Whop iFrame across all device sizes *(M)*
- **NFR4**: The system must handle webhook processing with guaranteed delivery and retry mechanisms *(M)*
- **NFR11**: The system must implement data privacy controls and user consent management *(M)*
- **NFR12**: The system must provide performance monitoring for referral processing and system health *(M)*

**Should Have (Phase 1):**
- **NFR5**: The application must scale to support 10,000 concurrent users during peak periods *(S)*
- **NFR6**: All user data must be encrypted both in transit and at rest *(S)*
- **NFR7**: The system must provide real-time updates for quests, leaderboards, and user achievements *(S)*
- **NFR9**: The system must implement comprehensive logging for debugging and analytics *(S)*

**Could Have (Phase 2):**
- **NFR8**: The application must comply with Whop's SDK requirements and iFrame constraints *(C)*
- **NFR10**: The application must support internationalization for future global expansion *(C)*

## User Interface Design Goals

### Overall UX Vision
Create an immersive RPG-style experience within the Whop iFrame that seamlessly blends gamification elements with practical referral management. The interface should evoke the feeling of leveling up in a game while maintaining professional functionality for creators to manage their communities effectively.

### Key Interaction Paradigms
- **Game-First Interactions**: Progression through quests, achievements, and level-ups drives engagement
- **Real-Time Feedback**: Instant visual and numeric feedback for referral conversions and XP gains
- **Social Motivation**: Leaderboards and guild activities encourage friendly competition
- **Creator Control**: Simple yet powerful tools for community management and analytics

### Core Screens and Views
- **Character Selection Screen**: Initial class choice with detailed XP multipliers and ability previews
- **Dashboard/HQ**: Main hub showing current level, active quests, referral progress, and quick actions
- **Quest Log**: Detailed view of available, active, and completed quests with rewards and progress
- **Leaderboards**: Community rankings with filters by class, time period, and guild
- **Character Profile**: Individual progression stats, achievements, and referral history
- **Guild Management**: Guild creation, member management, and team competitions
- **Creator Analytics**: Comprehensive dashboard for community performance and revenue tracking

### Accessibility: WCAG AA
The application will comply with WCAG AA standards, ensuring:
- High contrast modes for text and game elements
- Keyboard navigation support for all interactions
- Screen reader compatibility for quest descriptions and analytics
- Alternative text for all game icons and achievement badges

### Branding
The interface will blend Whop's existing design language with fantasy RPG elements:
- **Color Palette**: Whop's primary colors (purple, blue) with fantasy-inspired gold accents
- **Iconography**: Mix of professional Whop icons and custom fantasy/RPG-style game icons
- **Typography**: Clean, modern fonts for data with fantasy-style headers for game elements
- **Animations**: Subtle level-up effects, achievement unlock animations, and quest completion celebrations

### Target Device and Platforms: Web Responsive
The application will be designed with a mobile-first, responsive approach:
- **Primary**: Whop iFrame environment across all devices
- **Secondary**: Mobile optimization for Discord community managers on-the-go
- **Tertiary**: Tablet and desktop layouts for detailed analytics and management tasks

## Technical Assumptions

### Repository Structure: Monorepo (Existing Whop Next.js Template)
The project will leverage the existing Whop Next.js app template structure, which already includes:
- Next.js 15 with App Router
- `@whop/react` SDK integration
- `@whop/api` for backend communication
- Tailwind CSS for styling
- TypeScript for type safety
- Biome for linting and formatting
- Vercel deployment ready

**Rationale**: The existing template provides a solid foundation that already follows Whop's best practices for iFrame app development. This eliminates setup overhead and ensures compatibility with the Whop platform.

### Service Architecture: Next.js App Router with API Routes
The project will use Next.js App Router with API routes for serverless functions, following the existing template's architecture.

**Rationale**: This approach maintains consistency with the existing codebase, leverages Next.js's built-in features for API routes, and simplifies deployment through Vercel. The existing webhook route at `/app/api/webhooks/route.ts` provides a starting point for referral tracking integration.

### Testing Requirements: Full Testing Pyramid
The project will implement a comprehensive testing strategy including unit tests, integration tests, and end-to-end tests to ensure reliability of the gamification system and referral tracking.

**Rationale**: Given the financial nature of referral commissions and the potential for complex game mechanics, robust testing is essential to prevent bugs that could impact creator revenue or user experience.

### Additional Technical Assumptions and Requests

- **Frontend Framework**: Next.js 15 with App Router, using existing `@whop/react` SDK components
- **Styling**: Tailwind CSS (already configured) with custom CSS for game-specific animations
- **Backend API**: Next.js API routes using `@whop/api` SDK for Whop platform integration
- **Database**: PostgreSQL to be integrated (likely Supabase/Neon) for user data, referral tracking, and game state persistence
- **Caching**: Redis (Upstash) to be integrated for real-time leaderboards, quest progress, and session management
- **Real-time**: Server-Sent Events or WebSockets via Next.js API routes for live updates
- **Authentication**: Fully handled by existing `@whop/react` SDK integration - no separate auth system needed
- **Deployment**: Vercel (already configured) with GitHub Actions for CI/CD
- **Monitoring**: Comprehensive logging and performance monitoring for webhook processing and user interactions
- **Webhook Reliability**: Leverage existing webhook route structure with enhanced retry queues and idempotency handling
- **Data Privacy**: GDPR-compliant data handling with user consent management
- **Mobile Optimization**: Responsive design optimized for mobile community management using Tailwind's mobile-first approach
- **Performance**: API response times under 200ms with Next.js's built-in optimizations
- **Scalability**: Architecture designed to handle viral growth and seasonal spikes in creator activity using Vercel's serverless scaling

## Epic List

Based on the requirements and the existing Whop Next.js template, here's the proposed epic structure:

### **Epic 1: Core Database & Webhook Integration**
Establish PostgreSQL database schema for users, referrals, and game state with robust webhook processing for referral tracking.

### **Epic 2: Character System & Progression Engine**
Implement character classes (Scout, Sage, Champion) with XP multipliers and complete character progression experience.

### **Epic 3: Quest System & Real-time Updates**
Create daily, weekly, and monthly quest system with real-time progress tracking and engaging quest-driven user experience.

### **Epic 4: Leaderboards & Achievement System**
Build comprehensive leaderboard system with multiple ranking categories and achievement system with badges and unlock criteria.

### **Epic 5: Creator Analytics & Management**
Develop advanced creator dashboard with revenue analytics and community management tools for professional creator operations.

### **Epic 6: Social Features & Guild System**
Implement guild creation, management, and team competitions with prestige system for max-level users and long-term engagement.

## Epic Details

### **Epic 1: Core Database & Webhook Integration**
**Goal**: Establish PostgreSQL database schema for users, referrals, and game state with robust webhook processing for referral tracking, delivering a functional foundation for the entire gamification system.

#### **Story 1.1: Database Schema Setup**
As a developer, I want a well-structured PostgreSQL database with proper relationships for users, referrals, and game state, so that I have a solid foundation for implementing the gamification features.

**Acceptance Criteria:**
1. Database schema includes tables for users, referrals, character_classes, levels, quests, and achievements
2. All tables have proper indexes for performance optimization
3. Foreign key relationships are established with proper constraints
4. Database migrations are set up for schema versioning
5. Connection pooling is configured for optimal performance

#### **Story 1.2: Webhook Processing System**
As a system, I want to reliably process Whop webhooks for referral events, so that I can accurately track and attribute referral conversions in real-time.

**Acceptance Criteria:**
1. Webhook endpoint accepts and validates Whop `payment_affiliate_reward_created` events
2. Webhook processing includes retry logic with exponential backoff
3. Idempotency handling prevents duplicate processing of same events
4. Comprehensive logging for all webhook processing activities
5. Error handling with proper HTTP status codes and error responses

#### **Story 1.3: Referral Tracking API**
As a frontend developer, I want API endpoints for creating and retrieving referral data, so that I can build user interfaces for tracking referral performance and earnings.

**Acceptance Criteria:**
1. POST /api/referrals endpoint for creating new referral records
2. GET /api/referrals endpoint for retrieving referral history with pagination
3. GET /api/referrals/stats endpoint for referral performance analytics
4. All endpoints include proper authentication and authorization
5. API responses are consistent and follow REST conventions

#### **Story 1.4: Basic Referral Dashboard**
As a creator, I want a basic dashboard to view my referral activity and my community members' individual performance, so that I can understand the overall performance of my referral program and identify top performers.

**Acceptance Criteria:**
1. Dashboard displays total referrals, conversion rate, and earnings
2. Referral history table with date, amount, and status
3. Community member leaderboard showing top performers by referrals and earnings
4. Individual community member performance metrics (referral count, conversion rate, earnings)
5. Basic charts showing referral trends over time
6. Responsive design works on mobile and desktop
7. Dashboard loads within 2 seconds with referral data

### **Epic 2: Character System & Progression Engine**
**Goal**: Implement character classes (Scout, Sage, Champion) with XP multipliers and complete character progression experience, delivering the core RPG mechanics that drive user engagement.

#### **Story 2.1: Character Class Selection**
As a new community member, I want to select from three distinct character classes with unique XP multipliers, so that I can choose a playstyle that matches my referral strategy.

**Acceptance Criteria:**
1. Character selection screen displays Scout (1.2x XP), Sage (1.1x XP + quest bonuses), and Champion (1.3x XP) classes
2. Each class shows unique abilities, XP multipliers, and progression paths
3. Selection is permanent and stored in user profile
4. Beautiful, game-like interface with fantasy styling
5. Mobile-responsive design works on all devices

#### **Story 2.2: Leveling System Implementation**
As a community member, I want to gain levels and unlock new abilities based on my referral activity, so that I feel continuous progression and achievement.

**Acceptance Criteria:**
1. XP calculation engine based on referral amounts and character class multipliers
2. Level progression system with increasing XP requirements per level
3. Level-based unlocks (abilities, quest access, feature access)
4. Level-up notifications and celebrations
5. Level history and progression tracking in user profile

#### **Story 2.3: Character Profile Management**
As a community member, I want to view my personal character profile showing my level, XP, and progression, while the creator can view all community members' profiles, so that I can track my personal gamification journey and the creator can manage community performance.

**Acceptance Criteria:**
1. **Community Member View**: Personal character profile displays current level, XP progress, and class information
2. **Community Member View**: Shows personal referral statistics and earnings gamified as character achievements
3. **Community Member View**: Displays unlocked abilities and progression milestones
4. **Creator View**: Can view all community members' character profiles and performance metrics
5. **Creator View**: Community member directory with search and filtering capabilities
6. Character customization options (avatars, titles, display preferences)
7. Shareable profile for community showcasing (with privacy controls)

### **Epic 3: Quest System & Real-time Updates**
**Goal**: Create daily, weekly, and monthly quest system with real-time progress tracking and engaging quest-driven user experience, providing ongoing motivation for referral activity.

#### **Story 3.1: Quest System Engine**
As a community member, I want to receive daily, weekly, and monthly quests with varying difficulty and rewards, so that I always have clear goals and motivation for my referral activities.

**Acceptance Criteria:**
1. Quest generation system creates daily (easy), weekly (medium), and monthly (hard) quests
2. Quest types include referral targets, conversion goals, and earning milestones
3. Quest rewards include XP, achievements, and special unlocks
4. Quest difficulty scales with user level and class abilities
5. Quest calendar shows upcoming and expired quests

#### **Story 3.2: Real-time Progress Tracking**
As a community member, I want to see real-time updates of my quest progress as referrals convert, so that I get immediate feedback and satisfaction from my activities.

**Acceptance Criteria:**
1. Real-time progress bars update as referrals are tracked
2. WebSocket or Server-Sent Events for instant progress notifications
3. Quest completion celebrations with animations and rewards
4. Progress persists across sessions and device reloads
5. Offline support with sync when connection restored

#### **Story 3.3: Quest Management Interface**
As a community member, I want an intuitive quest log interface to view my active, completed, and available quests, so that I can easily track my progress and plan my referral strategy.

**Acceptance Criteria:**
1. Quest log displays active quests with progress bars and deadlines
2. Completed quests section shows history and rewards earned
3. Available quests preview upcoming challenges
4. Quest details view shows requirements, rewards, and tips
5. Mobile-responsive design with touch-friendly interactions

#### **Story 3.4: Creator Quest Management**
As a creator, I want to create custom quests and challenges for my community members, so that I can drive specific behaviors and align quests with my business goals.

**Acceptance Criteria:**
1. Creator can create custom quests with custom rewards
2. Quest templates for common goals (new referrals, retention, etc.)
3. Quest scheduling and automated deployment
4. Performance analytics showing quest completion rates
5. Community-wide quests and competitions creator can launch

### **Epic 4: Leaderboards & Achievement System**
**Goal**: Build comprehensive leaderboard system with multiple ranking categories and achievement system with badges and unlock criteria, driving social competition and engagement.

#### **Story 4.1: Multi-category Leaderboards**
As a community member, I want to compete on leaderboards across different categories and time periods, so that I can see how I stack up against others and strive for improvement.

**Acceptance Criteria:**
1. Leaderboards for total referrals, monthly referrals, conversion rate, and earnings
2. Time-based filters (daily, weekly, monthly, all-time)
3. Class-specific leaderboards showing top performers by character class
4. Pagination and search functionality for large communities
5. User's current rank highlighted in all leaderboards

#### **Story 4.2: Achievement System**
As a community member, I want to earn badges and achievements for reaching milestones, so that I feel recognized for my accomplishments and motivated to continue.

**Acceptance Criteria:**
1. Achievement system with 25+ unique badges for various accomplishments
2. Achievement categories: referrals, levels, quests, special events
3. Progress tracking for multi-step achievements
4. Achievement notifications and celebrations
5. Achievement showcase in user profiles

#### **Story 4.3: Social Competition Features**
As a community member, I want to follow and compete with friends, so that I can have friendly rivalries that increase my engagement.

**Acceptance Criteria:**
1. Friend/follower system within the community
2. Personal leaderboards comparing performance with friends
3. Challenge system for head-to-head competitions
4. Social sharing of achievements and milestones
5. Notification system for friends' accomplishments

#### **Story 4.4: Creator Competition Tools**
As a creator, I want to create custom competitions and tournaments, so that I can drive specific behaviors and create exciting events for my community.

**Acceptance Criteria:**
1. Creator can create custom competitions with custom rules
2. Tournament bracket system for community events
3. Prize distribution and reward management
4. Competition analytics and participation tracking
5. Public competition pages for community engagement

### **Epic 5: Creator Analytics & Management**
**Goal**: Develop advanced creator dashboard with revenue analytics and community management tools for professional creator operations, providing creators with comprehensive insights and control.

#### **Story 5.1: Advanced Analytics Dashboard**
As a creator, I want comprehensive analytics and reporting on my community's performance and revenue, so that I can make data-driven decisions to optimize my referral strategy.

**Acceptance Criteria:**
1. Revenue analytics showing trends, projections, and breakdowns
2. Community performance metrics (engagement, retention, growth)
3. Referral funnel analysis and conversion tracking
4. Custom report builder with export functionality (CSV, PDF)
5. Advanced filtering and segmentation capabilities

#### **Story 5.2: Community Management Tools**
As a creator, I want powerful tools to manage my community members and their activities, so that I can effectively moderate and grow my referral program.

**Acceptance Criteria:**
1. Member management with roles and permissions
2. Bulk operations for messaging and management
3. Activity monitoring and moderation tools
4. Automated onboarding and welcome sequences
5. Community segmentation and targeting capabilities

#### **Story 5.3: Revenue Optimization Features**
As a creator, I want tools to optimize my referral revenue and identify growth opportunities, so that I can maximize my earnings from the referral program.

**Acceptance Criteria:**
1. ROI analysis for different referral strategies
2. A/B testing tools for referral approaches
3. Revenue attribution and tracking
4. Performance benchmarking against similar communities
5. Automated insights and recommendations

### **Epic 6: Social Features & Guild System**
**Goal**: Implement guild creation, management, and team competitions with prestige system for max-level users and long-term engagement, creating network effects and retention.

#### **Story 6.1: Guild System**
As a community member, I want to create and join guilds with other members, so that I can collaborate, compete, and build stronger social connections.

**Acceptance Criteria:**
1. Guild creation and management tools
2. Guild member roles and permissions
3. Guild-specific leaderboards and achievements
4. Guild chat and communication features
5. Guild branding and customization options

#### **Story 6.2: Prestige System**
As a max-level user, I want to reset my progress for enhanced benefits and prestige, so that I have continued motivation and status recognition.

**Acceptance Criteria:**
1. Prestige system with multiple prestige levels
2. Enhanced benefits and abilities for prestiged users
3. Prestige tracking and leaderboards
4. Visual indicators of prestige status
5. Exclusive prestige-only content and features

#### **Story 6.3: Guild vs Guild Competitions**
As a guild member, I want to compete against other guilds in tournaments and events, so that I can experience team-based competition and camaraderie.

**Acceptance Criteria:**
1. Guild vs guild tournament system
2. Team-based challenges and objectives
3. Guild ranking and leaderboards
4. Guild rewards and recognition
5. Spectator modes for community engagement

## Checklist Results Report

The PRD has been created following the PM best practices and includes all essential components for a comprehensive product requirements document.

### **Coverage Assessment**
- ✅ Goals and business objectives clearly defined
- ✅ Functional and non-functional requirements with MoSCoW prioritization
- ✅ User interface design goals with accessibility considerations
- ✅ Technical assumptions aligned with existing Whop Next.js template
- ✅ Epic structure with logical progression and value delivery
- ✅ Detailed user stories with clear acceptance criteria
- ✅ Creator vs Community Member perspective differentiation
- ✅ Mobile-first design approach
- ✅ Real-time features and social engagement mechanics

### **Quality Checks**
- ✅ Requirements are specific, measurable, and testable
- ✅ Stories follow standard format (As a [user], I want [action], so that [benefit])
- ✅ Acceptance criteria are unambiguous and verifiable
- ✅ Technical decisions are justified with rationale
- ✅ Risk considerations addressed (webhook reliability, scalability)
- ✅ User experience considerations integrated throughout

## Next Steps

### **UX Expert Prompt**
Create a comprehensive UX strategy for Whop Legends focusing on the dual-user experience (Creator oversight + Community Member gamification). Design the core user flows for character selection, quest progression, and creator analytics dashboards. Ensure the interface seamlessly blends professional functionality with engaging RPG elements while maintaining consistency with Whop's design system.

### **Architect Prompt**
Design the technical architecture for Whop Legends using the existing Whop Next.js template as foundation. Focus on database schema design for the gamification system, webhook processing architecture, real-time features implementation, and scalability considerations. The architecture must support the creator/community member dual-access model and handle potential viral growth while maintaining performance under 200ms response times.
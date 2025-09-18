-- Whop Legends Initial Database Schema
-- This migration sets up the complete database structure for the gamification system

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Create character classes configuration first (referenced by users table)
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

-- Insert default character classes
INSERT INTO character_classes (name, display_name, description, base_xp_multiplier, commission_multiplier, abilities, requirements) VALUES
('scout', 'Scout', 'Specializes in finding new referral opportunities with balanced XP and commission gains', 1.200, 1.100, '{"passive": ["Referral Insight", "Network Expansion"]}', '{"level": 1}'),
('sage', 'Sage', 'Focuses on strategic referrals with quest bonuses and consistent performance', 1.100, 1.000, '{"passive": ["Quest Mastery", "Wisdom Boost"]}', '{"level": 1}'),
('champion', 'Champion', 'Excels at high-value referrals with maximum XP multiplier', 1.300, 1.200, '{"passive": ["Commission Boost", "Valor Strike"]}', '{"level": 1}');

-- Users table for storing community member information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    whop_user_id VARCHAR(255) UNIQUE NOT NULL,
    company_id VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    avatar_url VARCHAR(500),
    character_class VARCHAR(50) NOT NULL REFERENCES character_classes(name),
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
    CONSTRAINT valid_character_class CHECK (character_class IN ('scout', 'sage', 'champion'))
);

-- Create indexes for users table
CREATE INDEX idx_users_whop_user_id ON users(whop_user_id);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_character_class ON users(character_class);
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_created_at ON users(created_at);

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
    CONSTRAINT valid_quest_type CHECK (quest_type IN ('daily', 'weekly', 'monthly', 'special')),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
    CONSTRAINT valid_target_type CHECK (target_type IN ('referrals', 'commission', 'level', 'achievements'))
);

-- Create indexes for quests table
CREATE INDEX idx_quests_company_id ON quests(company_id);
CREATE INDEX idx_quests_quest_type ON quests(quest_type);
CREATE INDEX idx_quests_is_active ON quests(is_active);
CREATE INDEX idx_quests_dates ON quests(start_date, end_date);

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
    CONSTRAINT valid_progress CHECK (progress_value >= 0)
);

-- Create indexes for user_quests table
CREATE INDEX idx_user_quests_user_id ON user_quests(user_id);
CREATE INDEX idx_user_quests_quest_id ON user_quests(quest_id);
CREATE INDEX idx_user_quests_is_completed ON user_quests(is_completed);

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
    CONSTRAINT valid_referral_status CHECK (status IN ('pending', 'completed', 'expired')),
    CONSTRAINT valid_commission_status CHECK (commission_status IN ('pending', 'paid', 'cancelled'))
);

-- Create indexes for referrals table
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_company_id ON referrals(company_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_created_at ON referrals(created_at);

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
    CONSTRAINT valid_rarity CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

-- Create indexes for achievements table
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_achievements_is_active ON achievements(is_active);

-- User achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    progress_data JSONB,
    UNIQUE(user_id, achievement_id)
);

-- Create indexes for user_achievements table
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);

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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for guilds table
CREATE INDEX idx_guilds_company_id ON guilds(company_id);
CREATE INDEX idx_guilds_leader_id ON guilds(leader_id);
CREATE INDEX idx_guilds_is_active ON guilds(is_active);

-- Guild members
CREATE TABLE guild_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_guild_role CHECK (role IN ('leader', 'officer', 'member')),
    UNIQUE(guild_id, user_id)
);

-- Create indexes for guild_members table
CREATE INDEX idx_guild_members_guild_id ON guild_members(guild_id);
CREATE INDEX idx_guild_members_user_id ON guild_members(user_id);

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

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
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

-- Function to calculate user level based on XP
CREATE OR REPLACE FUNCTION calculate_level(xp BIGINT)
RETURNS INTEGER AS $$
DECLARE
    level INTEGER := 1;
    xp_required BIGINT := 100;
BEGIN
    WHILE xp >= xp_required LOOP
        level := level + 1;
        xp_required := xp_required * 1.15; -- 15% increase per level
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

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE character_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be too permissive
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;

-- RLS Policies for character_classes (publicly readable)
CREATE POLICY "Character classes are viewable by everyone" ON character_classes
    FOR SELECT USING (true);

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = whop_user_id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON users
    FOR DELETE USING (auth.uid() = id);

-- RLS Policies for quests table
CREATE POLICY "Quests are viewable by everyone" ON quests
    FOR SELECT USING (true);

-- RLS Policies for user_quests table
CREATE POLICY "Users can view their own quests" ON user_quests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quests" ON user_quests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quests" ON user_quests
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for referrals table
CREATE POLICY "Users can view referrals they created or received" ON referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can insert referrals they create" ON referrals
    FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update referrals they created" ON referrals
    FOR UPDATE USING (auth.uid() = referrer_id);

-- RLS Policies for achievements table
CREATE POLICY "Achievements are viewable by everyone" ON achievements
    FOR SELECT USING (true);

-- RLS Policies for user_achievements table
CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" ON user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements" ON user_achievements
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for guilds table
CREATE POLICY "Guilds are viewable by everyone" ON guilds
    FOR SELECT USING (true);

CREATE POLICY "Users can create guilds" ON guilds
    FOR INSERT WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Guild leaders can update their guild" ON guilds
    FOR UPDATE USING (auth.uid() = leader_id);

-- RLS Policies for guild_members table
CREATE POLICY "Users can view guild memberships" ON guild_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can join guilds" ON guild_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave guilds" ON guild_members
    FOR DELETE USING (auth.uid() = user_id);

-- Add real-time publication for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE user_quests;
ALTER PUBLICATION supabase_realtime ADD TABLE referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE guilds;
ALTER PUBLICATION supabase_realtime ADD TABLE guild_members;
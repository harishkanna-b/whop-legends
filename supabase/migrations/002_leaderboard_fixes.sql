-- Migration to add missing tables and fix schema issues
-- This addresses issues found during database verification

-- Add merchant character class
INSERT INTO character_classes (name, display_name, description, base_xp_multiplier, commission_multiplier, abilities, requirements) VALUES
('merchant', 'Merchant', 'Specializes in high-commission referrals with balanced XP gains', 1.000, 1.300, '{"passive": ["Haggle", "Trade Network"]}', '{"level": 1}')
ON CONFLICT (name) DO NOTHING;

-- Fix referrals table column name (referred_whop_user_id -> referred_user_id for consistency)
-- First, add the new column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'referred_user_id') THEN
        ALTER TABLE referrals ADD COLUMN referred_user_id UUID REFERENCES users(id);
    END IF;
END $$;

-- Update existing referrals to populate the new column
UPDATE referrals
SET referred_user_id = u.id
FROM users u
WHERE referrals.referred_whop_user_id = u.whop_user_id
AND referrals.referred_user_id IS NULL;

-- Make the column NOT NULL after populating
ALTER TABLE referrals ALTER COLUMN referred_user_id SET NOT NULL;

-- Create leaderboard-specific tables for Story 1.6
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    timeframe VARCHAR(20) NOT NULL CHECK (timeframe IN ('daily', 'weekly', 'monthly', 'all_time')),
    snapshot_data JSONB NOT NULL,
    participant_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for leaderboard snapshots
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_leaderboard_id ON leaderboard_snapshots(leaderboard_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_category ON leaderboard_snapshots(category);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_timeframe ON leaderboard_snapshots(timeframe);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_created_at ON leaderboard_snapshots(created_at);

-- Create user ranking history table
CREATE TABLE IF NOT EXISTS user_ranking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leaderboard_id VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    timeframe VARCHAR(20) NOT NULL CHECK (timeframe IN ('daily', 'weekly', 'monthly', 'all_time')),
    rank INTEGER NOT NULL,
    score BIGINT NOT NULL,
    previous_rank INTEGER,
    change_type VARCHAR(10) CHECK (change_type IN ('up', 'down', 'same', 'new')),
    snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for user ranking history
CREATE INDEX IF NOT EXISTS idx_user_ranking_history_user_id ON user_ranking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ranking_history_leaderboard_id ON user_ranking_history(leaderboard_id);
CREATE INDEX IF NOT EXISTS idx_user_ranking_history_category ON user_ranking_history(category);
CREATE INDEX IF NOT EXISTS idx_user_ranking_history_timeframe ON user_ranking_history(timeframe);
CREATE INDEX IF NOT EXISTS idx_user_ranking_history_snapshot_date ON user_ranking_history(snapshot_date);

-- Create analytics cache table for performance
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analytics cache
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON analytics_cache(expires_at);

-- Enable Row Level Security on new tables
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ranking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leaderboard snapshots (publicly readable)
CREATE POLICY IF NOT EXISTS "Leaderboard snapshots are viewable by everyone" ON leaderboard_snapshots
    FOR SELECT USING (true);

-- RLS Policies for user ranking history
CREATE POLICY IF NOT EXISTS "Users can view their own ranking history" ON user_ranking_history
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for analytics cache (managed by system)
CREATE POLICY IF NOT EXISTS "Analytics cache is managed by system" ON analytics_cache
    FOR ALL USING (false); -- Only service role can access

-- Function to clean up expired analytics cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analytics_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update leaderboard rankings
CREATE OR REPLACE FUNCTION update_user_rankings(
    p_leaderboard_id VARCHAR(255),
    p_category VARCHAR(50),
    p_timeframe VARCHAR(20)
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- This function would be called to update rankings
    -- For now, it's a placeholder for the ranking engine logic
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Add real-time publication for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE user_ranking_history;
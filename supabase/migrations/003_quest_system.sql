-- Quest System Migration
-- Implements the complete quest system with daily, weekly, and monthly challenges

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create character_classes table if it doesn't exist
CREATE TABLE IF NOT EXISTS character_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    abilities JSONB,
    xp_multiplier DECIMAL(3,2) DEFAULT 1.0,
    commission_multiplier DECIMAL(3,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quests table
CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    quest_type TEXT NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'monthly', 'special')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
    company_id UUID NOT NULL,
    experience_reward INTEGER NOT NULL DEFAULT 0,
    commission_reward DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    max_completions INTEGER DEFAULT 1,
    time_limit_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create user_quests table for tracking individual quest progress
CREATE TABLE IF NOT EXISTS user_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    progress_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    target_value DECIMAL(10,2) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    reward_claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, quest_id)
);

-- Create quest_requirements table for flexible quest objectives
CREATE TABLE IF NOT EXISTS quest_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('referrals', 'commission', 'level', 'achievements', 'clicks')),
    target_value DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quest_templates table for predefined quest patterns
CREATE TABLE IF NOT EXISTS quest_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    quest_type TEXT NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'monthly', 'special')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
    min_level INTEGER DEFAULT 1,
    max_level INTEGER DEFAULT 100,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quest_rewards table for tracking reward distribution
CREATE TABLE IF NOT EXISTS quest_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_quest_id UUID NOT NULL REFERENCES user_quests(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('experience', 'commission', 'item', 'badge')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quests_company_type ON quests(company_id, quest_type);
CREATE INDEX IF NOT EXISTS idx_quests_active_expires ON quests(is_active, expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_quests_user_status ON user_quests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_quests_completed ON user_quests(is_completed, completed_at);
CREATE INDEX IF NOT EXISTS idx_quest_requirements_quest_id ON quest_requirements(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_templates_type_difficulty ON quest_templates(quest_type, difficulty);
CREATE INDEX IF NOT EXISTS idx_quest_rewards_user_quest ON quest_rewards(user_quest_id);

-- Create RLS policies for quests
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quests for their company" ON quests
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all quests" ON quests
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for user_quests
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quests" ON user_quests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own quests" ON user_quests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own quests" ON user_quests
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all user quests" ON user_quests
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for quest_rewards
ALTER TABLE quest_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards" ON quest_rewards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_quests uq
            WHERE uq.id = quest_rewards.user_quest_id
            AND uq.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all quest rewards" ON quest_rewards
    FOR ALL USING (auth.role() = 'service_role');

-- Create function for quest analytics
CREATE OR REPLACE FUNCTION get_quest_analytics(
    p_company_id UUID,
    p_quest_type TEXT DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    total_quests BIGINT,
    completed_quests BIGINT,
    completion_rate DECIMAL(5,2),
    total_users BIGINT,
    average_completion_time DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT q.id) as total_quests,
        COUNT(DISTINCT CASE WHEN uq.is_completed THEN q.id END) as completed_quests,
        CASE
            WHEN COUNT(DISTINCT q.id) > 0
            THEN (COUNT(DISTINCT CASE WHEN uq.is_completed THEN q.id END)::DECIMAL / COUNT(DISTINCT q.id)::DECIMAL) * 100
            ELSE 0
        END as completion_rate,
        COUNT(DISTINCT uq.user_id) as total_users,
        NULL as average_completion_time -- TODO: Implement completion time calculation
    FROM quests q
    LEFT JOIN user_quests uq ON q.id = uq.quest_id
    WHERE q.company_id = p_company_id
    AND (p_quest_type IS NULL OR q.quest_type = p_quest_type)
    AND q.created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Create function for automatic quest expiration
CREATE OR REPLACE FUNCTION expire_overdue_quests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE user_quests
    SET status = 'expired',
        updated_at = NOW()
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status = 'active';

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_quests_updated_at
    BEFORE UPDATE ON quests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_quests_updated_at
    BEFORE UPDATE ON user_quests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quest_templates_updated_at
    BEFORE UPDATE ON quest_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default character classes if they don't exist
INSERT INTO character_classes (name, description, abilities, xp_multiplier, commission_multiplier) VALUES
('Scout', 'Quick and efficient at gathering referrals', '{"speed_bonus": 1.2, "early_adopter_bonus": 1.1}', 1.1, 1.0),
('Sage', 'Wisdom in strategy and long-term planning', '{"strategy_bonus": 1.3, "mentor_bonus": 1.2}', 1.0, 1.2),
('Champion', 'Natural leader with high conversion rates', '{"leadership_bonus": 1.4, "conversion_bonus": 1.3}', 1.2, 1.1)
ON CONFLICT (name) DO NOTHING;

-- Insert default quest templates
INSERT INTO quest_templates (name, description, quest_type, difficulty, min_level, max_level, requirements, rewards) VALUES
('Daily Referral Challenge', 'Refer 3 new users today', 'daily', 'easy', 1, 100, '[{"type": "referrals", "target": 3, "description": "Refer 3 users"}]', '{"experience": 50, "commission": 5.00}'),
('Weekly Commission Goal', 'Earn $50 in commissions this week', 'weekly', 'medium', 5, 100, '[{"type": "commission", "target": 50, "description": "Earn $50 in commissions"}]', '{"experience": 200, "commission": 10.00}'),
('Monthly Achievement Master', 'Complete 10 achievements this month', 'monthly', 'hard', 10, 100, '[{"type": "achievements", "target": 10, "description": "Complete 10 achievements"}]', '{"experience": 500, "commission": 25.00}'),
('Legendary Click Master', 'Get 1000 referral clicks in one day', 'special', 'legendary', 20, 100, '[{"type": "clicks", "target": 1000, "description": "Get 1000 referral clicks"}]', '{"experience": 1000, "commission": 50.00}')
ON CONFLICT (name) DO NOTHING;

-- Create function to check and award quest completion
CREATE OR REPLACE FUNCTION check_quest_completion(p_user_quest_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_quest user_quests%ROWTYPE;
    v_quest quests%ROWTYPE;
    v_requirements_completed BOOLEAN;
    v_progress_sufficient BOOLEAN;
BEGIN
    -- Get user quest and quest details
    SELECT * INTO v_user_quest FROM user_quests WHERE id = p_user_quest_id;
    SELECT * INTO v_quest FROM quests WHERE id = v_user_quest.quest_id;

    -- Check if progress meets target
    v_progress_sufficient := v_user_quest.progress_value >= v_user_quest.target_value;

    -- Check requirements (simplified for now)
    v_requirements_completed := v_progress_sufficient; -- TODO: Implement detailed requirement checking

    -- Update quest status if completed
    IF v_requirements_completed AND NOT v_user_quest.is_completed THEN
        UPDATE user_quests
        SET
            is_completed = true,
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_user_quest_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to distribute quest rewards
CREATE OR REPLACE FUNCTION distribute_quest_rewards(p_user_quest_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_quest user_quests%ROWTYPE;
    v_quest quests%ROWTYPE;
    v_reward_id UUID;
BEGIN
    -- Get user quest and quest details
    SELECT * INTO v_user_quest FROM user_quests WHERE id = p_user_quest_id;
    SELECT * INTO v_quest FROM quests WHERE id = v_user_quest.quest_id;

    -- Check if quest is completed and rewards not claimed
    IF v_user_quest.is_completed AND NOT v_user_quest.reward_claimed THEN
        -- Distribute experience reward
        IF v_quest.experience_reward > 0 THEN
            INSERT INTO quest_rewards (user_quest_id, reward_type, amount, description, claimed_at)
            VALUES (p_user_quest_id, 'experience', v_quest.experience_reward, 'Experience from quest: ' || v_quest.title, NOW());

            -- Update user experience (this would need to be implemented in users table)
            -- UPDATE users SET experience = experience + v_quest.experience_reward WHERE id = v_user_quest.user_id;
        END IF;

        -- Distribute commission reward
        IF v_quest.commission_reward > 0 THEN
            INSERT INTO quest_rewards (user_quest_id, reward_type, amount, description, claimed_at)
            VALUES (p_user_quest_id, 'commission', v_quest.commission_reward, 'Commission from quest: ' || v_quest.title, NOW());
        END IF;

        -- Mark rewards as claimed
        UPDATE user_quests
        SET
            reward_claimed = true,
            claimed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_user_quest_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
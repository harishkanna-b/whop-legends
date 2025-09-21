// Quest System Database Schema
// Based on Story 1.4: Quest System and Daily Challenges

import type {
	QuestDifficulty,
	QuestType,
	RequirementType,
} from "../types/quest-types";

// Quest Tables Schema Definitions

export const QUESTS_TABLE = "quests";
export const USER_QUESTS_TABLE = "user_quests";
export const QUEST_REQUIREMENTS_TABLE = "quest_requirements";
export const QUEST_TEMPLATES_TABLE = "quest_templates";

// Quests Table Schema
export interface QuestsTable {
	id: string; // UUID PK
	company_id: string; // UUID FK to companies
	title: string; // VARCHAR(255)
	description: string; // TEXT
	quest_type: QuestType; // ENUM('daily', 'weekly', 'monthly', 'special')
	difficulty: QuestDifficulty; // ENUM('easy', 'medium', 'hard', 'epic')
	target_type: RequirementType; // ENUM('referrals', 'commission', 'level', 'achievements', 'clicks')
	target_value: number; // INTEGER
	reward_xp: number; // INTEGER
	reward_commission: number; // DECIMAL(10,2)
	is_active: boolean; // BOOLEAN DEFAULT true
	start_date: Date; // TIMESTAMP WITH TIME ZONE
	end_date: Date; // TIMESTAMP WITH TIME ZONE
	created_at: Date; // TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	updated_at: Date; // TIMESTAMP WITH TIME ZONE DEFAULT NOW()
}

// User Quests Table Schema
export interface UserQuestsTable {
	id: string; // UUID PK
	user_id: string; // UUID FK to users
	quest_id: string; // UUID FK to quests
	progress: number; // INTEGER DEFAULT 0
	status: "active" | "completed" | "failed" | "expired"; // ENUM DEFAULT 'active'
	started_at: Date; // TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	completed_at: Date; // TIMESTAMP WITH TIME ZONE (nullable)
	created_at: Date; // TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	updated_at: Date; // TIMESTAMP WITH TIME ZONE DEFAULT NOW()
}

// Quest Requirements Table Schema
export interface QuestRequirementsTable {
	id: string; // UUID PK
	quest_id: string; // UUID FK to quests
	requirement_type: RequirementType; // ENUM
	target_value: number; // INTEGER
	description: string; // VARCHAR(500)
	order_index: number; // INTEGER DEFAULT 0
	created_at: Date; // TIMESTAMP WITH TIME ZONE DEFAULT NOW()
}

// Quest Templates Table Schema
export interface QuestTemplatesTable {
	id: string; // UUID PK
	template_name: string; // VARCHAR(255) UNIQUE
	quest_type: QuestType; // ENUM
	difficulty: QuestDifficulty; // ENUM
	base_reward_xp: number; // INTEGER
	base_reward_commission: number; // DECIMAL(10,2)
	requirements_template: any; // JSONB for flexible template storage
	is_active: boolean; // BOOLEAN DEFAULT true
	created_at: Date; // TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	updated_at: Date; // TIMESTAMP WITH TIME ZONE DEFAULT NOW()
}

// SQL Schema Definitions

export const CREATE_QUESTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${QUESTS_TABLE} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quest_type VARCHAR(20) NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'monthly', 'special')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('referrals', 'commission', 'level', 'achievements', 'clicks')),
    target_value INTEGER NOT NULL CHECK (target_value > 0),
    reward_xp INTEGER NOT NULL CHECK (reward_xp >= 0),
    reward_commission DECIMAL(10,2) NOT NULL CHECK (reward_commission >= 0),
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_quests_company_id ON ${QUESTS_TABLE}(company_id);
  CREATE INDEX IF NOT EXISTS idx_quests_quest_type ON ${QUESTS_TABLE}(quest_type);
  CREATE INDEX IF NOT EXISTS idx_quests_difficulty ON ${QUESTS_TABLE}(difficulty);
  CREATE INDEX IF NOT EXISTS idx_quests_is_active ON ${QUESTS_TABLE}(is_active);
  CREATE INDEX IF NOT EXISTS idx_quests_dates ON ${QUESTS_TABLE}(start_date, end_date);
  CREATE INDEX IF NOT EXISTS idx_quests_target_type ON ${QUESTS_TABLE}(target_type);

  -- Updated at trigger
  CREATE OR REPLACE FUNCTION update_quests_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';

  CREATE TRIGGER update_quests_updated_at_trigger
    BEFORE UPDATE ON ${QUESTS_TABLE}
    FOR EACH ROW
    EXECUTE FUNCTION update_quests_updated_at();
`;

export const CREATE_USER_QUESTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${USER_QUESTS_TABLE} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'expired')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, quest_id)
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON ${USER_QUESTS_TABLE}(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_quests_quest_id ON ${USER_QUESTS_TABLE}(quest_id);
  CREATE INDEX IF NOT EXISTS idx_user_quests_status ON ${USER_QUESTS_TABLE}(status);
  CREATE INDEX IF NOT EXISTS idx_user_quests_created_at ON ${USER_QUESTS_TABLE}(created_at);

  -- Real-time subscription support
  ALTER PUBLICATION supabase_realtime ADD TABLE ${USER_QUESTS_TABLE};

  -- Updated at trigger
  CREATE OR REPLACE FUNCTION update_user_quests_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';

  CREATE TRIGGER update_user_quests_updated_at_trigger
    BEFORE UPDATE ON ${USER_QUESTS_TABLE}
    FOR EACH ROW
    EXECUTE FUNCTION update_user_quests_updated_at();
`;

export const CREATE_QUEST_REQUIREMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${QUEST_REQUIREMENTS_TABLE} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    requirement_type VARCHAR(20) NOT NULL CHECK (requirement_type IN ('referrals', 'commission', 'level', 'achievements', 'clicks')),
    target_value INTEGER NOT NULL CHECK (target_value > 0),
    description VARCHAR(500),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_quest_requirements_quest_id ON ${QUEST_REQUIREMENTS_TABLE}(quest_id);
  CREATE INDEX IF NOT EXISTS idx_quest_requirements_type ON ${QUEST_REQUIREMENTS_TABLE}(requirement_type);
  CREATE INDEX IF NOT EXISTS idx_quest_requirements_order ON ${QUEST_REQUIREMENTS_TABLE}(order_index);
`;

export const CREATE_QUEST_TEMPLATES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${QUEST_TEMPLATES_TABLE} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) UNIQUE NOT NULL,
    quest_type VARCHAR(20) NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'monthly', 'special')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
    base_reward_xp INTEGER NOT NULL CHECK (base_reward_xp >= 0),
    base_reward_commission DECIMAL(10,2) NOT NULL CHECK (base_reward_commission >= 0),
    requirements_template JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_quest_templates_quest_type ON ${QUEST_TEMPLATES_TABLE}(quest_type);
  CREATE INDEX IF NOT EXISTS idx_quest_templates_difficulty ON ${QUEST_TEMPLATES_TABLE}(difficulty);
  CREATE INDEX IF NOT EXISTS idx_quest_templates_is_active ON ${QUEST_TEMPLATES_TABLE}(is_active);

  -- Updated at trigger
  CREATE OR REPLACE FUNCTION update_quest_templates_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';

  CREATE TRIGGER update_quest_templates_updated_at_trigger
    BEFORE UPDATE ON ${QUEST_TEMPLATES_TABLE}
    FOR EACH ROW
    EXECUTE FUNCTION update_quest_templates_updated_at();
`;

// Row Level Security (RLS) Policies

export const QUESTS_RLS_POLICIES = `
  -- Enable RLS
  ALTER TABLE ${QUESTS_TABLE} ENABLE ROW LEVEL SECURITY;

  -- Company users can view quests for their company
  CREATE POLICY "Company users can view quests" ON ${QUESTS_TABLE}
    FOR SELECT USING (
      company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    );

  -- Company admins can manage quests
  CREATE POLICY "Company admins can manage quests" ON ${QUESTS_TABLE}
    FOR ALL USING (
      company_id IN (
        SELECT company_id FROM user_companies
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );
`;

export const USER_QUESTS_RLS_POLICIES = `
  -- Enable RLS
  ALTER TABLE ${USER_QUESTS_TABLE} ENABLE ROW LEVEL SECURITY;

  -- Users can view their own quests
  CREATE POLICY "Users can view their own quests" ON ${USER_QUESTS_TABLE}
    FOR SELECT USING (user_id = auth.uid());

  -- Users can insert their own quests
  CREATE POLICY "Users can insert their own quests" ON ${USER_QUESTS_TABLE}
    FOR INSERT WITH CHECK (user_id = auth.uid());

  -- Users can update their own quest progress
  CREATE POLICY "Users can update their own quests" ON ${USER_QUESTS_TABLE}
    FOR UPDATE USING (user_id = auth.uid());
`;

// Combined schema creation function
export const CREATE_QUEST_SCHEMA_SQL = `
  ${CREATE_QUESTS_TABLE_SQL}
  ${CREATE_USER_QUESTS_TABLE_SQL}
  ${CREATE_QUEST_REQUIREMENTS_TABLE_SQL}
  ${CREATE_QUEST_TEMPLATES_TABLE_SQL}
  ${QUESTS_RLS_POLICIES}
  ${USER_QUESTS_RLS_POLICIES}
`;

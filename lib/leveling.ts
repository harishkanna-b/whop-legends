import { supabaseService } from '@/lib/supabase-client';
import { CharacterClassManager, CharacterClass } from './character-classes';

export interface LevelProgression {
  currentLevel: number;
  currentXP: number;
  totalXP: number;
  xpToNextLevel: number;
  progressPercentage: number;
  levelHistory: LevelHistory[];
}

export interface LevelHistory {
  level: number;
  xp: number;
  achievedAt: string;
  achievement?: string;
}

export interface XPEvent {
  id: string;
  userId: string;
  type: 'referral_created' | 'referral_completed' | 'achievement' | 'bonus' | 'penalty';
  amount: number;
  description: string;
  metadata?: any;
  createdAt: string;
}

export interface LevelUpNotification {
  userId: string;
  oldLevel: number;
  newLevel: number;
  totalXP: number;
  unlocks: string[];
  message: string;
}

export class LevelingManager {
  /**
   * Calculate XP required for a specific level
   */
  static calculateXPRequired(level: number, characterClass?: CharacterClass): number {
    const baseXP = characterClass?.progression.baseXPPerLevel || 100;
    const scaling = characterClass?.progression.xpScaling || 1.15;

    return Math.floor(baseXP * Math.pow(scaling, level - 1));
  }

  /**
   * Calculate total XP required to reach a level from level 1
   */
  static calculateTotalXPToLevel(level: number, characterClass?: CharacterClass): number {
    let totalXP = 0;
    for (let i = 1; i < level; i++) {
      totalXP += this.calculateXPRequired(i, characterClass);
    }
    return totalXP;
  }

  /**
   * Determine user's current level based on total XP
   */
  static calculateLevelFromXP(totalXP: number, characterClass?: CharacterClass): number {
    let level = 1;
    let accumulatedXP = 0;

    while (true) {
      const xpForNextLevel = this.calculateXPRequired(level + 1, characterClass);
      if (accumulatedXP + xpForNextLevel > totalXP) {
        break;
      }
      accumulatedXP += xpForNextLevel;
      level++;
    }

    return level;
  }

  /**
   * Get user's current level progression
   */
  static async getUserProgression(userId: string): Promise<LevelProgression> {
    try {
      // Get user's class assignment
      const userClass = await CharacterClassManager.getUserClass(userId);
      const characterClass = userClass ? CharacterClassManager.getClassById(userClass.classId) : null;

      // Get user's current XP from database
      const { data: userXP, error } = await supabaseService
        .from('user_classes')
        .select('total_xp, level')
        .eq('user_id', userId)
        .single();

      if (error || !userXP) {
        // Return default progression for new users
        return {
          currentLevel: 1,
          currentXP: 0,
          totalXP: 0,
          xpToNextLevel: this.calculateXPRequired(2, characterClass || undefined),
          progressPercentage: 0,
          levelHistory: [],
        };
      }

      const currentLevel = userXP.level;
      const totalXP = userXP.total_xp;
      const xpForCurrentLevel = this.calculateTotalXPToLevel(currentLevel, characterClass || undefined);
      const currentXP = totalXP - xpForCurrentLevel;
      const xpToNextLevel = this.calculateXPRequired(currentLevel + 1, characterClass || undefined);
      const progressPercentage = Math.min(100, (currentXP / xpToNextLevel) * 100);

      // Get level history
      const { data: history } = await supabaseService
        .from('user_level_history')
        .select('*')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });

      const levelHistory: LevelHistory[] = (history || []).map(h => ({
        level: h.level,
        xp: h.xp_at_level,
        achievedAt: h.achieved_at,
        achievement: h.achievement,
      }));

      return {
        currentLevel,
        currentXP,
        totalXP,
        xpToNextLevel,
        progressPercentage,
        levelHistory,
      };
    } catch (error) {
      console.error('Error fetching user progression:', error);
      throw new Error('Failed to fetch user progression');
    }
  }

  /**
   * Add XP to a user and handle level ups
   */
  static async addXP(
    userId: string,
    amount: number,
    type: XPEvent['type'],
    description: string,
    metadata?: any
  ): Promise<{
    progression: LevelProgression;
    levelUps: LevelUpNotification[];
    xpEvent: XPEvent;
  }> {
    try {
      // Get user's current progression
      const currentProgression = await this.getUserProgression(userId);
      const userClass = await CharacterClassManager.getUserClass(userId);
      const characterClass = userClass ? CharacterClassManager.getClassById(userClass.classId) : null;

      // Apply character class XP multiplier
      const multiplier = characterClass?.xpMultiplier || 1;
      const finalAmount = Math.floor(amount * multiplier);

      // Calculate new totals
      const newTotalXP = currentProgression.totalXP + finalAmount;
      const newLevel = this.calculateLevelFromXP(newTotalXP, characterClass || undefined);

      const levelUps: LevelUpNotification[] = [];

      // Check for level ups
      if (newLevel > currentProgression.currentLevel) {
        for (let level = currentProgression.currentLevel + 1; level <= newLevel; level++) {
          const unlocks = this.getLevelUnlocks(level, characterClass || undefined);
          const message = this.generateLevelUpMessage(level, characterClass || undefined);

          levelUps.push({
            userId,
            oldLevel: level - 1,
            newLevel: level,
            totalXP: newTotalXP,
            unlocks,
            message,
          });

          // Record level up in history
          await this.recordLevelUp(userId, level, newTotalXP, unlocks[0]);
        }
      }

      // Update user's XP and level in database
      await this.updateUserXP(userId, newTotalXP, newLevel);

      // Record XP event
      const xpEvent = await this.recordXPEvent(userId, {
        type,
        amount: finalAmount,
        description,
        metadata,
      });

      // Get updated progression
      const newProgression = await this.getUserProgression(userId);

      // Send level up notifications if any
      for (const levelUp of levelUps) {
        await this.sendLevelUpNotification(levelUp);
      }

      return {
        progression: newProgression,
        levelUps,
        xpEvent,
      };
    } catch (error) {
      console.error('Error adding XP:', error);
      throw new Error('Failed to add XP');
    }
  }

  /**
   * Get unlocks available at a specific level
   */
  static getLevelUnlocks(level: number, characterClass?: CharacterClass): string[] {
    if (!characterClass) {
      return [];
    }

    const unlocks: string[] = [];
    characterClass.progression.unlocks.forEach(unlock => {
      if (unlock.startsWith(`Level ${level}:`)) {
        unlocks.push(unlock);
      }
    });

    return unlocks;
  }

  /**
   * Generate level up message
   */
  static generateLevelUpMessage(level: number, characterClass?: CharacterClass): string {
    const className = characterClass?.name || 'Adventurer';
    const emoji = characterClass?.emoji || '⭐';

    const messages = [
      `🎉 Level Up! You've reached level ${level} as a ${className}! ${emoji}`,
      `✨ Congratulations! Level ${level} ${className} achieved! ${emoji}`,
      `🚀 Amazing progress! You're now level ${level} ${className}! ${emoji}`,
      `🌟 Stellar work! Level ${level} ${className} unlocked! ${emoji}`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Update user's XP and level in database
   */
  private static async updateUserXP(userId: string, totalXP: number, level: number) {
    const { error } = await supabaseService
      .from('user_classes')
      .update({
        total_xp: totalXP,
        level: level,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  /**
   * Record XP event in database
   */
  private static async recordXPEvent(userId: string, event: Omit<XPEvent, 'id' | 'userId' | 'createdAt'>): Promise<XPEvent> {
    const { data, error } = await supabaseService
      .from('user_xp_events')
      .insert({
        user_id: userId,
        type: event.type,
        amount: event.amount,
        description: event.description,
        metadata: event.metadata,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      amount: data.amount,
      description: data.description,
      metadata: data.metadata,
      createdAt: data.created_at,
    };
  }

  /**
   * Record level up in history
   */
  private static async recordLevelUp(userId: string, level: number, xp: number, achievement?: string) {
    const { error } = await supabaseService
      .from('user_level_history')
      .insert({
        user_id: userId,
        level: level,
        xp_at_level: xp,
        achievement: achievement,
        achieved_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error recording level up:', error);
    }
  }

  /**
   * Send level up notification (placeholder for real notification system)
   */
  private static async sendLevelUpNotification(notification: LevelUpNotification) {
    console.log(`Level Up Notification: ${notification.message}`);

    // Current notification system implementation:
    // - Database-stored notifications for in-app display
    // - Console logging for development
    // - Extensible for future real-time notifications (WebSocket, email, push)
    try {
      await supabaseService
        .from('user_notifications')
        .insert({
          user_id: notification.userId,
          type: 'level_up',
          title: 'Level Up!',
          message: notification.message,
          metadata: {
            oldLevel: notification.oldLevel,
            newLevel: notification.newLevel,
            unlocks: notification.unlocks,
          },
          read: false,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error storing level up notification:', error);
    }
  }

  /**
   * Calculate XP for different event types
   */
  static calculateXPForEvent(
    type: XPEvent['type'],
    value?: number,
    metadata?: any
  ): number {
    switch (type) {
      case 'referral_created':
        return 10; // Base XP for creating a referral

      case 'referral_completed':
        // XP based on referral value
        const baseXP = 50;
        const valueMultiplier = Math.max(1, Math.floor((value || 0) / 10));
        return baseXP + (valueMultiplier * 5);

      case 'achievement':
        // XP for achievements varies by rarity
        return metadata?.rarity === 'legendary' ? 200 :
               metadata?.rarity === 'epic' ? 150 :
               metadata?.rarity === 'rare' ? 100 : 50;

      case 'bonus':
        // Bonus XP from events, streaks, etc.
        return value || 25;

      case 'penalty':
        // XP penalties (rare, for abuse detection)
        return -(value || 10);

      default:
        return 0;
    }
  }

  /**
   * Get user's XP history
   */
  static async getXPHistory(userId: string, limit: number = 50): Promise<XPEvent[]> {
    try {
      const { data, error } = await supabaseService
        .from('user_xp_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []).map(event => ({
        id: event.id,
        userId: event.user_id,
        type: event.type,
        amount: event.amount,
        description: event.description,
        metadata: event.metadata,
        createdAt: event.created_at,
      }));
    } catch (error) {
      console.error('Error fetching XP history:', error);
      return [];
    }
  }

  /**
   * Get leaderboard rankings by level and XP
   */
  static async getLeaderboard(limit: number = 10, classFilter?: string) {
    try {
      let query = supabaseService
        .from('user_classes')
        .select(`
          user_id,
          level,
          total_xp,
          class_id,
          users!user_classes_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .order('level', { ascending: false })
        .order('total_xp', { ascending: false })
        .limit(limit);

      if (classFilter) {
        query = query.eq('class_id', classFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map((entry, index) => ({
        rank: index + 1,
        userId: entry.user_id,
        username: entry.users?.[0]?.username || 'Anonymous',
        avatarUrl: entry.users?.[0]?.avatar_url,
        level: entry.level,
        totalXP: entry.total_xp,
        classId: entry.class_id,
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }
}
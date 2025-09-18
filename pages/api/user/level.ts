import { NextApiRequest, NextApiResponse } from 'next';
import { LevelingManager } from '@/lib/leveling';
import { CharacterClassManager } from '@/lib/character-classes';
import { withAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userId = req.userId; // Set by auth middleware
    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGet(req, res, userId);
      case 'POST':
        return await handlePost(req, res, userId);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Leveling API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// GET /api/user/level - Get user's level progression
async function handleGet(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { history, leaderboard } = req.query;

    // Get user's progression
    const progression = await LevelingManager.getUserProgression(userId);

    const response: any = {
      success: true,
      data: {
        progression,
      },
    };

    // Include XP history if requested
    if (history === 'true') {
      const xpHistory = await LevelingManager.getXPHistory(userId, 50);
      response.data.xpHistory = xpHistory;
    }

    // Include leaderboard if requested
    if (leaderboard === 'true') {
      const userClass = await CharacterClassManager.getUserClass(userId);
      const classFilter = userClass?.classId;
      const leaderboardData = await LevelingManager.getLeaderboard(10, classFilter);
      response.data.leaderboard = leaderboardData;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching level progression:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch level progression',
    });
  }
}

// POST /api/user/level - Add XP to user (for testing/admin)
async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { amount, type, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number',
      });
    }

    if (!type || !['referral_created', 'referral_completed', 'achievement', 'bonus', 'penalty'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be one of: referral_created, referral_completed, achievement, bonus, penalty',
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required',
      });
    }

    // Add XP to user
    const result = await LevelingManager.addXP(userId, amount, type, description, metadata);

    return res.status(200).json({
      success: true,
      data: {
        progression: result.progression,
        levelUps: result.levelUps,
        xpEvent: result.xpEvent,
      },
      message: `Added ${amount} XP to user`,
    });
  } catch (error) {
    console.error('Error adding XP:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add XP',
    });
  }
}

export default withAuth(handler);
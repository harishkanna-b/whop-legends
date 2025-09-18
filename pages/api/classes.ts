import { NextApiRequest, NextApiResponse } from 'next';
import { CharacterClassManager } from '@/lib/character-classes';
import { LevelingManager } from '@/lib/leveling';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Classes API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// GET /api/classes - Get available classes and leaderboard
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { leaderboard, classId, limit } = req.query;

    // Get all available classes
    const availableClasses = CharacterClassManager.getAvailableClasses();

    const response: any = {
      success: true,
      data: {
        classes: availableClasses,
      },
    };

    // Include leaderboard if requested
    if (leaderboard === 'true') {
      const leaderboardLimit = limit ? parseInt(limit as string) : 10;
      const leaderboardData = await LevelingManager.getLeaderboard(
        leaderboardLimit,
        classId as string
      );
      response.data.leaderboard = leaderboardData;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch classes',
    });
  }
}

export default handler;
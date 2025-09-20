import { NextApiRequest, NextApiResponse } from 'next';
import { CharacterClassManager } from '@/lib/character-classes';
import { withAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userId = req.userId; // Set by auth middleware
    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGet(req, res, userId || '');
      case 'POST':
        return await handlePost(req, res, userId || '');
      case 'PUT':
        return await handlePut(req, res, userId || '');
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Character class API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// GET /api/user/class - Get user's current class and available classes
async function handleGet(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // Get user's current class
    const userClass = await CharacterClassManager.getUserClass(userId);

    // Get all available classes
    const availableClasses = CharacterClassManager.getAvailableClasses();

    // Get class recommendation if user doesn't have a class
    let recommendation = null;
    if (!userClass) {
      recommendation = await CharacterClassManager.recommendClass(userId);
    }

    return res.status(200).json({
      success: true,
      data: {
        currentClass: userClass,
        availableClasses,
        recommendation,
      },
    });
  } catch (error) {
    console.error('Error fetching character class:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch character class information',
    });
  }
}

// POST /api/user/class - Select a character class
async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'Class ID is required',
      });
    }

    // Check if user already has a class
    const existingClass = await CharacterClassManager.getUserClass(userId);
    if (existingClass) {
      return res.status(400).json({
        success: false,
        error: 'User already has a character class. Use PUT to change class.',
      });
    }

    // Assign the class
    const assignment = await CharacterClassManager.assignClass(userId, classId, 'manual');

    return res.status(201).json({
      success: true,
      data: {
        assignment,
        message: `Successfully assigned ${assignment.classId} class`,
      },
    });
  } catch (error) {
    console.error('Error assigning character class:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid character class')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message.includes('Requires at least') || error.message.includes('Too many referrals')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to assign character class',
    });
  }
}

// PUT /api/user/class - Change character class
async function handlePut(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { classId, reason } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'Class ID is required',
      });
    }

    // Check if user has an existing class
    const existingClass = await CharacterClassManager.getUserClass(userId);
    if (!existingClass) {
      return res.status(400).json({
        success: false,
        error: 'User does not have a character class. Use POST to select a class.',
      });
    }

    // Check if trying to change to the same class
    if (existingClass.classId === classId) {
      return res.status(400).json({
        success: false,
        error: 'User already has this character class',
      });
    }

    // Assign the new class
    const assignment = await CharacterClassManager.assignClass(userId, classId, 'manual', reason);

    return res.status(200).json({
      success: true,
      data: {
        assignment,
        message: `Successfully changed to ${assignment.classId} class`,
      },
    });
  } catch (error) {
    console.error('Error changing character class:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid character class')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message.includes('Requires at least') || error.message.includes('Too many referrals')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to change character class',
    });
  }
}

export default withAuth(handler);
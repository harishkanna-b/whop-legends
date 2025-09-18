import { NextApiRequest, NextApiResponse } from 'next';

// Simple auth middleware for development
export function withAuth(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // For development, we'll use a simple header-based auth
      // In production, this should use proper JWT validation
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized - Missing or invalid token' });
      }

      const token = authHeader.substring(7);

      // For development, accept any token that looks valid
      if (token.length < 10) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      // Set userId from token (in production, decode JWT)
      req.userId = token; // For demo, use token as userId

      return await handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Extend NextApiRequest to include userId
declare module 'next' {
  interface NextApiRequest {
    userId?: string;
  }
}
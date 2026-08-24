import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/token.util.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let token = '';

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]!;
    } else if (req.headers.cookie) {
      const cookieToken = req.headers.cookie
        .split(';')
        .find((c) => c.trim().startsWith('token='))
        ?.split('=')[1];
      if (cookieToken) {
        token = cookieToken;
      }
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

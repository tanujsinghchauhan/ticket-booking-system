import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WaitlistService } from './waitlist.service.js';

export const joinWaitlistSchema = z.object({
  showId: z.string().uuid('Show ID must be a valid UUID'),
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
});

export class WaitlistController {
  static async join(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedData = joinWaitlistSchema.parse(req.body);
      const customerId = req.user!.userId;

      const entry = await WaitlistService.joinWaitlist(parsedData.showId, parsedData.categoryId, customerId);
      return res.status(201).json({
        message: 'Joined waitlist successfully',
        entry,
      });
    } catch (err) {
      next(err);
    }
  }

  static async claim(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: 'Token query parameter is required' });
      }

      const booking = await WaitlistService.claimOffer(token);
      return res.status(200).json({
        message: 'Seat claimed successfully',
        booking,
      });
    } catch (err) {
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { SeatsService } from './seats.service.js';

export class SeatsController {
  static async getSeatMap(req: Request, res: Response, next: NextFunction) {
    try {
      const showId = req.params.id as string;
      const result = await SeatsService.getSeatMap(showId);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async holdSeat(req: Request, res: Response, next: NextFunction) {
    try {
      const showId = req.params.id as string;
      const seatId = req.params.seatId as string;
      const userId = req.user!.userId;

      const result = await SeatsService.holdSeat(showId, seatId, userId);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async releaseSeat(req: Request, res: Response, next: NextFunction) {
    try {
      const showId = req.params.id as string;
      const seatId = req.params.seatId as string;
      const userId = req.user!.userId;

      const result = await SeatsService.releaseSeat(showId, seatId, userId);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

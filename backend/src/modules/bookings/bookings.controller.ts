import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BookingsService } from './bookings.service.js';

export const confirmBookingSchema = z.object({
  showSeatIds: z.array(z.string().uuid('Seat ID must be a valid UUID')).min(1, 'At least one seat must be selected'),
});

export class BookingsController {
  static async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedData = confirmBookingSchema.parse(req.body);
      const userId = req.user!.userId;
      const userEmail = req.user!.email;

      const booking = await BookingsService.confirmBooking(parsedData.showSeatIds, userId, userEmail);
      return res.status(201).json({
        message: 'Booking confirmed successfully',
        booking,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const booking = await BookingsService.cancelBooking(bookingId, userId, userRole);
      return res.status(200).json({
        message: 'Booking cancelled successfully',
        booking,
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const bookings = await BookingsService.listMyBookings(userId);
      return res.status(200).json({ bookings });
    } catch (err) {
      next(err);
    }
  }
}

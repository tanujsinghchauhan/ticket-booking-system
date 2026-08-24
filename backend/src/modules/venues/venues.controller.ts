import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VenuesService } from './venues.service.js';

export const createVenueSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export const bulkCreateSeatsSchema = z.object({
  seats: z.array(
    z.object({
      row: z.string().min(1, 'Row is required'),
      number: z.number().int().positive('Number must be positive'),
      categoryId: z.string().uuid('Category ID must be a valid UUID'),
      label: z.string().optional(),
    })
  ).min(1, 'At least one seat is required'),
});

export class VenuesController {
  static async createVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedData = createVenueSchema.parse(req.body);
      const ownerId = req.user!.userId;
      const venue = await VenuesService.createVenue({ ...parsedData, ownerId });
      return res.status(201).json({
        message: 'Venue created successfully',
        venue,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listVenues(req: Request, res: Response, next: NextFunction) {
    try {
      const venues = await VenuesService.listVenues();
      return res.status(200).json({ venues });
    } catch (err) {
      next(err);
    }
  }

  static async getVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const venue = await VenuesService.getVenue(req.params.id as string);
      return res.status(200).json({ venue });
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedData = createCategorySchema.parse(req.body);
      const category = await VenuesService.createCategory(req.params.id as string, parsedData);
      return res.status(201).json({
        message: 'Seat category created successfully',
        category,
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkCreateSeats(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedData = bulkCreateSeatsSchema.parse(req.body);
      const result = await VenuesService.bulkCreateSeats(req.params.id as string, parsedData);
      return res.status(201).json({
        message: 'Seats created successfully',
        count: result.count,
      });
    } catch (err) {
      next(err);
    }
  }
}

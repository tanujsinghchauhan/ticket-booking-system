import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EventsService } from './events.service.js';

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['MOVIE', 'CONCERT']),
  description: z.string().optional(),
});

export const createShowSchema = z.object({
  venueId: z.string().uuid('Venue ID must be a valid UUID'),
  startsAt: z.string().transform((val) => new Date(val)),
  prices: z.array(
    z.object({
      categoryId: z.string().uuid('Category ID must be a valid UUID'),
      price: z.number().positive('Price must be positive'),
    })
  ).min(1, 'Pricing is required for at least one seat category'),
});

export class EventsController {
  static async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedData = createEventSchema.parse(req.body);
      const organiserId = req.user!.userId;
      const event = await EventsService.createEvent({
        title: parsedData.title,
        type: parsedData.type,
        description: parsedData.description ?? null,
        organiserId,
      });
      return res.status(201).json({
        message: 'Event created successfully',
        event,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createShow(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedData = createShowSchema.parse(req.body);
      const show = await EventsService.createShow(req.params.id as string, parsedData);
      return res.status(201).json({
        message: 'Show scheduled successfully',
        show,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.query.type as string | undefined;
      const title = req.query.title as string | undefined;
      const filters: { type?: string; title?: string } = {};
      if (type) filters.type = type;
      if (title) filters.title = title;

      const events = await EventsService.listEvents(filters);
      return res.status(200).json({ events });
    } catch (err) {
      next(err);
    }
  }

  static async getEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await EventsService.getEvent(req.params.id as string);
      return res.status(200).json({ event });
    } catch (err) {
      next(err);
    }
  }
}

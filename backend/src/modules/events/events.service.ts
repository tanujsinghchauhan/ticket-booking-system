import { prisma } from '../../config/db.js';
import { NotFoundError } from '../../middleware/error.middleware.js';

export class EventsService {
  static async createEvent(data: { title: string; type: string; description?: string | null; organiserId: string }) {
    return prisma.event.create({
      data: {
        title: data.title,
        type: data.type,
        description: data.description ?? null,
        organiserId: data.organiserId,
      },
    });
  }

  static async createShow(
    eventId: string,
    data: { venueId: string; startsAt: Date; prices: { categoryId: string; price: number }[] }
  ) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const venue = await prisma.venue.findUnique({ where: { id: data.venueId } });
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    return prisma.$transaction(async (tx) => {
      const show = await tx.show.create({
        data: {
          eventId,
          venueId: data.venueId,
          startsAt: data.startsAt,
        },
      });

      if (data.prices.length > 0) {
        await tx.showCategoryPrice.createMany({
          data: data.prices.map((p) => ({
            showId: show.id,
            categoryId: p.categoryId,
            price: p.price,
          })),
        });
      }

      const seats = await tx.seat.findMany({
        where: { venueId: data.venueId },
      });

      if (seats.length > 0) {
        await tx.showSeat.createMany({
          data: seats.map((seat) => ({
            showId: show.id,
            seatId: seat.id,
            status: 'AVAILABLE',
          })),
        });
      }

      return tx.show.findUnique({
        where: { id: show.id },
        include: {
          prices: true,
          showSeats: true,
        },
      });
    });
  }

  static async listEvents(filters?: { type?: string; title?: string }) {
    const where: any = {};
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.title) {
      where.title = {
        contains: filters.title,
        mode: 'insensitive',
      };
    }

    return prisma.event.findMany({
      where,
      include: {
        shows: {
          include: {
            venue: true,
            prices: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });
  }

  static async getEvent(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        shows: {
          include: {
            venue: true,
            prices: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return event;
  }
}

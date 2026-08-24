import { prisma } from '../../config/db.js';
import { NotFoundError } from '../../middleware/error.middleware.js';

export class VenuesService {
  static async createVenue(data: { name: string; address: string; ownerId: string }) {
    return prisma.venue.create({
      data: {
        name: data.name,
        address: data.address,
        ownerId: data.ownerId,
      },
    });
  }

  static async listVenues() {
    return prisma.venue.findMany({
      include: {
        seatCategories: true,
      },
    });
  }

  static async getVenue(id: string) {
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        seatCategories: true,
        seats: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    return venue;
  }

  static async createCategory(venueId: string, data: { name: string }) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    return prisma.seatCategory.create({
      data: {
        venueId,
        name: data.name,
      },
    });
  }

  static async bulkCreateSeats(
    venueId: string,
    data: { seats: { row: string; number: number; categoryId: string; label?: string | null | undefined }[] }
  ) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    const categories = await prisma.seatCategory.findMany({
      where: { venueId },
    });
    const categoryIds = new Set(categories.map((c) => c.id));

    for (const seat of data.seats) {
      if (!categoryIds.has(seat.categoryId)) {
        throw new NotFoundError(`SeatCategory ${seat.categoryId} not found for this venue`);
      }
    }

    const seatsData = data.seats.map((seat) => ({
      venueId,
      categoryId: seat.categoryId,
      row: seat.row,
      number: seat.number,
      label: seat.label || `${seat.row}${seat.number}`,
    }));

    return prisma.seat.createMany({
      data: seatsData,
      skipDuplicates: true,
    });
  }
}

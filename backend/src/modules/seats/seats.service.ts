import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { emitSeatUpdate } from '../../config/socket.js';
import { ConflictError, NotFoundError } from '../../middleware/error.middleware.js';

export class SeatsService {
  static async getSeatMap(showId: string) {
    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        event: true,
        venue: true,
        prices: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!show) {
      throw new NotFoundError('Show not found');
    }

    const seats = await prisma.showSeat.findMany({
      where: { showId },
      include: {
        seat: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [
        { seat: { row: 'asc' } },
        { seat: { number: 'asc' } },
      ],
    });

    return { show, seats };
  }

  static async holdSeat(showId: string, seatId: string, userId: string) {
    const showSeat = await prisma.showSeat.findUnique({
      where: { id: seatId },
    });

    if (!showSeat || showSeat.showId !== showId) {
      throw new NotFoundError('Seat not found for this show');
    }

    const ttlMs = env.SEAT_HOLD_TTL_MINUTES * 60 * 1000;
    const heldUntil = new Date(Date.now() + ttlMs);

    const result = await prisma.showSeat.updateMany({
      where: {
        id: seatId,
        status: 'AVAILABLE',
      },
      data: {
        status: 'HELD',
        heldBy: userId,
        heldUntil,
      },
    });

    if (result.count === 0) {
      throw new ConflictError('Seat is no longer available');
    }

    emitSeatUpdate(showId, 'seat:held', {
      seatId,
      heldBy: userId,
      heldUntil,
    });

    return {
      message: 'Seat hold successful',
      heldUntil,
    };
  }

  static async releaseSeat(showId: string, seatId: string, userId?: string) {
    const showSeat = await prisma.showSeat.findUnique({
      where: { id: seatId },
    });

    if (!showSeat || showSeat.showId !== showId) {
      throw new NotFoundError('Seat not found for this show');
    }

    const whereClause: any = {
      id: seatId,
      status: 'HELD',
    };

    if (userId) {
      whereClause.heldBy = userId;
    }

    const result = await prisma.showSeat.updateMany({
      where: whereClause,
      data: {
        status: 'AVAILABLE',
        heldBy: null,
        heldUntil: null,
      },
    });

    if (result.count === 0) {
      throw new ConflictError('Seat cannot be released (not held or already released/booked)');
    }

    emitSeatUpdate(showId, 'seat:released', {
      seatId,
    });

    return { message: 'Seat released successfully' };
  }
}

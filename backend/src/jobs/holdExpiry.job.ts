import cron from 'node-cron';
import { prisma } from '../config/db.js';
import { emitSeatUpdate } from '../config/socket.js';

export function initHoldExpiryJob() {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();
      const expiredSeats = await prisma.showSeat.findMany({
        where: {
          status: 'HELD',
          heldUntil: { lt: now },
        },
      });

      if (expiredSeats.length === 0) return;

      const activeOffers = await prisma.waitlistEntry.findMany({
        where: { status: 'OFFERED' },
        select: { showId: true, customerId: true },
      });

      const offerKeys = new Set(activeOffers.map((o) => `${o.showId}-${o.customerId}`));

      for (const seat of expiredSeats) {
        const key = `${seat.showId}-${seat.heldBy}`;
        if (offerKeys.has(key)) {
          continue;
        }

        await prisma.$transaction(async (tx) => {
          const result = await tx.showSeat.updateMany({
            where: {
              id: seat.id,
              status: 'HELD',
            },
            data: {
              status: 'AVAILABLE',
              heldBy: null,
              heldUntil: null,
            },
          });

          if (result.count > 0) {
            console.log(`[Hold Expiry Job] Released seat hold: ${seat.id} (show: ${seat.showId})`);
            emitSeatUpdate(seat.showId, 'seat:released', { seatId: seat.id });
          }
        });
      }
    } catch (err) {
      console.error('[Hold Expiry Job Error]:', err);
    }
  });
}

import { prisma } from '../config/db.js';

export async function generateBookingRef(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let ref = '';

  while (!isUnique) {
    ref = 'TKT-';
    for (let i = 0; i < 8; i++) {
      ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = await prisma.booking.findUnique({
      where: { bookingRef: ref },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return ref;
}

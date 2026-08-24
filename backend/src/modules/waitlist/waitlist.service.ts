import { generateQRCode } from '../../utils/qrcode.util.js';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { emitSeatUpdate } from '../../config/socket.js';
import { sendMail } from '../../config/mailer.js';
import { generateOfferToken, verifyOfferToken } from '../../utils/token.util.js';
import { generateBookingRef } from '../../utils/bookingRef.util.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../middleware/error.middleware.js';

export class WaitlistService {
  static async checkAndOfferSeat(showId: string, categoryId: string, seatId: string) {
    try {
      const nextWaiting = await prisma.$transaction(async (tx) => {
        const waitingEntry = await tx.waitlistEntry.findFirst({
          where: {
            showId,
            categoryId,
            status: 'WAITING',
          },
          orderBy: {
            position: 'asc',
          },
          include: {
            customer: true,
          },
        });

        if (!waitingEntry) {
          return null;
        }

        const ttlMs = env.WAITLIST_OFFER_TTL_MINUTES * 60 * 1000;
        const offerExpiresAt = new Date(Date.now() + ttlMs);

        const holdResult = await tx.showSeat.updateMany({
          where: {
            id: seatId,
            status: 'AVAILABLE',
          },
          data: {
            status: 'HELD',
            heldBy: waitingEntry.customerId,
            heldUntil: offerExpiresAt,
          },
        });

        if (holdResult.count === 0) {
          return null;
        }

        const offerToken = generateOfferToken(
          {
            waitlistEntryId: waitingEntry.id,
            showId,
            categoryId,
            customerId: waitingEntry.customerId,
          },
          env.WAITLIST_OFFER_TTL_MINUTES * 60
        );

        const updatedEntry = await tx.waitlistEntry.update({
          where: { id: waitingEntry.id },
          data: {
            status: 'OFFERED',
            offerExpiresAt,
            offerToken,
          },
          include: {
            customer: true,
          },
        });

        return { entry: updatedEntry, offerExpiresAt, offerToken };
      });

      if (!nextWaiting) {
        emitSeatUpdate(showId, 'seat:released', { seatId });
        return;
      }

      const claimLink = `${env.FRONTEND_URL}/waitlist/claim?token=${nextWaiting.offerToken}`;
      sendMail({
        to: nextWaiting.entry.customer.email,
        subject: 'Ticket Booking - Seat Offer Available!',
        html: `
          <h3>A seat has opened up for your show!</h3>
          <p>You have been offered a seat in category: <strong>${nextWaiting.entry.categoryId}</strong></p>
          <p>Please claim this seat within ${env.WAITLIST_OFFER_TTL_MINUTES} minutes by clicking the link below:</p>
          <p><a href="${claimLink}">${claimLink}</a></p>
          <p>If not claimed in time, this offer will expire and be given to the next person on the waitlist.</p>
        `,
      }).catch((err) => console.error('Error sending waitlist offer email:', err));

      emitSeatUpdate(showId, 'seat:held', {
        seatId,
        heldBy: nextWaiting.entry.customerId,
        heldUntil: nextWaiting.offerExpiresAt,
      });
    } catch (err) {
      console.error('[checkAndOfferSeat error]:', err);
    }
  }

  static async joinWaitlist(showId: string, categoryId: string, customerId: string) {
    const show = await prisma.show.findUnique({
      where: { id: showId },
    });
    if (!show) {
      throw new NotFoundError('Show not found');
    }

    const category = await prisma.seatCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundError('Seat category not found');
    }

    const availableSeatsCount = await prisma.showSeat.count({
      where: {
        showId,
        status: 'AVAILABLE',
        seat: { categoryId },
      },
    });

    if (availableSeatsCount > 0) {
      throw new ConflictError('There are still available seats in this category');
    }

    const existingWaitlist = await prisma.waitlistEntry.findFirst({
      where: {
        showId,
        categoryId,
        customerId,
        status: 'WAITING',
      },
    });

    if (existingWaitlist) {
      throw new ConflictError('You are already on the waitlist for this category');
    }

    return prisma.$transaction(async (tx) => {
      const lastEntry = await tx.waitlistEntry.findFirst({
        where: {
          showId,
          categoryId,
          status: { in: ['WAITING', 'OFFERED'] },
        },
        orderBy: { position: 'desc' },
      });

      const nextPosition = lastEntry ? lastEntry.position + 1 : 1;

      return tx.waitlistEntry.create({
        data: {
          showId,
          categoryId,
          customerId,
          status: 'WAITING',
          position: nextPosition,
        },
      });
    });
  }

  static async claimOffer(token: string) {
    let decoded;
    try {
      decoded = verifyOfferToken(token);
    } catch (err) {
      throw new BadRequestError('Invalid or expired offer token');
    }

    const { waitlistEntryId, showId, categoryId, customerId } = decoded;

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.waitlistEntry.findUnique({
        where: { id: waitlistEntryId },
        include: {
          customer: true,
        },
      });

      if (!entry || entry.status !== 'OFFERED') {
        throw new ConflictError('Offer is no longer valid or has expired');
      }

      if (entry.offerExpiresAt && entry.offerExpiresAt < new Date()) {
        throw new ConflictError('Offer has expired');
      }

      const showSeat = await tx.showSeat.findFirst({
        where: {
          showId,
          seat: { categoryId },
          status: 'HELD',
          heldBy: customerId,
        },
      });

      if (!showSeat) {
        throw new ConflictError('The offered seat is no longer held for you');
      }

      const bookingRef = await generateBookingRef();
      const qrCodeUrl = await generateQRCode(bookingRef);

      const categoryPrice = await tx.showCategoryPrice.findFirst({
        where: { showId, categoryId },
      });
      if (!categoryPrice) {
        throw new BadRequestError('Price not configured for category');
      }
      const totalAmount = Number(categoryPrice.price);

      const booking = await tx.booking.create({
        data: {
          bookingRef,
          customerId,
          showId,
          totalAmount,
          qrCodeUrl,
        },
      });

      const updateSeatResult = await tx.showSeat.updateMany({
        where: {
          id: showSeat.id,
          status: 'HELD',
          heldBy: customerId,
        },
        data: {
          status: 'BOOKED',
          bookingId: booking.id,
        },
      });

      if (updateSeatResult.count === 0) {
        throw new ConflictError('Failed to claim seat');
      }

      await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'CONVERTED' },
      });

      return { booking, seatId: showSeat.id, customerEmail: entry.customer.email };
    });

    emitSeatUpdate(showId, 'seat:booked', {
      seatId: result.seatId,
      bookingId: result.booking.id,
    });

    const qrAttachment = {
      filename: 'ticket-qr.png',
      content: result.booking.qrCodeUrl!.split(';base64,').pop(),
      encoding: 'base64',
      cid: 'ticket-qr',
    };

    sendMail({
      to: result.customerEmail,
      subject: `Your Booking Confirmation (Waitlist Claim) - ${result.booking.bookingRef}`,
      html: `
        <h3>Thank you for your booking!</h3>
        <p>You have successfully claimed your waitlist offer!</p>
        <p>Booking Reference: <strong>${result.booking.bookingRef}</strong></p>
        <p>Total Amount: $${result.booking.totalAmount.toFixed(2)}</p>
        <p>Please find your ticket QR code below:</p>
        <img src="cid:ticket-qr" alt="Ticket QR Code" />
      `,
      attachments: [qrAttachment as any],
    }).catch((err) => console.error('Error sending waitlist claim email:', err));

    return result.booking;
  }

  static async expireOffers() {
    const expiredEntries = await prisma.waitlistEntry.findMany({
      where: {
        status: 'OFFERED',
        offerExpiresAt: { lt: new Date() },
      },
    });

    for (const entry of expiredEntries) {
      try {
        console.log(`Expiring waitlist offer ${entry.id} for customer ${entry.customerId}`);

        const releasedSeatId = await prisma.$transaction(async (tx) => {
          await tx.waitlistEntry.update({
            where: { id: entry.id },
            data: { status: 'EXPIRED' },
          });

          const showSeat = await tx.showSeat.findFirst({
            where: {
              showId: entry.showId,
              seat: { categoryId: entry.categoryId },
              status: 'HELD',
              heldBy: entry.customerId,
            },
          });

          if (showSeat) {
            await tx.showSeat.update({
              where: { id: showSeat.id },
              data: {
                status: 'AVAILABLE',
                heldBy: null,
                heldUntil: null,
              },
            });
            return showSeat.id;
          }
          return null;
        });

        if (releasedSeatId) {
          await WaitlistService.checkAndOfferSeat(entry.showId, entry.categoryId, releasedSeatId);
        }
      } catch (err) {
        console.error(`Failed to expire waitlist entry ${entry.id}:`, err);
      }
    }
  }
}

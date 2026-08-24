import { generateQRCode } from '../../utils/qrcode.util.js';
import { prisma } from '../../config/db.js';
import { emitSeatUpdate } from '../../config/socket.js';
import { sendMail } from '../../config/mailer.js';
import { generateBookingRef } from '../../utils/bookingRef.util.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../middleware/error.middleware.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';

export class BookingsService {
  static async confirmBooking(showSeatIds: string[], userId: string, userEmail: string) {
    if (showSeatIds.length === 0) {
      throw new BadRequestError('At least one seat must be selected');
    }

    const heldSeats = await prisma.showSeat.findMany({
      where: {
        id: { in: showSeatIds },
        status: 'HELD',
        heldBy: userId,
        heldUntil: { gt: new Date() },
      },
      include: {
        seat: true,
      },
    });

    if (heldSeats.length !== showSeatIds.length) {
      throw new ConflictError('Some seat holds have expired or are invalid');
    }

    const showId = heldSeats[0]!.showId;
    const allSameShow = heldSeats.every((s) => s.showId === showId);
    if (!allSameShow) {
      throw new BadRequestError('All seats must belong to the same show');
    }

    const prices = await prisma.showCategoryPrice.findMany({
      where: { showId },
    });
    const priceMap = new Map(prices.map((p) => [p.categoryId, Number(p.price)]));

    let totalAmount = 0;
    for (const hs of heldSeats) {
      const price = priceMap.get(hs.seat.categoryId);
      if (price === undefined) {
        throw new BadRequestError(`Price not configured for seat category ${hs.seat.categoryId}`);
      }
      totalAmount += price;
    }

    const bookingRef = await generateBookingRef();
    const qrCodeUrl = await generateQRCode(bookingRef);

    const booking = await prisma.$transaction(async (tx) => {
      const createdBooking = await tx.booking.create({
        data: {
          bookingRef,
          customerId: userId,
          showId,
          totalAmount,
          qrCodeUrl,
        },
      });

      const result = await tx.showSeat.updateMany({
        where: {
          id: { in: showSeatIds },
          status: 'HELD',
          heldBy: userId,
          heldUntil: { gt: new Date() },
        },
        data: {
          status: 'BOOKED',
          bookingId: createdBooking.id,
        },
      });

      if (result.count !== showSeatIds.length) {
        throw new ConflictError('Seat holds expired during booking transaction');
      }

      return createdBooking;
    });

    for (const seatId of showSeatIds) {
      emitSeatUpdate(showId, 'seat:booked', {
        seatId,
        bookingId: booking.id,
      });
    }

    const qrAttachment = {
      filename: 'ticket-qr.png',
      content: qrCodeUrl.split(';base64,').pop(),
      encoding: 'base64',
      cid: 'ticket-qr',
    };

    sendMail({
      to: userEmail,
      subject: `Your Booking Confirmation - ${bookingRef}`,
      html: `
        <h3>Thank you for your booking!</h3>
        <p>Booking Reference: <strong>${bookingRef}</strong></p>
        <p>Total Amount: $${totalAmount.toFixed(2)}</p>
        <p>Please find your ticket QR code below:</p>
        <img src="cid:ticket-qr" alt="Ticket QR Code" />
      `,
      attachments: [qrAttachment as any],
    }).catch((err) => console.error('Error sending booking confirmation email:', err));

    return booking;
  }

  static async cancelBooking(bookingId: string, userId: string, userRole: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seats: {
          include: {
            seat: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (userRole !== 'ADMIN' && booking.customerId !== userId) {
      throw new ConflictError('You are not authorized to cancel this booking');
    }

    if (booking.status === 'CANCELLED') {
      throw new ConflictError('Booking is already cancelled');
    }

    const cancelledBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      await tx.showSeat.updateMany({
        where: { bookingId },
        data: {
          status: 'AVAILABLE',
          heldBy: null,
          heldUntil: null,
          bookingId: null,
        },
      });

      return updated;
    });

    for (const showSeat of booking.seats) {
      await WaitlistService.checkAndOfferSeat(booking.showId, showSeat.seat.categoryId, showSeat.id);
    }

    return cancelledBooking;
  }

  static async listMyBookings(userId: string) {
    const bookings = await prisma.booking.findMany({
      where: { customerId: userId },
      include: {
        seats: {
          include: {
            seat: true,
            show: {
              include: {
                event: true,
                venue: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => {
      const show = b.seats[0]?.show || null;
      return {
        ...b,
        show,
      };
    });
  }
}

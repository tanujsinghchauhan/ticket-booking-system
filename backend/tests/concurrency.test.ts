import request from 'supertest';
import { prisma } from '../src/config/db.js';
import app from '../src/app.js';
import { generateToken } from '../src/utils/token.util.js';
import { Role } from '@prisma/client';

describe('Seat Hold Concurrency Integration Test', () => {
  let showId: string;
  let seatId: string;
  let adminToken: string;
  const userTokens: string[] = [];
  const userIds: string[] = [];
  const NUM_CONCURRENT_REQUESTS = 20;

  beforeAll(async () => {
    await prisma.showSeat.deleteMany({});
    await prisma.showCategoryPrice.deleteMany({});
    await prisma.show.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.seat.deleteMany({});
    await prisma.seatCategory.deleteMany({});
    await prisma.venue.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.waitlistEntry.deleteMany({});
    await prisma.user.deleteMany({});

    const admin = await prisma.user.create({
      data: {
        email: 'admin@concurrencytest.com',
        name: 'Admin User',
        password: 'password123',
        role: Role.ADMIN,
      },
    });

    adminToken = generateToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    for (let i = 1; i <= NUM_CONCURRENT_REQUESTS; i++) {
      const user = await prisma.user.create({
        data: {
          email: `customer${i}@concurrencytest.com`,
          name: `Customer ${i}`,
          password: 'password123',
          role: Role.CUSTOMER,
        },
      });
      userIds.push(user.id);
      userTokens.push(
        generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        })
      );
    }

    const venue = await prisma.venue.create({
      data: {
        name: 'Concurrency Arena',
        address: '123 Test St',
        ownerId: admin.id,
      },
    });

    const category = await prisma.seatCategory.create({
      data: {
        venueId: venue.id,
        name: 'Standard VIP',
      },
    });

    const seat = await prisma.seat.create({
      data: {
        venueId: venue.id,
        categoryId: category.id,
        row: 'A',
        number: 1,
        label: 'A1',
      },
    });
    seatId = seat.id;

    const event = await prisma.event.create({
      data: {
        title: 'Concurrency Rock Show',
        type: 'CONCERT',
        organiserId: admin.id,
      },
    });

    const show = await prisma.show.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    showId = show.id;

    await prisma.showSeat.create({
      data: {
        showId: show.id,
        seatId: seat.id,
        status: 'AVAILABLE',
      },
    });

    await prisma.showCategoryPrice.create({
      data: {
        showId: show.id,
        categoryId: category.id,
        price: 99.99,
      },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow exactly 1 concurrent request to succeed, and reject all others with 409', async () => {
    const holdRequests = userTokens.map((token) =>
      request(app)
        .post(`/api/shows/${showId}/seats/${seatId}/hold`)
        .set('Authorization', `Bearer ${token}`)
        .send()
    );

    const responses = await Promise.all(holdRequests);

    const successes = responses.filter((res) => res.status === 200);
    const conflicts = responses.filter((res) => res.status === 409);

    console.log(
      `[Concurrency Test Result] Total: ${responses.length}, Successes: ${successes.length}, Conflicts: ${conflicts.length}`
    );

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(NUM_CONCURRENT_REQUESTS - 1);

    const showSeat = await prisma.showSeat.findUnique({
      where: { showId_seatId: { showId, seatId } },
    });

    expect(showSeat?.status).toBe('HELD');
    expect(showSeat?.heldBy).not.toBeNull();
    expect(userIds).toContain(showSeat?.heldBy);
  }, 20000);
});

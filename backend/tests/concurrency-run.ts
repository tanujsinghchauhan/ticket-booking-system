import request from 'supertest';
import { prisma } from '../src/config/db.js';
import app from '../src/app.js';
import { generateToken } from '../src/utils/token.util.js';
import { Role } from '@prisma/client';

async function run() {
  console.log('--- Starting Seat Hold Concurrency Test ---');
  let showId: string;
  let seatId: string;
  let adminToken: string;
  const userTokens: string[] = [];
  const userIds: string[] = [];
  const NUM_CONCURRENT_REQUESTS = 20;

  try {
    await prisma.waitlistEntry.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.showSeat.deleteMany({});
    await prisma.showCategoryPrice.deleteMany({});
    await prisma.show.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.seat.deleteMany({});
    await prisma.seatCategory.deleteMany({});
    await prisma.venue.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('Creating users...');
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

    console.log('Creating venue and seats...');
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

    const showSeat = await prisma.showSeat.create({
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

    console.log(`Firing ${NUM_CONCURRENT_REQUESTS} parallel hold requests...`);
    const holdRequests = userTokens.map((token) =>
      request(app)
        .post(`/api/shows/${showId}/seats/${showSeat.id}/hold`)
        .set('Authorization', `Bearer ${token}`)
        .send()
    );

    const responses = await Promise.all(holdRequests);

    const successes = responses.filter((res) => res.status === 200);
    const conflicts = responses.filter((res) => res.status === 409);

    console.log(`\n--- Test Results Summary ---`);
    console.log(`Total Requests: ${responses.length}`);
    console.log(`Successes (200 OK): ${successes.length}`);
    console.log(`Conflicts (409 Conflict): ${conflicts.length}`);

    if (successes.length !== 1) {
      throw new Error(`CONCURRENCY FAILURE: Expected exactly 1 success, got ${successes.length}`);
    }
    if (conflicts.length !== NUM_CONCURRENT_REQUESTS - 1) {
      throw new Error(
        `CONCURRENCY FAILURE: Expected exactly ${NUM_CONCURRENT_REQUESTS - 1} conflicts, got ${conflicts.length}`
      );
    }

    const dbShowSeat = await prisma.showSeat.findUnique({
      where: { id: showSeat.id },
    });

    if (dbShowSeat?.status !== 'HELD') {
      throw new Error(`DB ASSERTION FAILURE: Seat status is ${dbShowSeat?.status}, expected HELD`);
    }

    if (!dbShowSeat.heldBy || !userIds.includes(dbShowSeat.heldBy)) {
      throw new Error(`DB ASSERTION FAILURE: Seat is not held by a valid customer ID`);
    }

    console.log('✓ CONCURRENCY TEST PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ CONCURRENCY TEST FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

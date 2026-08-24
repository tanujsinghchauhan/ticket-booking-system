import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
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

  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const organiserPassword = await bcrypt.hash('organiser123', salt);
  const customerPassword = await bcrypt.hash('customer123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ticket.com',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const organiser = await prisma.user.create({
    data: {
      email: 'organiser@ticket.com',
      name: 'Organiser User',
      password: organiserPassword,
      role: Role.ORGANISER,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@ticket.com',
      name: 'Customer User',
      password: customerPassword,
      role: Role.CUSTOMER,
    },
  });

  console.log('Seeding venue and seat categories...');
  const venue = await prisma.venue.create({
    data: {
      name: 'Grand Symphony Hall',
      address: '456 Concert Ave',
      ownerId: admin.id,
    },
  });

  const premiumCat = await prisma.seatCategory.create({
    data: {
      venueId: venue.id,
      name: 'Premium',
    },
  });

  const standardCat = await prisma.seatCategory.create({
    data: {
      venueId: venue.id,
      name: 'Standard',
    },
  });

  console.log('Seeding seats...');
  const seatsData: any[] = [];
  for (let i = 1; i <= 10; i++) {
    seatsData.push({
      venueId: venue.id,
      categoryId: premiumCat.id,
      row: 'A',
      number: i,
      label: `A${i}`,
    });
  }
  for (let i = 1; i <= 15; i++) {
    seatsData.push({
      venueId: venue.id,
      categoryId: standardCat.id,
      row: 'B',
      number: i,
      label: `B${i}`,
    });
  }
  for (let i = 1; i <= 15; i++) {
    seatsData.push({
      venueId: venue.id,
      categoryId: standardCat.id,
      row: 'C',
      number: i,
      label: `C${i}`,
    });
  }

  await prisma.seat.createMany({
    data: seatsData,
  });

  console.log('Seeding events and shows...');
  const event = await prisma.event.create({
    data: {
      title: 'Summer Symphony Gala',
      type: 'CONCERT',
      description: 'An evening of beautiful classical music under the stars.',
      organiserId: organiser.id,
    },
  });

  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 1);
  startsAt.setHours(19, 0, 0, 0);

  const show = await prisma.show.create({
    data: {
      eventId: event.id,
      venueId: venue.id,
      startsAt,
    },
  });

  await prisma.showCategoryPrice.createMany({
    data: [
      {
        showId: show.id,
        categoryId: premiumCat.id,
        price: 150.0,
      },
      {
        showId: show.id,
        categoryId: standardCat.id,
        price: 75.0,
      },
    ],
  });

  const seats = await prisma.seat.findMany({
    where: { venueId: venue.id },
  });

  await prisma.showSeat.createMany({
    data: seats.map((seat) => ({
      showId: show.id,
      seatId: seat.id,
      status: 'AVAILABLE',
    })),
  });

  console.log('Seeding completed successfully!');
  console.log(`Admin User: admin@ticket.com / admin123`);
  console.log(`Organiser User: organiser@ticket.com / organiser123`);
  console.log(`Customer User: customer@ticket.com / customer123`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

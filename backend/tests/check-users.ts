import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Seeded Users in Neon Database:');
  console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role })));
}

main().catch(console.error).finally(() => prisma.$disconnect());

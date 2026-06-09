import { prisma } from './prisma';
import { seedDatabase } from './seed';

let initialized = false;

export async function ensureDb() {
  if (initialized) return prisma;
  const count = await prisma.user.count();
  if (count === 0) await seedDatabase();
  initialized = true;
  return prisma;
}

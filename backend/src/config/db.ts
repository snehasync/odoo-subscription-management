import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'test' ? [] : ['warn', 'error'],
});

// SQLite performance configuration: WAL mode and busy timeout
export async function initializeDatabase() {
  try {
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000;');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
  } catch (err) {
    // If table doesn't exist yet, ignore
  }
}

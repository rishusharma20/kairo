import Database from 'better-sqlite3'
import { PrismaClient } from "./generated/prisma/client/client"
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const connectionString = process.env.DATABASE_URL?.replace("file:", "") || "./dev.db";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Next.js dev server hot-reloading safe initialization
let prisma: PrismaClient;

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  const adapter = new PrismaBetterSqlite3({ url: connectionString });
  prisma = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
}

export { prisma };

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const databaseUrl = process.env['DATABASE_URL'];
const isTestEnv = process.env['NODE_ENV'] === 'test';

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const createPrismaClient = () => {
  if (!databaseUrl) {
    // In tests we rely on Vitest mocks for Prisma, so avoid throwing here.
    if (isTestEnv) {
      return {} as PrismaClient;
    }

    return new Proxy(
      {},
      {
        get(): never {
          throw new Error('DATABASE_URL is not set');
        },
        has(): boolean {
          return false;
        },
      }
    ) as PrismaClient;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pgPool = pool;
  }

  return new PrismaClient({ adapter });
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

 
import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const databaseUrl = process.env["DATABASE_URL"];

const prisma = databaseUrl
  ? new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })),
  })
  : (new Proxy(
    {},
    {
      get(): never {
        throw new Error('DATABASE_URL is not set');
      },
      has(): boolean {
        return false;
      },
    },
  ) as unknown as PrismaClient);

export default prisma;

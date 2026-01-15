
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const prisma = databaseUrl
  ? new PrismaClient({
      adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })),
    })
  : (new Proxy(
      {},
      {
        get() {
          throw new Error("DATABASE_URL is not set");
        },
        has() {
          return false;
        },
      }
    ) as unknown as PrismaClient);

export default prisma;

import { defineConfig } from "prisma/config";

const rawDatabaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const databaseUrl = rawDatabaseUrl.split("?")[0];

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});

import path from "path";

const defaultDatabaseUrl = "file:./prisma/dev.db";
const rawDatabaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;

export const databaseUrl = rawDatabaseUrl.split("?")[0];
export const databasePath = databaseUrl.replace(/^file:/, "");

export const resolveDatabasePath = () => {
  if (path.isAbsolute(databasePath)) {
    return databasePath;
  }

  return path.join(process.cwd(), databasePath);
};

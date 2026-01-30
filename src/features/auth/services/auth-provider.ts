import "server-only";

import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";

type AuthDbProvider = "prisma" | "mongodb";

// Auth provider must be deterministic and never fail. Delegates to the shared
// app-db-provider which checks: 1) persistent settings, 2) env vars,
// 3) environment detection (MONGODB_URI vs DATABASE_URL).
export const getAuthDataProvider = async (): Promise<AuthDbProvider> => {
  return getAppDbProvider();
};

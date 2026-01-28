import "server-only";

import prisma from "@/shared/lib/db/prisma";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";

type AuthDbProvider = "prisma" | "mongodb";

// Why: Auth provider must be deterministic and never fail. Three fallback layers:
// 1) Persistent settings (can be changed at runtime), 2) Env vars (deployment config),
// 3) Environment detection (if Prisma exists, use it as safest default; otherwise MongoDB).
// If Prisma is unavailable but MongoDB exists, we still function. This resilience is
// critical because authentication failures crash the entire app.
export const getAuthDataProvider = async (): Promise<AuthDbProvider> => {
  void prisma;
  return getAppDbProvider();
};

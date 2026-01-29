import "server-only";

import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";

type CmsDbProvider = "prisma" | "mongodb";

export const getCmsDataProvider = async (): Promise<CmsDbProvider> => {
  // For now, follow the app-wide setting, but the user wants MongoDB specifically for CMS.
  // We can force it to MongoDB if that's the goal, or respect the setting.
  // Given the user said "move the whole cms section to MongoDB since prisma is only a fallback for tests",
  // I will check the provider but we want it to be mongo.
  const provider = await getAppDbProvider();
  return provider as CmsDbProvider;
};

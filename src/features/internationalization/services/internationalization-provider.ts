import "server-only";

import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";

export type InternationalizationProvider = "prisma" | "mongodb";

/**
 * Determines the data provider for internationalization (countries, languages, currencies).
 * Currently follows the global app DB provider, but can be overridden here.
 */
export const getInternationalizationProvider = async (): Promise<InternationalizationProvider> => {
  // We are moving internationalization to MongoDB.
  // Return 'mongodb' if MONGODB_URI is present, otherwise fallback to app default.
  if (process.env.MONGODB_URI) {
    return "mongodb";
  }
  
  return getAppDbProvider();
};

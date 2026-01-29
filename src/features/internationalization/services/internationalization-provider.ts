import "server-only";

import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";

export type InternationalizationProvider = "prisma" | "mongodb";

/**
 * Determines the data provider for internationalization (countries, languages, currencies).
 * Currently follows the global app DB provider, but can be overridden here.
 */
export const getInternationalizationProvider = async (): Promise<InternationalizationProvider> => {
  // If we specifically want to move internationalization to MongoDB, 
  // we could force it here if MONGODB_URI is present.
  if (process.env.MONGODB_URI) {
    return "mongodb";
  }
  
  return getAppDbProvider();
};

import "server-only";

import prisma from "@/shared/lib/db/prisma";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";

type IntegrationDbProvider = "prisma" | "mongodb";

export const getIntegrationDataProvider = async (): Promise<IntegrationDbProvider> => {
  void prisma;
  return getAppDbProvider();
};

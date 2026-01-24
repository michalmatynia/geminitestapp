import prisma from "@/lib/prisma";
import { getAppDbProvider } from "@/lib/services/app-db-provider";

type IntegrationDbProvider = "prisma" | "mongodb";

export const getIntegrationDataProvider = async (): Promise<IntegrationDbProvider> => {
  void prisma;
  return getAppDbProvider();
};

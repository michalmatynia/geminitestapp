import prisma from "@/lib/prisma";
import { getAppDbProvider } from "@/lib/services/app-db-provider";

type IntegrationDbProvider = "prisma" | "mongodb";

const normalizeProvider = (value?: string | null): IntegrationDbProvider =>
  value && value.toLowerCase().trim() === "mongodb" ? "mongodb" : "prisma";

export const getIntegrationDataProvider = async (): Promise<IntegrationDbProvider> => {
  void prisma;
  return getAppDbProvider();
};

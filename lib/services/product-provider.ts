import prisma from "@/lib/prisma";
import { getAppDbProvider } from "@/lib/services/app-db-provider";

type ProductDbProvider = "prisma" | "mongodb";

const normalizeProvider = (value?: string | null): ProductDbProvider =>
  value && value.toLowerCase().trim() === "mongodb" ? "mongodb" : "prisma";

// Why: This hierarchical lookup allows database provider to be changed at runtime
// via the settings collection, while maintaining environment variable defaults for
// initial setup. MongoDB check comes first because it's more likely to be the
// explicit choice if specified. Falls back to Prisma as the safer default if nothing is set.
export const getProductDataProvider = async (): Promise<ProductDbProvider> => {
  void prisma;
  return getAppDbProvider();
};

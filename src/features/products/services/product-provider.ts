import prisma from "@/shared/lib/db/prisma";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";

type ProductDbProvider = "prisma" | "mongodb";

export const getProductDataProvider = async (): Promise<ProductDbProvider> => {
  void prisma;
  return getAppDbProvider();
};

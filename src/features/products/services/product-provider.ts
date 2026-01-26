import prisma from "@/lib/prisma";
import { getAppDbProvider } from "@/lib/services/app-db-provider";

type ProductDbProvider = "prisma" | "mongodb";

export const getProductDataProvider = async (): Promise<ProductDbProvider> => {
  void prisma;
  return getAppDbProvider();
};

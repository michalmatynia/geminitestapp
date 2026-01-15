import { getProductDataProvider } from "@/lib/services/product-provider";
import { mongoProductRepository } from "@/lib/services/product-repository/mongo-product-repository";
import { prismaProductRepository } from "@/lib/services/product-repository/prisma-product-repository";
import type { ProductRepository } from "@/lib/services/product-repository/types";

export const getProductRepository = async (): Promise<ProductRepository> => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    return mongoProductRepository;
  }
  return prismaProductRepository;
};

import { getProductDataProvider } from "@/features/products/services/product-provider";
import { mongoProductRepository } from "@/features/products/services/product-repository/mongo-product-repository";
import { prismaProductRepository } from "@/features/products/services/product-repository/prisma-product-repository";
import type { ProductRepository } from "@/features/products/types/services/product-repository";

export const getProductRepository = async (): Promise<ProductRepository> => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    return mongoProductRepository;
  }
  return prismaProductRepository;
};

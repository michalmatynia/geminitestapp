import { getProductDataProvider } from "@/lib/services/product-provider";
import { mongoProductAiJobRepository } from "@/lib/services/product-ai-job-repository/mongo-product-ai-job-repository";
import { prismaProductAiJobRepository } from "@/lib/services/product-ai-job-repository/prisma-product-ai-job-repository";
import type { ProductAiJobRepository } from "@/types/services/product-ai-job-repository";

export const getProductAiJobRepository = async (): Promise<ProductAiJobRepository> => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb" && process.env.MONGODB_URI) {
    return mongoProductAiJobRepository;
  }
  return prismaProductAiJobRepository;
};

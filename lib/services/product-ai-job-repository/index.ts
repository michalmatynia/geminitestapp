import { getProductDataProvider } from "@/lib/services/product-provider";
import { mongoProductAiJobRepository } from "@/lib/services/product-ai-job-repository/mongo-product-ai-job-repository";
import { prismaProductAiJobRepository } from "@/lib/services/product-ai-job-repository/prisma-product-ai-job-repository";
import type { ProductAiJobRepository } from "@/types/services/product-ai-job-repository";

let cachedRepository: ProductAiJobRepository | null = null;
let cachedProvider: "mongodb" | "prisma" | null = null;

export const getProductAiJobRepository = async (): Promise<ProductAiJobRepository> => {
  if (cachedRepository) return cachedRepository;
  const provider = await getProductDataProvider();
  cachedProvider = provider;
  if (provider === "mongodb" && process.env.MONGODB_URI) {
    cachedRepository = mongoProductAiJobRepository;
    return cachedRepository;
  }
  cachedRepository = prismaProductAiJobRepository;
  return cachedRepository;
};

export const getProductAiJobProvider = () => cachedProvider;

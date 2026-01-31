import "server-only";

import { getProductDataProvider } from "@/features/products/server";
import { mongoProductAiJobRepository } from "@/features/jobs/services/product-ai-job-repository/mongo-product-ai-job-repository";
import { prismaProductAiJobRepository } from "@/features/jobs/services/product-ai-job-repository/prisma-product-ai-job-repository";
import type { ProductAiJobRepository } from "@/features/jobs/types/product-ai-job-repository";

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

export const getProductAiJobProvider = (): "mongodb" | "prisma" | null => cachedProvider;

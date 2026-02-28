import 'server-only';

import { mongoProductAiJobRepository } from '@/shared/lib/products/services/product-ai-job-repository/mongo-product-ai-job-repository';
import { prismaProductAiJobRepository } from '@/shared/lib/products/services/product-ai-job-repository/prisma-product-ai-job-repository';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import type { ProductAiJobRepository } from '@/shared/contracts/jobs';

let cachedRepository: ProductAiJobRepository | null = null;
let cachedProvider: 'mongodb' | 'prisma' | null = null;

export const getProductAiJobRepository = async (): Promise<ProductAiJobRepository> => {
  if (cachedRepository) return cachedRepository;
  const provider = await getProductDataProvider();
  cachedProvider = provider;
  if (provider === 'mongodb' && process.env['MONGODB_URI']) {
    cachedRepository = mongoProductAiJobRepository;
    return cachedRepository;
  }
  cachedRepository = prismaProductAiJobRepository;
  return cachedRepository;
};

export const getProductAiJobProvider = (): 'mongodb' | 'prisma' | null => cachedProvider;

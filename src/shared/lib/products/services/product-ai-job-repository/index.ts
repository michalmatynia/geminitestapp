import 'server-only';

import type { ProductAiJobRepository } from '@/shared/contracts/jobs';
import { mongoProductAiJobRepository } from '@/shared/lib/products/services/product-ai-job-repository/mongo-product-ai-job-repository';

let cachedRepository: ProductAiJobRepository | null = null;
let cachedProvider: 'mongodb' | null = null;

export const getProductAiJobRepository = (): Promise<ProductAiJobRepository> => {
  if (cachedRepository) {
    return Promise.resolve(cachedRepository);
  }
  const provider = 'mongodb';
  cachedProvider = provider;
  cachedRepository = mongoProductAiJobRepository;
  return Promise.resolve(cachedRepository);
};

export const getProductAiJobProvider = (): 'mongodb' | null => cachedProvider;

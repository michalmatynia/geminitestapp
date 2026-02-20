import 'server-only';

import type { AiPathRunRepository } from '@/shared/contracts/ai-paths/path-run-repository';
import { getCollectionProvider } from '@/shared/lib/db/collection-provider-map';

import { mongoPathRunRepository } from './mongo-path-run-repository';
import { prismaPathRunRepository } from './prisma-path-run-repository';

const AI_PATH_RUNS_COLLECTION = 'ai_path_runs';

export const getPathRunRepository = async (): Promise<AiPathRunRepository> => {
  const provider = await getCollectionProvider(AI_PATH_RUNS_COLLECTION);
  if (provider === 'prisma') {
    return prismaPathRunRepository;
  }
  return mongoPathRunRepository;
};

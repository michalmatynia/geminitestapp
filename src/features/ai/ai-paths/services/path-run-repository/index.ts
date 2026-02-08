import 'server-only';

import type { AiPathRunRepository } from '@/features/ai/ai-paths/types/path-run-repository';

import { mongoPathRunRepository } from './mongo-path-run-repository';
import { prismaPathRunRepository } from './prisma-path-run-repository';

export const getPathRunRepository = (): AiPathRunRepository => {
  if (process.env["DATABASE_URL"]) {
    return prismaPathRunRepository;
  }
  if (!process.env["MONGODB_URI"]) {
    throw new Error('AI Paths requires a database provider. Set DATABASE_URL (Prisma) or MONGODB_URI (MongoDB).');
  }
  return mongoPathRunRepository;
};

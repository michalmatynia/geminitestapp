import 'server-only';

import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { mongoPathRunRepository } from './mongo-path-run-repository';

const AI_PATH_RUNS_COLLECTION = 'ai_path_runs';

export const getPathRunRepository = async (): Promise<AiPathRunRepository> => {
  void AI_PATH_RUNS_COLLECTION;
  return mongoPathRunRepository;
};

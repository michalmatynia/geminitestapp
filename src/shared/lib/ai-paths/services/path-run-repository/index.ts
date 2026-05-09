import 'server-only';
import { z } from 'zod';

import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import {
  getCollectionProvider,
  getCollectionRouteMap,
} from '@/shared/lib/db/collection-provider-map';
import type { DatabaseEngineProvider } from '@/shared/lib/db/database-engine-constants';

import {
  AI_PATHS_MONGO_INDEXES,
  mongoPathRunRepository,
} from './mongo-path-run-repository';

export const AI_PATH_RUNS_COLLECTION = 'ai_path_runs';

export type PathRunRepositorySelection = {
  collection: typeof AI_PATH_RUNS_COLLECTION;
  provider: 'mongodb';
  repo: AiPathRunRepository;
  routeMode: 'explicit' | 'fallback';
};

const PersistedRunRepositorySelectionSchema = z.object({
  collection: z.string().trim().min(1).nullable().optional(),
  provider: z.literal('mongodb').nullable().optional(),
  routeMode: z.enum(['explicit', 'fallback']).nullable().optional(),
  selectedAt: z.string().trim().min(1).nullable().optional(),
});

export type PersistedRunRepositorySelection = z.infer<typeof PersistedRunRepositorySelectionSchema>;

const hasExplicitCollectionRoute = (
  routeMap: Record<string, DatabaseEngineProvider>
): boolean => {
  if (AI_PATH_RUNS_COLLECTION in routeMap) return true;
  const normalizedCollection = AI_PATH_RUNS_COLLECTION.trim().toLowerCase();
  return Object.keys(routeMap).some((collectionName) => {
    return collectionName.trim().toLowerCase() === normalizedCollection;
  });
};

export const readPersistedRunRepositorySelection = (
  meta: unknown
): PersistedRunRepositorySelection | null => {
  const result = z
    .object({
      runRepository: PersistedRunRepositorySelectionSchema,
    })
    .safeParse(meta);

  if (!result.success) return null;

  const { runRepository } = result.data;

  // Ensure there is at least one meaningful field populated
  if (
    !runRepository.collection &&
    !runRepository.provider &&
    !runRepository.routeMode &&
    !runRepository.selectedAt
  ) {
    return null;
  }
  return runRepository;
};

export const hasRunRepositorySelectionMismatch = (
  persisted: PersistedRunRepositorySelection | null,
  current: Pick<PathRunRepositorySelection, 'collection' | 'provider' | 'routeMode'>
): boolean => {
  if (!persisted) return false;
  if (persisted.collection && persisted.collection !== current.collection) return true;
  if (persisted.provider && persisted.provider !== current.provider) return true;
  if (persisted.routeMode && persisted.routeMode !== current.routeMode) return true;
  return false;
};

export const resolvePathRunRepository = async (): Promise<PathRunRepositorySelection> => {
  const [provider, routeMap] = await Promise.all([
    getCollectionProvider(AI_PATH_RUNS_COLLECTION),
    getCollectionRouteMap(),
  ]);
  return {
    collection: AI_PATH_RUNS_COLLECTION,
    provider,
    repo: mongoPathRunRepository,
    routeMode: hasExplicitCollectionRoute(routeMap) ? 'explicit' : 'fallback',
  };
};

export const resolveAlternatePathRunRepository = async (
  currentProvider: 'mongodb'
): Promise<
  | {
      collection: typeof AI_PATH_RUNS_COLLECTION;
      provider: 'mongodb';
      repo: AiPathRunRepository;
    }
  | null
> => {
  void currentProvider;
  return null;
};

export const getPathRunRepository = async (): Promise<AiPathRunRepository> => {
  return (await resolvePathRunRepository()).repo;
};

export { AI_PATHS_MONGO_INDEXES, mongoPathRunRepository };
export * from './methods';

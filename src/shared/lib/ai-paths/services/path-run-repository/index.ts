import 'server-only';

import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import {
  getCollectionProvider,
  getCollectionRouteMap,
} from '@/shared/lib/db/collection-provider-map';
import type { DatabaseEngineProvider } from '@/shared/lib/db/database-engine-constants';

import {
  claimRunForProcessing,
  createRun,
  deleteRun,
  findRunById,
  getRunByRequestId,
  updateRun,
  updateRunIfStatus,
} from './methods';
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

export type PersistedRunRepositorySelection = {
  collection: string | null;
  provider: 'mongodb' | null;
  routeMode: 'explicit' | 'fallback' | null;
  selectedAt: string | null;
};

const hasExplicitCollectionRoute = (
  routeMap: Record<string, DatabaseEngineProvider>
): boolean => {
  if (AI_PATH_RUNS_COLLECTION in routeMap) return true;
  const normalizedCollection = AI_PATH_RUNS_COLLECTION.trim().toLowerCase();
  return Object.keys(routeMap).some((collectionName) => {
    return collectionName.trim().toLowerCase() === normalizedCollection;
  });
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asProvider = (value: unknown): 'mongodb' | null => (value === 'mongodb' ? value : null);

const asRouteMode = (value: unknown): 'explicit' | 'fallback' | null =>
  value === 'explicit' || value === 'fallback' ? value : null;

const asOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const readPersistedRunRepositorySelection = (
  meta: unknown
): PersistedRunRepositorySelection | null => {
  const metaRecord = asRecord(meta);
  const runRepository = asRecord(metaRecord?.['runRepository']);
  if (!runRepository) return null;

  const selection: PersistedRunRepositorySelection = {
    collection: asOptionalString(runRepository['collection']),
    provider: asProvider(runRepository['provider']),
    routeMode: asRouteMode(runRepository['routeMode']),
    selectedAt: asOptionalString(runRepository['selectedAt']),
  };

  if (!selection.collection && !selection.provider && !selection.routeMode && !selection.selectedAt) {
    return null;
  }
  return selection;
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

export {
  AI_PATHS_MONGO_INDEXES,
  claimRunForProcessing,
  createRun,
  deleteRun,
  findRunById,
  mongoPathRunRepository,
  getRunByRequestId,
  updateRun,
  updateRunIfStatus,
};

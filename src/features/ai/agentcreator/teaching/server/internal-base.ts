import 'server-only';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const AGENTS_COLLECTION = 'agent_teaching_agents';
export const COLLECTIONS_COLLECTION = 'agent_teaching_collections';
export const DOCUMENTS_COLLECTION = 'agent_teaching_documents';

export const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

let warnedNoMongo = false;
export const isMongoAvailable = (): boolean => {
  const uri = process.env['MONGODB_URI'];
  if (uri !== undefined && uri.length > 0) return true;
  
  if (!warnedNoMongo) {
    void logSystemEvent({
      level: 'warn',
      message: 'MONGODB_URI missing; agent teaching data will be empty.',
      source: 'agent-teaching',
    });
    warnedNoMongo = true;
  }
  return false;
};

export const ensureIndexesOnce = (() => {
  let started = false;
  return async (): Promise<void> => {
    if (!isMongoAvailable()) return;
    if (started) return;
    started = true;
    try {
      const db = await getMongoDb();
      await Promise.all([
        db.collection(AGENTS_COLLECTION).createIndex({ updatedAt: -1 }),
        db.collection(COLLECTIONS_COLLECTION).createIndex({ updatedAt: -1 }),
        db
          .collection(DOCUMENTS_COLLECTION)
          .createIndex({ collectionId: 1, updatedAt: -1 }),
      ]);
    } catch (error) {
      void ErrorSystem.captureException(error);
    }
  };
})();

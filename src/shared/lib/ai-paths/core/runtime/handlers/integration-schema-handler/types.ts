import type { CollectionSchema } from '@/shared/contracts/database';

export type LiveContextCollection = {
  name: string;
  provider: 'mongodb';
  documents: Record<string, unknown>[];
  total: number;
  limit: number;
  skip: number;
  query: string | null;
  error?: string;
};

export type LiveContextPayload = {
  fetchedAt: string;
  selectedCollections: string[];
  limitPerCollection: number;
  query: string | null;
  collections: LiveContextCollection[];
  collectionMap: Record<string, LiveContextCollection>;
  errors: Array<{ collection: string; error: string }>;
};

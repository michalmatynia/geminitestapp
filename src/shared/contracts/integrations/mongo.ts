import type { ObjectId } from 'mongodb';

export type MongoExternalCatalogEntityDoc = {
  _id: string | ObjectId;
  connectionId: string;
  externalId: string;
  name: string;
  metadata?: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

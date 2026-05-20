import type { Db } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { getCollection } from './repository-db-helpers';

const createDb = (collectionNames: string[]): Db => {
  const db = {
    collection: vi.fn((name: string) => ({ collectionName: name })),
    listCollections: vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue(collectionNames.map((name) => ({ name }))),
    })),
  };
  return db as unknown as Db;
};

describe('asset3d repository db helpers', () => {
  it('resolves the asset collection name per database handle', async () => {
    const primaryDb = createDb(['Asset3D']);
    const legacyDb = createDb(['asset3d']);

    await getCollection(primaryDb);
    await getCollection(legacyDb);

    expect(primaryDb.collection).toHaveBeenCalledWith('Asset3D');
    expect(legacyDb.collection).toHaveBeenCalledWith('asset3d');
  });
});

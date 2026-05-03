import { type Db, type Collection } from 'mongodb';
import { type Asset3DDocument } from './repository-utils';

const PRIMARY_COLLECTION = 'Asset3D';
const LEGACY_COLLECTION = 'asset3d';

let collectionNamePromise: Promise<string> | null = null;

const resolveCollectionName = async (db: Db): Promise<string> => {
  if (collectionNamePromise !== null) return collectionNamePromise;

  collectionNamePromise = (async () => {
    try {
      const collections = await db.listCollections({}, { nameOnly: true }).toArray();
      const names = collections.map((c) => c.name);
      
      if (names.includes(PRIMARY_COLLECTION)) {
        return PRIMARY_COLLECTION;
      }
      if (names.includes(LEGACY_COLLECTION)) {
        return LEGACY_COLLECTION;
      }
      return PRIMARY_COLLECTION;
    } catch {
      return PRIMARY_COLLECTION;
    }
  })();

  return collectionNamePromise;
};

export const getCollection = async (db: Db): Promise<Collection<Asset3DDocument>> => {
  const collectionName = await resolveCollectionName(db);
  return db.collection<Asset3DDocument>(collectionName);
};

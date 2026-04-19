import { type Db, type Collection } from 'mongodb';
import { type Asset3DDocument } from './repository-utils';

const PRIMARY_COLLECTION = 'Asset3D';
const LEGACY_COLLECTION = 'asset3d';

let cachedCollectionName: string | null = null;

const resolveCollectionName = async (db: Db): Promise<string> => {
  if (cachedCollectionName !== null) return cachedCollectionName;

  try {
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const names = collections.map((c) => c.name);
    
    if (names.includes(PRIMARY_COLLECTION)) {
      cachedCollectionName = PRIMARY_COLLECTION;
    } else if (names.includes(LEGACY_COLLECTION)) {
      cachedCollectionName = LEGACY_COLLECTION;
    } else {
      cachedCollectionName = PRIMARY_COLLECTION;
    }
  } catch {
    cachedCollectionName = PRIMARY_COLLECTION;
  }
  return cachedCollectionName;
};

export const getCollection = async (db: Db): Promise<Collection<Asset3DDocument>> => {
  const collectionName = await resolveCollectionName(db);
  return db.collection<Asset3DDocument>(collectionName);
};

import { Collection } from 'mongodb';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ProductDocument } from '../../mongo-product-repository-mappers';
import { productCollectionName } from '../../mongo-product-repository.helpers';
import { ensureProductIndexes } from './indexes';

export const getProductCollection = async (): Promise<Collection<ProductDocument>> => {
  await ensureProductIndexes();
  const db = await getMongoDb();
  return db.collection<ProductDocument>(productCollectionName);
};

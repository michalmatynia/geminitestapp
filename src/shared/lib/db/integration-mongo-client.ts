import 'server-only';

export {
  getMongoClient,
  getMongoDb,
  invalidateMongoClientCache,
} from '@/shared/lib/db/mongo-client';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

async function main() {
  try {
    if (!process.env['MONGODB_URI']) {
      throw new Error('MONGODB_URI is required.');
    }

    const db = await getMongoDb();
    const count = await db.collection('users').countDocuments();
    console.log('User count:', count);
    const users = await db
      .collection<{ email?: string | null }>('users')
      .find({}, { projection: { email: 1 } })
      .limit(50)
      .toArray();
    console.log('Users:', users);
  } catch (error) {
    console.error('Error checking users:', error);
    process.exitCode = 1;
  }
}

void main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

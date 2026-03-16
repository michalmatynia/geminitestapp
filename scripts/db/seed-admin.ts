import bcrypt from 'bcryptjs';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

async function main() {
  try {
    if (!process.env['MONGODB_URI']) {
      throw new Error('MONGODB_URI is required.');
    }

    const email = 'admin@example.com';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 12);
    const db = await getMongoDb();
    const now = new Date();

    await db.collection('users').updateOne(
      { email },
      {
        $set: {
          email,
          name: 'Admin User',
          passwordHash,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          image: null,
        },
      },
      { upsert: true }
    );

    console.log('Admin user ensured:', email);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exitCode = 1;
  } finally {
    try {
      const client = await getMongoClient();
      await client.close();
    } catch {
      // best-effort shutdown
    }
  }
}

void main();

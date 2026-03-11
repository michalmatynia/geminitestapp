import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/create-superuser.ts <email> <password>');
    process.exit(1);
  }

  console.log(`Creating superuser: ${email}...`);
  if (!process.env['MONGODB_URI']) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let userId: string | null = null;
  const providerUsed = 'mongodb';
  const db = await getMongoDb();
  const existing = await db.collection('users').findOne({ email });

  if (existing) {
    console.log('User exists in MongoDB. Updating password...');
    await db
      .collection('users')
      .updateOne({ _id: existing._id }, { $set: { passwordHash, updatedAt: new Date() } });
    userId = existing._id.toString();
  } else {
    console.log('Creating user in MongoDB...');
    const result = await db.collection('users').insertOne({
      email,
      name: 'Super Admin',
      passwordHash,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userId = result.insertedId.toString();
  }

  if (!userId) {
    console.error('Failed to create user in MongoDB.');
    process.exit(1);
  }

  console.log(`User ensured with ID: ${userId} (${providerUsed})`);

  // Assign Role
  console.log('Assigning \'super_admin\' role...');

  const settingsCollection = db.collection('settings');
  const rolesDoc = await settingsCollection.findOne({
    key: AUTH_SETTINGS_KEYS.userRoles,
  });
  const userRoles = parseJsonSetting<Record<string, string>>(rolesDoc?.['value'] as string, {});
  userRoles[userId] = 'super_admin';

  await settingsCollection.updateOne(
    { key: AUTH_SETTINGS_KEYS.userRoles },
    {
      $set: {
        key: AUTH_SETTINGS_KEYS.userRoles,
        value: serializeSetting(userRoles),
        updatedAt: new Date(),
      },
      $setOnInsert: {
        _id: AUTH_SETTINGS_KEYS.userRoles,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log('Role assigned in MongoDB settings.');

  console.log('\nSuccess! Superuser created.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

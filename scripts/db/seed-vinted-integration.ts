import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { VINTED_INTEGRATION_SLUG } from '@/features/integrations/constants/slugs';
async function main() {
  try {
    if (!process.env['MONGODB_URI']) {
      throw new Error('MONGODB_URI is required.');
    }

    const db = await getMongoDb();
    const now = new Date();

    // 1. Ensure Vinted Integration
    const integrationId = 'integration-vinted';
    await db.collection('integrations').updateOne(
      { slug: VINTED_INTEGRATION_SLUG },
      {
        $set: {
          name: 'Vinted.pl',
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: integrationId,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const integration = await db.collection('integrations').findOne({ slug: VINTED_INTEGRATION_SLUG });
    const actualIntegrationId = integration?._id ?? integrationId;

    // 2. Ensure a Connection
    const connectionId = 'conn-vinted-default';
    await db.collection('integration_connections').updateOne(
      { integrationId: actualIntegrationId, name: 'My Vinted Account' },
      {
        $set: {
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: connectionId,
          integrationId: actualIntegrationId,
          name: 'My Vinted Account',
          createdAt: now,
        },
      },
      { upsert: true }
    );

    console.log('Vinted integration and connection ensured.');
  } catch (error) {
    console.error('Error seeding Vinted integration:', error);
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

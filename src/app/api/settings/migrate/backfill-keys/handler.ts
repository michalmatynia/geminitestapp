import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import {
  settingsBackfillRequestSchema as backfillSchema,
  type SettingsBackfillResult as BackfillResult,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, forbiddenError, internalError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getDatabaseEnginePolicy } from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';

import type { Filter } from 'mongodb';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  const parsed = await parseJsonBody(req, backfillSchema, {
    logPrefix: 'settings.migrate.backfill-keys.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  await assertDatabaseEngineOperationEnabled('allowManualBackfill');

  const enginePolicy = await getDatabaseEnginePolicy();
  if (!enginePolicy.allowAutomaticBackfill && parsed.data.manual !== true) {
    throw forbiddenError(
      'Automatic backfill is disabled by Database Engine policy. Run backfill manually from Workflow Database -> Database Engine.'
    );
  }

  if (!process.env['MONGODB_URI']) {
    throw internalError('MongoDB is not configured.');
  }

  const limit = parsed.data.limit ?? 500;
  const filter: Filter<{ _id: string; key?: string | null }> = {
    $and: [
      { _id: { $type: 'string' as const } },
      {
        $or: [{ key: { $exists: false } }, { key: null }, { key: '' }],
      },
    ],
  };

  const mongo = await getMongoDb();
  const collection = mongo.collection<{ _id: string; key?: string | null }>('settings');

  if (parsed.data.dryRun) {
    const total = await collection.countDocuments(filter);
    const sample = await collection
      .find(filter, { projection: { _id: 1 } })
      .limit(5)
      .toArray();
    return NextResponse.json({
      matched: total,
      modified: 0,
      remaining: total,
      sampleIds: sample.map((doc) => doc._id),
    } satisfies BackfillResult);
  }

  const docs = await collection
    .find(filter, { projection: { _id: 1 } })
    .limit(limit)
    .toArray();

  if (docs.length === 0) {
    return NextResponse.json({
      matched: 0,
      modified: 0,
      remaining: 0,
    } satisfies BackfillResult);
  }

  const result = await collection.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { key: doc._id } },
      },
    })),
    { ordered: false }
  );

  const remaining = await collection.countDocuments(filter);

  return NextResponse.json({
    matched: docs.length,
    modified: result.modifiedCount ?? 0,
    remaining,
  } satisfies BackfillResult);
}

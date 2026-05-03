import type { AiPathRunEventListOptions, AiPathRunEventRecord } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  ensureIndexes,
  EVENTS_COLLECTION,
  toEventRecord,
  type EventDocument,
} from './shared';

export const listRunEvents = async (
  runId: string,
  options: AiPathRunEventListOptions = {}
): Promise<AiPathRunEventRecord[]> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const filter: Record<string, unknown> = { runId };

  const sinceValue = options.since ? new Date(options.since) : null;
  const since = sinceValue !== null && !Number.isNaN(sinceValue.getTime()) ? sinceValue : null;

  const afterDateValue = options.after?.createdAt ? new Date(options.after.createdAt) : null;
  const afterDate =
    afterDateValue !== null && !Number.isNaN(afterDateValue.getTime()) ? afterDateValue : null;
  const afterId =
    typeof options.after?.id === 'string' && options.after.id.trim().length > 0
      ? options.after.id.trim()
      : null;

  if (afterDate !== null && afterId !== null) {
    filter['$or'] = [
      { createdAt: { $gt: afterDate } },
      {
        createdAt: afterDate,
        $or: [{ _id: { $gt: afterId } }, { id: { $gt: afterId } }],
      },
    ];
  } else if (since !== null) {
    filter['createdAt'] = { $gt: since };
  }

  const cursor = db
    .collection<EventDocument>(EVENTS_COLLECTION)
    .find(filter)
    .sort({ createdAt: 1, _id: 1 });

  if (typeof options.limit === 'number') {
    cursor.limit(options.limit);
  }
  const docs = await cursor.toArray();

  return docs.map(toEventRecord);
};

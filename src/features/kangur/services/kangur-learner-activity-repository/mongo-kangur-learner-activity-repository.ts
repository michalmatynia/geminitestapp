import 'server-only';

import {
  kangurLearnerActivitySnapshotSchema,
  type KangurLearnerActivitySnapshot,
  type KangurLearnerActivityUpdateInput,
} from '@/shared/contracts/kangur';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { executeMongoWriteWithRetry } from '@/shared/lib/db/mongo-write-retry';

import type { KangurLearnerActivityRepository } from './types';
import type { Filter } from 'mongodb';

const SETTINGS_COLLECTION = 'settings';
const KANGUR_ACTIVITY_SETTING_PREFIX = 'kangur_activity:';

type MongoActivitySettingDocument = {
  _id?: string;
  key?: string;
  value?: string;
};

const toSettingKey = (learnerId: string): string =>
  `${KANGUR_ACTIVITY_SETTING_PREFIX}${encodeURIComponent(learnerId.trim().toLowerCase())}`;

const parseActivityValue = (value: string | undefined): KangurLearnerActivitySnapshot | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = kangurLearnerActivitySnapshotSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const buildSnapshot = (
  learnerId: string,
  input: KangurLearnerActivityUpdateInput,
  previous: KangurLearnerActivitySnapshot | null
): KangurLearnerActivitySnapshot => {
  const now = new Date().toISOString();
  const shouldKeepStartedAt =
    previous?.kind === input.kind &&
    previous.title === input.title &&
    previous.href === input.href;

  return {
    learnerId,
    kind: input.kind,
    title: input.title,
    href: input.href,
    startedAt: shouldKeepStartedAt ? previous.startedAt : now,
    updatedAt: now,
  };
};

export const mongoKangurLearnerActivityRepository: KangurLearnerActivityRepository = {
  async getActivity(learnerId: string): Promise<KangurLearnerActivitySnapshot | null> {
    const db = await getMongoDb();
    const settingKey = toSettingKey(learnerId);
    const row = await db.collection<MongoActivitySettingDocument>(SETTINGS_COLLECTION).findOne({
      $or: [{ key: settingKey }, { _id: settingKey }],
    } as Filter<MongoActivitySettingDocument>);

    return parseActivityValue(row?.value);
  },

  async saveActivity(
    learnerId: string,
    input: KangurLearnerActivityUpdateInput
  ): Promise<KangurLearnerActivitySnapshot> {
    const db = await getMongoDb();
    const settingKey = toSettingKey(learnerId);
    const existing = await db.collection<MongoActivitySettingDocument>(SETTINGS_COLLECTION).findOne({
      $or: [{ key: settingKey }, { _id: settingKey }],
    } as Filter<MongoActivitySettingDocument>);
    const previous = parseActivityValue(existing?.value);
    const snapshot = buildSnapshot(learnerId, input, previous);

    await executeMongoWriteWithRetry(async () => {
      await db.collection<MongoActivitySettingDocument>(SETTINGS_COLLECTION).updateOne(
        {
          $or: [{ key: settingKey }, { _id: settingKey }],
        } as Filter<MongoActivitySettingDocument>,
        {
          $set: {
            key: settingKey,
            value: JSON.stringify(snapshot),
          },
        },
        {
          upsert: true,
        }
      );
    });

    return snapshot;
  },
};

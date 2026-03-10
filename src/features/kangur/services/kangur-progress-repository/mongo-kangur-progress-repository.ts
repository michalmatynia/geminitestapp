import 'server-only';


import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurProgressState,
} from '@/shared/contracts/kangur';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { executeMongoWriteWithRetry } from '@/shared/lib/db/mongo-write-retry';

import type { KangurProgressRepository } from './types';
import type { Filter } from 'mongodb';

const SETTINGS_COLLECTION = 'settings';
const KANGUR_PROGRESS_SETTING_PREFIX = 'kangur_progress:';

type MongoProgressSettingDocument = {
  _id?: string;
  key?: string;
  value?: string;
};

const toSettingKey = (userKey: string): string =>
  `${KANGUR_PROGRESS_SETTING_PREFIX}${encodeURIComponent(userKey.trim().toLowerCase())}`;

const parseProgressValue = (value: string | undefined): KangurProgressState => {
  if (!value) {
    return createDefaultKangurProgressState();
  }

  try {
    return normalizeKangurProgressState(JSON.parse(value) as unknown);
  } catch {
    return createDefaultKangurProgressState();
  }
};

export const mongoKangurProgressRepository: KangurProgressRepository = {
  async getProgress(userKey: string): Promise<KangurProgressState> {
    const db = await getMongoDb();
    const settingKey = toSettingKey(userKey);
    const row = await db.collection<MongoProgressSettingDocument>(SETTINGS_COLLECTION).findOne({
      $or: [{ key: settingKey }, { _id: settingKey }],
    } as Filter<MongoProgressSettingDocument>);

    return parseProgressValue(row?.value);
  },

  async saveProgress(userKey: string, progress: KangurProgressState): Promise<KangurProgressState> {
    const db = await getMongoDb();
    const settingKey = toSettingKey(userKey);
    const normalized = normalizeKangurProgressState(progress);

    await executeMongoWriteWithRetry(async () => {
      await db.collection<MongoProgressSettingDocument>(SETTINGS_COLLECTION).updateOne(
        {
          $or: [{ key: settingKey }, { _id: settingKey }],
        } as Filter<MongoProgressSettingDocument>,
        {
          $set: {
            key: settingKey,
            value: JSON.stringify(normalized),
          },
        },
        {
          upsert: true,
        }
      );
    });

    return normalized;
  },
};

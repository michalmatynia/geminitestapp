import 'server-only';


import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurProgressState,
} from '@kangur/contracts';
import {
  KANGUR_LEGACY_SETTINGS_COLLECTION,
  type KangurLegacySettingDocument,
} from '@/features/kangur/services/kangur-legacy-settings-store';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { executeMongoWriteWithRetry } from '@/shared/lib/db/mongo-write-retry';

import type { KangurProgressRepository } from './types';
import type { Filter } from 'mongodb';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
const KANGUR_PROGRESS_SETTING_PREFIX = 'kangur_progress:';

const toSettingKey = (userKey: string): string =>
  `${KANGUR_PROGRESS_SETTING_PREFIX}${encodeURIComponent(userKey.trim().toLowerCase())}`;

const isSubjectProgressKey = (userKey: string): boolean => userKey.includes('::');

const buildSubjectProgressKey = (userKey: string, subject: string): string =>
  `${userKey}::${subject}`;

const parseProgressValue = (value: string | undefined): KangurProgressState => {
  if (!value) {
    return createDefaultKangurProgressState();
  }

  try {
    return normalizeKangurProgressState(JSON.parse(value) as unknown);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return createDefaultKangurProgressState();
  }
};

export const mongoKangurProgressRepository: KangurProgressRepository = {
  async getProgress(userKey: string): Promise<KangurProgressState> {
    const db = await getMongoDb();
    const normalizedKey = userKey.trim().toLowerCase();

    if (!isSubjectProgressKey(normalizedKey)) {
      const subjectSettingKey = toSettingKey(buildSubjectProgressKey(normalizedKey, 'maths'));
      const subjectRow = await db
        .collection<KangurLegacySettingDocument>(KANGUR_LEGACY_SETTINGS_COLLECTION)
        .findOne({
          $or: [{ key: subjectSettingKey }, { _id: subjectSettingKey }],
        } as Filter<KangurLegacySettingDocument>);
      if (subjectRow) {
        return parseProgressValue(subjectRow.value);
      }
    }

    const settingKey = toSettingKey(normalizedKey);
    const row = await db.collection<KangurLegacySettingDocument>(KANGUR_LEGACY_SETTINGS_COLLECTION).findOne({
      $or: [{ key: settingKey }, { _id: settingKey }],
    } as Filter<KangurLegacySettingDocument>);

    return parseProgressValue(row?.value);
  },

  async saveProgress(userKey: string, progress: KangurProgressState): Promise<KangurProgressState> {
    const db = await getMongoDb();
    const settingKey = toSettingKey(userKey);
    const normalized = normalizeKangurProgressState(progress);

    await executeMongoWriteWithRetry(async () => {
      await db.collection<KangurLegacySettingDocument>(KANGUR_LEGACY_SETTINGS_COLLECTION).updateOne(
        {
          $or: [{ key: settingKey }, { _id: settingKey }],
        } as Filter<KangurLegacySettingDocument>,
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

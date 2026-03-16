import 'server-only';

import {
  kangurSubjectFocusSchema,
  type KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { executeMongoWriteWithRetry } from '@/shared/lib/db/mongo-write-retry';
import type { Filter } from 'mongodb';

import type { KangurSubjectFocusRepository } from './types';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

const SETTINGS_COLLECTION = 'settings';
const KANGUR_SUBJECT_FOCUS_SETTING_PREFIX = 'kangur_subject_focus:';

type MongoSubjectFocusSettingDocument = {
  _id?: string;
  key?: string;
  value?: string;
};

const toSettingKey = (learnerId: string): string =>
  `${KANGUR_SUBJECT_FOCUS_SETTING_PREFIX}${encodeURIComponent(learnerId.trim().toLowerCase())}`;

const parseSubjectFocusValue = (value: string | undefined): KangurLessonSubject | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = kangurSubjectFocusSchema.safeParse(JSON.parse(value) as unknown);
    return parsed.success ? parsed.data.subject : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const mongoKangurSubjectFocusRepository: KangurSubjectFocusRepository = {
  async getSubjectFocus(learnerId: string): Promise<KangurLessonSubject | null> {
    const db = await getMongoDb();
    const settingKey = toSettingKey(learnerId);
    const row = await db.collection<MongoSubjectFocusSettingDocument>(SETTINGS_COLLECTION).findOne({
      $or: [{ key: settingKey }, { _id: settingKey }],
    } as Filter<MongoSubjectFocusSettingDocument>);

    return parseSubjectFocusValue(row?.value);
  },

  async saveSubjectFocus(
    learnerId: string,
    subject: KangurLessonSubject
  ): Promise<KangurLessonSubject> {
    const db = await getMongoDb();
    const settingKey = toSettingKey(learnerId);
    const payload = JSON.stringify({ subject });

    await executeMongoWriteWithRetry(async () => {
      await db.collection<MongoSubjectFocusSettingDocument>(SETTINGS_COLLECTION).updateOne(
        {
          $or: [{ key: settingKey }, { _id: settingKey }],
        } as Filter<MongoSubjectFocusSettingDocument>,
        {
          $set: {
            key: settingKey,
            value: payload,
          },
        },
        {
          upsert: true,
        }
      );
    });

    return subject;
  },
};

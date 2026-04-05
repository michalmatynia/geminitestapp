import 'server-only';

import { kangurSubjectFocusSchema } from '@kangur/contracts/kangur-lesson-constants';
import { type KangurLessonSubject } from '@kangur/contracts/kangur-lesson-constants';
import {
  KANGUR_LEGACY_SETTINGS_COLLECTION,
  type KangurLegacySettingDocument,
} from '@/features/kangur/services/kangur-legacy-settings-store';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { executeMongoWriteWithRetry } from '@/shared/lib/db/mongo-write-retry';
import type { Filter } from 'mongodb';

import type { KangurSubjectFocusRepository } from './types';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
const KANGUR_SUBJECT_FOCUS_SETTING_PREFIX = 'kangur_subject_focus:';

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
    const row = await db.collection<KangurLegacySettingDocument>(KANGUR_LEGACY_SETTINGS_COLLECTION).findOne({
      $or: [{ key: settingKey }, { _id: settingKey }],
    } as Filter<KangurLegacySettingDocument>);

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
      await db.collection<KangurLegacySettingDocument>(KANGUR_LEGACY_SETTINGS_COLLECTION).updateOne(
        {
          $or: [{ key: settingKey }, { _id: settingKey }],
        } as Filter<KangurLegacySettingDocument>,
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

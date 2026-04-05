import 'server-only';

import { ObjectId } from 'mongodb';
import { cache } from 'react';

import {
  DEFAULT_MENU_SETTINGS,
  getCmsMenuSettingsFallbackKeys,
  normalizeMenuSettings,
  type MenuSettings,
} from '@/shared/contracts/cms-menu';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { isDomainZoningEnabled } from './cms-domain';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const readFirstAvailableSettingValue = async (keys: string[]): Promise<string | null> => {
  if (keys.length === 0 || !process.env['MONGODB_URI']) {
    return null;
  }

  try {
    const mongo = await getMongoDb();
    const docs = await mongo
      .collection<MongoStringSettingRecord<string | ObjectId>>('settings')
      .find(
        {
          $or: [
            { _id: { $in: keys.map(toMongoId) } },
            { key: { $in: keys } },
          ],
        },
        {
          projection: {
            _id: 1,
            key: 1,
            value: 1,
          },
        }
      )
      .toArray();

    const valuesByKey = new Map<string, string>();

    for (const doc of docs) {
      if (typeof doc.value !== 'string') {
        continue;
      }

      if (typeof doc.key === 'string' && !valuesByKey.has(doc.key)) {
        valuesByKey.set(doc.key, doc.value);
      }

      if (typeof doc._id === 'string' && !valuesByKey.has(doc._id)) {
        valuesByKey.set(doc._id, doc.value);
      }
    }

    for (const key of keys) {
      const resolvedValue = valuesByKey.get(key);
      if (typeof resolvedValue === 'string') {
        return resolvedValue;
      }
    }

    return null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const getCmsMenuSettings = cache(async (
  domainId?: string | null,
  locale?: string | null
): Promise<MenuSettings> => {
  const zoningEnabled = await isDomainZoningEnabled();
  const scopedDomainId = zoningEnabled ? (domainId ?? null) : null;
  const fallbackKeys = getCmsMenuSettingsFallbackKeys(scopedDomainId, locale);
  const stored = await readFirstAvailableSettingValue(fallbackKeys);

  if (stored) {
    const parsed = parseJsonSetting<unknown>(stored, null);
    return normalizeMenuSettings(parsed);
  }

  return DEFAULT_MENU_SETTINGS;
});

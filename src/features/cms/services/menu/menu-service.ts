/**
 * CMS Menu Service
 * 
 * Manages the resolution, retrieval, and normalization of CMS menu settings.
 */

import { ObjectId } from 'mongodb';
import { cache } from 'react';
import {
  DEFAULT_MENU_SETTINGS,
  getCmsMenuSettingsFallbackKeys,
  normalizeMenuSettings,
  type MenuSettings,
} from '@/shared/contracts/cms-menu';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';
import { resolveCmsBuilderMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { parseJsonSetting } from '@/shared/utils/settings-json';

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

/**
 * Reads the first available value from a list of settings keys.
 */
import { databaseError, internalError } from '@/shared/errors/app-error';

// ... (existing imports)

const mapSettingsDocs = (docs: MongoStringSettingRecord<string | ObjectId>[]): Map<string, string> => {
  const valuesByKey = new Map<string, string>();
  for (const doc of docs) {
    if (typeof doc.value !== 'string') continue;

    if (typeof doc.key === 'string' && !valuesByKey.has(doc.key)) {
      valuesByKey.set(doc.key, doc.value);
    }

    if (typeof doc._id === 'string' && !valuesByKey.has(doc._id)) {
      valuesByKey.set(doc._id, doc.value);
    }
  }
  return valuesByKey;
};

export const readFirstAvailableSettingValue = async (keys: string[]): Promise<string | null> => {
  const mongodbUri = resolveCmsBuilderMongoSourceConfig('local').uri;
  if (keys.length === 0 || mongodbUri === undefined || mongodbUri === '') {
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

    const valuesByKey = mapSettingsDocs(docs);

    for (const key of keys) {
      const resolvedValue = valuesByKey.get(key);
      if (typeof resolvedValue === 'string') return resolvedValue;
    }

    return null;
  } catch (error) {
    throw databaseError('Failed to read CMS settings keys.', error, {
      collection: 'settings',
      keys,
    });
  }
};

export const getCmsMenuSettings = cache(async (
  domainId?: string | null,
  locale?: string | null,
  zoningEnabled: boolean = false
): Promise<MenuSettings> => {
  const scopedDomainId = zoningEnabled === true ? (domainId ?? null) : null;
  const fallbackKeys = getCmsMenuSettingsFallbackKeys(scopedDomainId, locale);
  const stored = await readFirstAvailableSettingValue(fallbackKeys);

  if (stored !== null) {
    try {
      const parsed = parseJsonSetting<unknown>(stored, null);
      return normalizeMenuSettings(parsed);
    } catch (error) {
      throw internalError('Failed to normalize CMS menu settings.', {
        cause: error,
        fallbackKeys,
      });
    }
  }

  return DEFAULT_MENU_SETTINGS;
});

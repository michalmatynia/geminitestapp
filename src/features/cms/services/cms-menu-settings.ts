import 'server-only';

import { ObjectId } from 'mongodb';

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

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string | ObjectId>>('settings')
      .findOne({ $or: [{ _id: toMongoId(key) }, { key }] });
    return typeof doc?.value === 'string' ? doc.value : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const readSettingValue = async (key: string): Promise<string | null> => readMongoSetting(key);

export const getCmsMenuSettings = async (
  domainId?: string | null,
  locale?: string | null
): Promise<MenuSettings> => {
  const zoningEnabled = await isDomainZoningEnabled();
  const scopedDomainId = zoningEnabled ? (domainId ?? null) : null;
  const fallbackKeys = getCmsMenuSettingsFallbackKeys(scopedDomainId, locale);

  for (const key of fallbackKeys) {
    const stored = await readSettingValue(key);
    if (!stored) {
      continue;
    }

    const parsed = parseJsonSetting<unknown>(stored, null);
    return normalizeMenuSettings(parsed);
  }

  return DEFAULT_MENU_SETTINGS;
};

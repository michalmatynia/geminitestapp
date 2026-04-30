import 'server-only';

import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

import { normalizeFilemakerDatabase } from '../../filemaker-settings.database';
import { FILEMAKER_DATABASE_KEY } from '../../settings-constants';
import type { FilemakerDatabase } from '../../types';
import { readFilemakerCampaignSettingValue } from '../campaign-settings-store';

export type LoadedDatabase = {
  database: FilemakerDatabase;
  rawValue: string | null;
};

export const loadFilemakerDatabase = async (): Promise<LoadedDatabase> => {
  const rawValue = await readFilemakerCampaignSettingValue(FILEMAKER_DATABASE_KEY);
  if (rawValue === null || rawValue.trim().length === 0) {
    return { database: normalizeFilemakerDatabase(null), rawValue: null };
  }
  const decoded = decodeSettingValue(FILEMAKER_DATABASE_KEY, rawValue);
  try {
    return {
      database: normalizeFilemakerDatabase(JSON.parse(decoded) as FilemakerDatabase),
      rawValue,
    };
  } catch {
    return { database: normalizeFilemakerDatabase(null), rawValue };
  }
};

const hasLoadedFilemakerRecords = (database: FilemakerDatabase): boolean =>
  database.organizations.length > 0 || database.jobListings.length > 0;

export const loadPersistedVerificationDatabase = async (
  fallbackDatabase: FilemakerDatabase
): Promise<FilemakerDatabase> => {
  const loaded = await loadFilemakerDatabase();
  if (loaded.rawValue !== null || hasLoadedFilemakerRecords(loaded.database)) {
    return loaded.database;
  }
  return normalizeFilemakerDatabase(fallbackDatabase);
};

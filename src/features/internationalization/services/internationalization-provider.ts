import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

import type { InternationalizationProvider } from '@/shared/contracts/internationalization';

const normalizeProvider = (value?: string | null): InternationalizationProvider | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === 'mongodb' ? 'mongodb' : 'prisma';
};

/**
 * Determines the data provider for internationalization (countries, languages, currencies).
 * Follows explicit env override first, then app-wide provider.
 */
export const getInternationalizationProvider = async (): Promise<InternationalizationProvider> => {
  const explicit = normalizeProvider(process.env['INTERNATIONALIZATION_DB_PROVIDER']);
  if (explicit) {
    if (explicit === 'mongodb' && !process.env['MONGODB_URI']) {
      return 'prisma';
    }
    if (explicit === 'prisma' && !process.env['DATABASE_URL'] && process.env['MONGODB_URI']) {
      return 'mongodb';
    }
    return explicit;
  }

  return getAppDbProvider();
};

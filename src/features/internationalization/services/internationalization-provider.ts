import 'server-only';

import type { InternationalizationProvider } from '@/shared/contracts/internationalization';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

const normalizeProvider = (value?: string | null): InternationalizationProvider | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === 'mongodb' ? 'mongodb' : null;
};

/**
 * Determines the data provider for internationalization (countries, languages, currencies).
 * Follows explicit env override first, then app-wide provider.
 */
export const getInternationalizationProvider = async (): Promise<InternationalizationProvider> => {
  const explicit = normalizeProvider(process.env['INTERNATIONALIZATION_DB_PROVIDER']);
  if (explicit) {
    if (!process.env['MONGODB_URI']) {
      throw new Error(
        'INTERNATIONALIZATION_DB_PROVIDER is set to MongoDB but MONGODB_URI is missing.'
      );
    }
    return explicit;
  }

  await getAppDbProvider();
  return 'mongodb';
};

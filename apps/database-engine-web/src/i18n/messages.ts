import 'server-only';

import { cache } from 'react';

export type DatabaseEngineMessages = Record<string, never>;

export const loadDatabaseEngineMessages = cache(
  async (_locale: string | null | undefined): Promise<DatabaseEngineMessages> => ({})
);

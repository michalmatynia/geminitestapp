import 'server-only';

import { cache } from 'react';

export type DatabaseEngineMessages = Record<string, never>;

export const loadDatabaseEngineMessages = cache(
  (_locale: string | null | undefined): DatabaseEngineMessages => ({})
);

import 'server-only';

import type { CmsRepository } from '@/shared/contracts/cms';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { mongoCmsRepository } from './mongo-cms-repository';

let cachedRepository: CmsRepository | null = null;
let cachedProvider: 'mongodb' | null = null;
const LOG_SOURCE = 'cms-repository';
const shouldLogCms = (): boolean => process.env['DEBUG_CMS'] === 'true';

export async function getCmsRepository(): Promise<CmsRepository> {
  if (cachedRepository) return cachedRepository;
  const provider = 'mongodb';
  cachedProvider = provider;
  cachedRepository = mongoCmsRepository;
  if (shouldLogCms()) {
    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'repository',
      context: { provider },
    });
  }
  return cachedRepository;
}

export const getCmsRepositoryProvider = (): 'mongodb' | null => cachedProvider;

export function resetCmsRepositoryCache(): void {
  cachedRepository = null;
  cachedProvider = null;
}

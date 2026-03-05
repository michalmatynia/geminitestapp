import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { CmsRepository } from '@/shared/contracts/cms';

import { getCmsDataProvider } from '@/shared/lib/cms/services/cms-provider';
import { mongoCmsRepository } from './mongo-cms-repository';
import { prismaCmsRepository } from './prisma-cms-repository';

let cachedRepository: CmsRepository | null = null;
let cachedProvider: 'mongodb' | 'prisma' | null = null;
const LOG_SOURCE = 'cms-repository';
const shouldLogCms = (): boolean => process.env['DEBUG_CMS'] === 'true';

export async function getCmsRepository(): Promise<CmsRepository> {
  if (cachedRepository) return cachedRepository;
  const provider = await getCmsDataProvider();
  cachedProvider = provider;
  cachedRepository = provider === 'mongodb' ? mongoCmsRepository : prismaCmsRepository;
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

export const getCmsRepositoryProvider = (): 'mongodb' | 'prisma' | null => cachedProvider;

export function resetCmsRepositoryCache(): void {
  cachedRepository = null;
  cachedProvider = null;
}

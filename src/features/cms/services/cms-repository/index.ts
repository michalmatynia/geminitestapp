import 'server-only';

import { Prisma } from '@prisma/client';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { CmsRepository } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';

import { getCmsDataProvider } from '../cms-provider';
import { mongoCmsRepository } from './mongo-cms-repository';
import { prismaCmsRepository } from './prisma-cms-repository';

let cachedRepository: CmsRepository | null = null;
let cachedProvider: 'mongodb' | 'prisma' | null = null;
let prismaReadyCache: { value: boolean; ts: number } | null = null;
let prismaReadyInflight: Promise<boolean> | null = null;

const PRISMA_READY_TTL_MS = 60_000;
const LOG_SOURCE = 'cms-repository';
const shouldLogCms = (): boolean => process.env['DEBUG_CMS'] === 'true';

const isMissingTableError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const canUsePrismaCms = async (): Promise<boolean> => {
  if (!process.env['DATABASE_URL'] && process.env['NODE_ENV'] !== 'test') return false;
  if (!('page' in prisma)) return false;
  const now = Date.now();
  if (prismaReadyCache && now - prismaReadyCache.ts < PRISMA_READY_TTL_MS) {
    return prismaReadyCache.value;
  }
  if (prismaReadyInflight) {
    return prismaReadyInflight;
  }
  prismaReadyInflight = (async (): Promise<boolean> => {
    try {
      await prisma.page.findFirst({ select: { id: true } });
      return true;
    } catch (error) {
      if (isMissingTableError(error)) return false;
      throw error;
    }
  })();
  const ready = await prismaReadyInflight;
  prismaReadyCache = { value: ready, ts: Date.now() };
  prismaReadyInflight = null;
  return ready;
};

export async function getCmsRepository(): Promise<CmsRepository> {
  if (cachedRepository) return cachedRepository;
  const provider = await getCmsDataProvider();
  cachedProvider = provider;

  if (provider === 'mongodb') {
    cachedRepository = mongoCmsRepository;
    if (shouldLogCms()) {
      void logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: 'repository',
        context: { provider: 'mongodb' },
      });
    }
    return cachedRepository;
  }

  const prismaReady = await canUsePrismaCms();
  if (prismaReady) {
    cachedRepository = prismaCmsRepository;
    if (shouldLogCms()) {
      void logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: 'repository',
        context: { provider: 'prisma' },
      });
    }
    return cachedRepository;
  }
  throw internalError(
    'Prisma CMS tables are missing. Run migrations manually in Workflow Database -> Database Engine.'
  );
}

export const getCmsRepositoryProvider = (): 'mongodb' | 'prisma' | null => cachedProvider;

export function resetCmsRepositoryCache(): void {
  cachedRepository = null;
  cachedProvider = null;
  prismaReadyCache = null;
  prismaReadyInflight = null;
}

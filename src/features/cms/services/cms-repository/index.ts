import 'server-only';

import { Prisma } from '@prisma/client';

import prisma from '@/shared/lib/db/prisma';

import { getCmsDataProvider } from '../cms-provider';
import { mongoCmsRepository } from './mongo-cms-repository';
import { prismaCmsRepository } from './prisma-cms-repository';

import type { CmsRepository } from '../../types/services/cms-repository';

let cachedRepository: CmsRepository | null = null;
let cachedProvider: 'mongodb' | 'prisma' | null = null;
let prismaReadyCache: { value: boolean; ts: number } | null = null;
let prismaReadyInflight: Promise<boolean> | null = null;

const PRISMA_READY_TTL_MS = 60_000;
const shouldLogCms = (): boolean => process.env.DEBUG_CMS === 'true';

const isMissingTableError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const canUsePrismaCms = async (): Promise<boolean> => {
  if (!process.env.DATABASE_URL) return false;
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
      console.log('[cms] repository', { provider: 'mongodb' });
    }
    return cachedRepository;
  }

  const prismaReady = await canUsePrismaCms();
  if (prismaReady) {
    cachedRepository = prismaCmsRepository;
    if (shouldLogCms()) {
      console.log('[cms] repository', { provider: 'prisma' });
    }
    return cachedRepository;
  }

  if (process.env.MONGODB_URI) {
    console.warn('[cms] Prisma CMS tables missing; falling back to MongoDB.');
    cachedRepository = mongoCmsRepository;
    cachedProvider = 'mongodb';
    if (shouldLogCms()) {
      console.log('[cms] repository', { provider: 'mongodb', fallback: true });
    }
    return cachedRepository;
  }

  throw new Error('Prisma CMS tables are missing. Run `npx prisma db push`.');
}

export const getCmsRepositoryProvider = (): 'mongodb' | 'prisma' | null => cachedProvider;

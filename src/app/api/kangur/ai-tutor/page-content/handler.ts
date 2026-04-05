import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  clearKangurPageContentServerCache,
  getKangurPageContentStore,
  upsertKangurPageContentStore,
} from '@/features/kangur/server/page-content-repository';
import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import {
  parseKangurPageContentStore,
  type KangurPageContentStore,
} from '@/shared/contracts/kangur-page-content';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import { normalizeOptionalQueryString } from '@/shared/lib/api';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const PAGE_CONTENT_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';
const PAGE_CONTENT_HANDLER_CACHE_TTL_MS = 60_000;

type KangurPageContentCacheEntry = {
  json: string;
  fetchedAt: number;
};

const kangurPageContentCache = new Map<string, KangurPageContentCacheEntry>();
const kangurPageContentInflight = new Map<string, Promise<KangurPageContentCacheEntry>>();

export const querySchema = z.object({
  locale: z.preprocess((value) => normalizeOptionalQueryString(value) ?? 'pl', z.string()),
});

const buildPageContentCacheKey = (locale: string): string => normalizeSiteLocale(locale);

const buildPageContentResponse = (entry: KangurPageContentCacheEntry): Response =>
  new NextResponse(entry.json, {
    headers: {
      'Cache-Control': PAGE_CONTENT_CACHE_CONTROL,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

const createCacheEntry = (store: KangurPageContentStore): KangurPageContentCacheEntry => ({
  json: JSON.stringify(store),
  fetchedAt: Date.now(),
});

export const clearKangurPageContentHandlerCache = (locale?: string | null): void => {
  if (locale) {
    const cacheKey = buildPageContentCacheKey(locale);
    kangurPageContentCache.delete(cacheKey);
    kangurPageContentInflight.delete(cacheKey);
    return;
  }

  kangurPageContentCache.clear();
  kangurPageContentInflight.clear();
};

export async function getKangurPageContentHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const locale = normalizeSiteLocale(query.locale);
  const cacheKey = buildPageContentCacheKey(locale);
  const now = Date.now();
  const cached = kangurPageContentCache.get(cacheKey);

  if (cached && now - cached.fetchedAt < PAGE_CONTENT_HANDLER_CACHE_TTL_MS) {
    return buildPageContentResponse(cached);
  }

  const inflight = kangurPageContentInflight.get(cacheKey);
  if (inflight) {
    return buildPageContentResponse(await inflight);
  }

  const inflightPromise = getKangurPageContentStore(locale)
    .then((store) => {
      const entry = createCacheEntry(store);
      kangurPageContentCache.set(cacheKey, entry);
      return entry;
    })
    .finally(() => {
      kangurPageContentInflight.delete(cacheKey);
    });

  kangurPageContentInflight.set(cacheKey, inflightPromise);
  return buildPageContentResponse(await inflightPromise);
}

export async function postKangurPageContentHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur page content.');
  }

  const store = parseKangurPageContentStore(ctx.body as KangurPageContentStore);
  const payload = await upsertKangurPageContentStore(store);
  clearKangurPageContentServerCache(payload.locale);
  clearKangurPageContentHandlerCache(payload.locale);

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

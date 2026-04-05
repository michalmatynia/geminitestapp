import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurGameContentSetRepository } from '@/features/kangur/services/kangur-game-content-set-repository';
import type { KangurGameContentSet } from '@/shared/contracts/kangur-game-instances';
import {
  kangurGameContentSetIdSchema,
  kangurGameContentSetsSchema,
} from '@/shared/contracts/kangur-game-instances';
import { kangurGameIdSchema } from '@/shared/contracts/kangur-games';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  contentSetId: optionalTrimmedQueryString(kangurGameContentSetIdSchema),
  gameId: optionalTrimmedQueryString(kangurGameIdSchema),
});

export const bodySchema = z.object({
  gameId: kangurGameIdSchema,
  contentSets: kangurGameContentSetsSchema,
});

const KANGUR_GAME_CONTENT_SETS_CACHE_TTL_MS = 30_000;

type KangurGameContentSetsCacheEntry = {
  data: KangurGameContentSet[];
  fetchedAt: number;
};

const kangurGameContentSetsCache = new Map<string, KangurGameContentSetsCacheEntry>();
const kangurGameContentSetsInflight = new Map<string, Promise<KangurGameContentSet[]>>();

const cloneGameContentSets = (
  contentSets: KangurGameContentSet[]
): KangurGameContentSet[] => structuredClone(contentSets);

const buildCacheKey = (input: {
  contentSetId?: string;
  gameId?: string;
}): string =>
  JSON.stringify({
    contentSetId: input.contentSetId ?? null,
    gameId: input.gameId ?? null,
  });

export const clearKangurGameContentSetsCache = (): void => {
  kangurGameContentSetsCache.clear();
  kangurGameContentSetsInflight.clear();
};

export async function getKangurGameContentSetsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const parsedGameId = kangurGameIdSchema.safeParse(query.gameId);
  const gameId = parsedGameId.success ? parsedGameId.data : undefined;
  const parsedContentSetId = kangurGameContentSetIdSchema.safeParse(query.contentSetId);
  const contentSetId = parsedContentSetId.success ? parsedContentSetId.data : undefined;
  const cacheKey = buildCacheKey({
    contentSetId,
    gameId,
  });
  const now = Date.now();
  const cached = kangurGameContentSetsCache.get(cacheKey);

  if (cached && now - cached.fetchedAt < KANGUR_GAME_CONTENT_SETS_CACHE_TTL_MS) {
    return NextResponse.json(cloneGameContentSets(cached.data), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const inflight = kangurGameContentSetsInflight.get(cacheKey);
  if (inflight) {
    return NextResponse.json(cloneGameContentSets(await inflight), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const repository = await getKangurGameContentSetRepository();
  const inflightPromise = repository
    .listContentSets({
      contentSetId,
      gameId,
    })
    .then((contentSets) => {
      kangurGameContentSetsCache.set(cacheKey, {
        data: cloneGameContentSets(contentSets),
        fetchedAt: Date.now(),
      });
      return contentSets;
    })
    .finally(() => {
      kangurGameContentSetsInflight.delete(cacheKey);
    });

  kangurGameContentSetsInflight.set(cacheKey, inflightPromise);
  const contentSets = await inflightPromise;

  return NextResponse.json(contentSets, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

export async function postKangurGameContentSetsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur game content sets.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  for (const contentSet of parsed.contentSets) {
    if (contentSet.gameId !== parsed.gameId) {
      throw new Error('Each game content set must match the requested gameId.');
    }
  }

  const repository = await getKangurGameContentSetRepository();
  const contentSets = await repository.replaceContentSetsForGame(
    parsed.gameId,
    parsed.contentSets
  );
  clearKangurGameContentSetsCache();

  return NextResponse.json(contentSets, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

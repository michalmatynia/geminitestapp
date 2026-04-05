import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurGameInstanceRepository } from '@/features/kangur/services/kangur-game-instance-repository';
import type {
  KangurGameInstance,
} from '@/shared/contracts/kangur-game-instances';
import {
  kangurGameInstanceIdSchema,
  kangurGameInstancesReplacePayloadSchema,
} from '@/shared/contracts/kangur-game-instances';
import { kangurGameIdSchema } from '@/shared/contracts/kangur-games';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  enabledOnly: optionalBooleanQuerySchema(),
  gameId: optionalTrimmedQueryString(kangurGameIdSchema),
  instanceId: optionalTrimmedQueryString(kangurGameInstanceIdSchema),
});

const bodySchema = kangurGameInstancesReplacePayloadSchema;

const KANGUR_GAME_INSTANCES_CACHE_TTL_MS = 30_000;

type KangurGameInstancesCacheEntry = {
  data: KangurGameInstance[];
  fetchedAt: number;
};

const kangurGameInstancesCache = new Map<string, KangurGameInstancesCacheEntry>();
const kangurGameInstancesInflight = new Map<string, Promise<KangurGameInstance[]>>();

const cloneGameInstances = (instances: KangurGameInstance[]): KangurGameInstance[] =>
  structuredClone(instances);

const buildCacheKey = (input: {
  enabledOnly?: boolean;
  gameId?: string;
  instanceId?: string;
}): string =>
  JSON.stringify({
    enabledOnly: input.enabledOnly === true,
    gameId: input.gameId ?? null,
    instanceId: input.instanceId ?? null,
  });

export const clearKangurGameInstancesCache = (): void => {
  kangurGameInstancesCache.clear();
  kangurGameInstancesInflight.clear();
};

export async function getKangurGameInstancesHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const parsedGameId = kangurGameIdSchema.safeParse(query.gameId);
  const gameId = parsedGameId.success ? parsedGameId.data : undefined;
  const parsedInstanceId = kangurGameInstanceIdSchema.safeParse(query.instanceId);
  const instanceId = parsedInstanceId.success ? parsedInstanceId.data : undefined;
  const cacheKey = buildCacheKey({
    enabledOnly: query.enabledOnly,
    gameId,
    instanceId,
  });
  const now = Date.now();
  const cached = kangurGameInstancesCache.get(cacheKey);

  if (cached && now - cached.fetchedAt < KANGUR_GAME_INSTANCES_CACHE_TTL_MS) {
    return NextResponse.json(cloneGameInstances(cached.data), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const inflight = kangurGameInstancesInflight.get(cacheKey);
  if (inflight) {
    return NextResponse.json(cloneGameInstances(await inflight), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const repository = await getKangurGameInstanceRepository();
  const inflightPromise = repository
    .listInstances({
      enabledOnly: query.enabledOnly,
      gameId,
      instanceId,
    })
    .then((instances) => {
      kangurGameInstancesCache.set(cacheKey, {
        data: cloneGameInstances(instances),
        fetchedAt: Date.now(),
      });
      return instances;
    })
    .finally(() => {
      kangurGameInstancesInflight.delete(cacheKey);
    });

  kangurGameInstancesInflight.set(cacheKey, inflightPromise);
  const instances = await inflightPromise;

  return NextResponse.json(instances, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

export async function postKangurGameInstancesHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur game instances.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  for (const instance of parsed.instances) {
    if (instance.gameId !== parsed.gameId) {
      throw new Error('Each game instance must match the requested gameId.');
    }
  }

  const repository = await getKangurGameInstanceRepository();
  const instances = await repository.replaceInstancesForGame(parsed.gameId, parsed.instances);
  clearKangurGameInstancesCache();

  return NextResponse.json(instances, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonGameSectionRepository } from '@/features/kangur/services/kangur-lesson-game-section-repository';
import type { KangurLessonGameSection } from '@/shared/contracts/kangur-lesson-game-sections';
import {
  kangurLessonGameSectionsReplacePayloadSchema,
} from '@/shared/contracts/kangur-lesson-game-sections';
import { kangurGameIdSchema } from '@/shared/contracts/kangur-games';
import { kangurLessonComponentIdSchema } from '@/shared/contracts/kangur-lesson-constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  gameId: optionalTrimmedQueryString(kangurGameIdSchema),
  lessonComponentId: optionalTrimmedQueryString(kangurLessonComponentIdSchema),
  enabledOnly: optionalBooleanQuerySchema(),
});

const bodySchema = kangurLessonGameSectionsReplacePayloadSchema;

const KANGUR_LESSON_GAME_SECTIONS_CACHE_TTL_MS = 30_000;

type KangurLessonGameSectionsCacheEntry = {
  data: KangurLessonGameSection[];
  fetchedAt: number;
};

const kangurLessonGameSectionsCache = new Map<string, KangurLessonGameSectionsCacheEntry>();
const kangurLessonGameSectionsInflight = new Map<
  string,
  Promise<KangurLessonGameSection[]>
>();

const cloneLessonGameSections = (
  sections: KangurLessonGameSection[]
): KangurLessonGameSection[] => structuredClone(sections);

const buildCacheKey = (input: {
  enabledOnly?: boolean;
  gameId?: string;
  lessonComponentId?: string;
}): string =>
  JSON.stringify({
    enabledOnly: input.enabledOnly === true,
    gameId: input.gameId ?? null,
    lessonComponentId: input.lessonComponentId ?? null,
  });

export const clearKangurLessonGameSectionsCache = (): void => {
  kangurLessonGameSectionsCache.clear();
  kangurLessonGameSectionsInflight.clear();
};

export async function getKangurLessonGameSectionsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const parsedGameId = kangurGameIdSchema.safeParse(query.gameId);
  const gameId = parsedGameId.success ? parsedGameId.data : undefined;
  const parsedLessonComponentId = kangurLessonComponentIdSchema.safeParse(
    query.lessonComponentId
  );
  const lessonComponentId = parsedLessonComponentId.success
    ? parsedLessonComponentId.data
    : undefined;
  const cacheKey = buildCacheKey({
    enabledOnly: query.enabledOnly,
    gameId,
    lessonComponentId,
  });
  const now = Date.now();
  const cached = kangurLessonGameSectionsCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < KANGUR_LESSON_GAME_SECTIONS_CACHE_TTL_MS) {
    return NextResponse.json(cloneLessonGameSections(cached.data), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const inflight = kangurLessonGameSectionsInflight.get(cacheKey);
  if (inflight) {
    return NextResponse.json(cloneLessonGameSections(await inflight), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const repository = await getKangurLessonGameSectionRepository();
  const inflightPromise = repository
    .listSections({
      enabledOnly: query.enabledOnly,
      gameId,
      lessonComponentId,
    })
    .then((sections) => {
      kangurLessonGameSectionsCache.set(cacheKey, {
        data: cloneLessonGameSections(sections),
        fetchedAt: Date.now(),
      });
      return sections;
    })
    .finally(() => {
      kangurLessonGameSectionsInflight.delete(cacheKey);
    });

  kangurLessonGameSectionsInflight.set(cacheKey, inflightPromise);
  const sections = await inflightPromise;

  return NextResponse.json(sections, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

export async function postKangurLessonGameSectionsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur lesson game sections.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  for (const section of parsed.sections) {
    if (section.gameId !== parsed.gameId) {
      throw new Error('Each lesson game section must match the requested gameId.');
    }
  }

  const repository = await getKangurLessonGameSectionRepository();
  const sections = await repository.replaceSectionsForGame(parsed.gameId, parsed.sections);
  clearKangurLessonGameSectionsCache();

  return NextResponse.json(sections, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

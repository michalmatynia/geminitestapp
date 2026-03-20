import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getKangurPageContentStore,
  upsertKangurPageContentStore,
} from '@/features/kangur/server/page-content-repository';
import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import {
  parseKangurPageContentStore,
  type KangurPageContentStore,
} from '@/shared/contracts/kangur-page-content';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import { normalizeOptionalQueryString } from '@/shared/lib/api';

const PAGE_CONTENT_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

export const querySchema = z.object({
  locale: z.preprocess((value) => normalizeOptionalQueryString(value) ?? 'pl', z.string()),
});

export async function getKangurPageContentHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const store = await getKangurPageContentStore(query.locale);

  return NextResponse.json(store, {
    headers: {
      'Cache-Control': PAGE_CONTENT_CACHE_CONTROL,
    },
  });
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

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

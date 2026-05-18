import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCmsRepository } from '@/features/cms/server';
import { cmsPageCreateSchema } from '@/features/cms/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { ActivityTypes } from '@/shared/constants/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { logActivity } from '@/shared/utils/observability/activity-service';

/**
 * Parses and validates the request body for page creation.
 */
const parseBody = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<
  { ok: true; data: z.infer<typeof cmsPageCreateSchema> } | { ok: false; response: Response }
> => {
...
  return parseJsonBody(req, cmsPageCreateSchema, { logPrefix: 'cms-pages' });
};

/**
 * Fetches cached CMS pages.
 */
async function getCmsPagesCached() {
  'use cache';
  applyCacheLife('swr300');

  const cmsRepository = await getCmsRepository();
  return cmsRepository.getPages();
}

/**
 * API handler for GET /api/cms/pages
 * Fetches and returns a list of CMS pages from cache.
 */
export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<NextResponse | Response> {
  return NextResponse.json(await getCmsPagesCached());
}

/**
 * API handler for POST /api/cms/pages
 * Parses request, creates a new CMS page, links optional slugs, logs activity, and returns the created page.
 */
export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse | Response> {
...

    return parsed.response;
  }

  const { name, slugIds, themeId } = parsed.data;
  const cmsRepository = await getCmsRepository();
  const created = await cmsRepository.createPage({ name, themeId });

  if (slugIds && slugIds.length > 0) {
    for (const slugId of slugIds) {
      await cmsRepository.addSlugToPage(created.id, slugId);
    }
  }

  const pageCreatedType = (ActivityTypes as Record<string, unknown> | undefined)?.['CMS'] as
    | Record<string, string>
    | undefined;
  const activityType = pageCreatedType?.['PAGE_CREATED'];
  if (activityType && typeof logActivity === 'function') {
    void logActivity({
      applicationId: 'cms-builder',
      applicationName: 'CMS Builder',
      sourceService: 'cms.pages',
      type: activityType,
      description: `Created CMS page: ${name}`,
      userId: ctx.userId ?? null,
      entityId: created.id,
      entityType: 'cms_page',
      metadata: { name },
    }).catch(() => {});
  }

  return NextResponse.json(created);
}

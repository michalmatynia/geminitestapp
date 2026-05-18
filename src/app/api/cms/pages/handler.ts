import { type NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';

import { getCmsRepository } from '@/features/cms/server';
import { cmsPageCreateSchema } from '@/features/cms/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { ActivityTypes } from '@/shared/constants/observability';
import type { CmsRepository, Page } from '@/shared/contracts/cms';
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
  if (ctx.body !== undefined) {
    const parsed = cmsPageCreateSchema.safeParse(ctx.body);
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
    return {
      ok: false,
      response: await createErrorResponse(
        validationError('Invalid payload', { issues: parsed.error.flatten() }),
        { request: req, source: 'cms-pages' }
      ),
    };
  }
  return parseJsonBody(req, cmsPageCreateSchema, { logPrefix: 'cms-pages' });
};

/**
 * Fetches cached CMS pages.
 */
async function getCmsPagesCached(): Promise<Page[]> {
  'use cache';
  applyCacheLife('swr300');

  const cmsRepository = await getCmsRepository();
  return cmsRepository.getPages();
}

const linkPageSlugs = async (
  cmsRepository: CmsRepository,
  pageId: string,
  slugIds: string[] | undefined
): Promise<void> => {
  if (slugIds === undefined || slugIds.length === 0) return;
  await Promise.all(slugIds.map((slugId) => cmsRepository.addSlugToPage(pageId, slugId)));
};

const logPageCreatedActivity = (name: string, pageId: string, userId: string | null): void => {
  void logActivity({
    applicationId: 'cms-builder',
    applicationName: 'CMS Builder',
    sourceService: 'cms.pages',
    type: ActivityTypes.CMS.PAGE_CREATED,
    description: `Created CMS page: ${name}`,
    userId,
    entityId: pageId,
    entityType: 'cms_page',
    metadata: { name },
  }).catch(() => {});
};

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
  const parsed = await parseBody(req, ctx);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { name, slugIds, themeId } = parsed.data;
  const cmsRepository = await getCmsRepository();
  const created = await cmsRepository.createPage({ name, themeId });

  await linkPageSlugs(cmsRepository, created.id, slugIds);
  logPageCreatedActivity(name, created.id, ctx.userId ?? null);

  return NextResponse.json(created);
}

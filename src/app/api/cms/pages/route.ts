export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { cmsPageCreateSchema } from '@/features/cms/validations/api';
import { ActivityTypes, logActivity } from '@/features/observability/server';
import { parseJsonBody } from '@/features/products/server';
import { validationError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import type { z } from 'zod';

export const revalidate = 300;

const parseBody = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<
  | { ok: true; data: z.infer<typeof cmsPageCreateSchema> }
  | { ok: false; response: Response }
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
 * GET /api/cms/pages
 * Fetches a list of pages.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse | Response> {
  const cmsRepository = await getCmsRepository();
  const pages = await cmsRepository.getPages();
  return NextResponse.json(pages);
}

/**
 * POST /api/cms/pages
 * Creates a new page.
 */
async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<NextResponse | Response> {
  const parsed = await parseBody(req, ctx);
  if (!parsed.ok) {
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

export const GET = apiHandler(GET_handler, { source: 'cms.pages.GET' });
export const POST = apiHandler(POST_handler, { source: 'cms.pages.POST' });

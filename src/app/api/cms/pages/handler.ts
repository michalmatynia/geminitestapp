import { NextRequest, NextResponse } from 'next/server';

import { getCmsRepository } from '@/features/cms/server';
import { cmsPageCreateSchema } from '@/features/cms/server';
import { parseJsonBody } from '@/features/products/server';
import { ActivityTypes } from '@/shared/constants/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import { logActivity } from '@/shared/utils/observability/activity-service';

import type { z } from 'zod';

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
 * GET /api/cms/pages
 * Fetches a list of pages.
 */
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<NextResponse | Response> {
  const cmsRepository = await getCmsRepository();
  const pages = await cmsRepository.getPages();
  return NextResponse.json(pages);
}

/**
 * POST /api/cms/pages
 * Creates a new page.
 */
export async function POST_handler(
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

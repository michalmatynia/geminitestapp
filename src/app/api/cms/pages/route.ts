export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { cmsService } from '@/features/cms/services/cms-service';
import { cmsPageCreateSchema } from '@/features/cms/validations/api';
import { ActivityTypes, logActivity } from '@/features/observability/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

/**
 * GET /api/cms/pages
 * Fetches a list of pages.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse | Response> {
  const pages = await cmsService.getPages();
  return NextResponse.json(pages);
}

/**
 * POST /api/cms/pages
 * Creates a new page.
 */
async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<NextResponse | Response> {
  const parsed = await parseJsonBody(req, cmsPageCreateSchema, {
    logPrefix: 'cms-pages',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const { name, slugIds } = parsed.data;
  const created = await cmsService.createPage({ name });

  if (slugIds && slugIds.length > 0) {
    await cmsService.replacePageSlugs(created.id, slugIds);
  }

  void logActivity({
    type: ActivityTypes.CMS.PAGE_CREATED,
    description: `Created CMS page: ${name}`,
    userId: ctx.userId ?? null,
    entityId: created.id,
    entityType: 'cms_page',
    metadata: { name }
  }).catch(() => {});

  const page = await cmsService.getPageById(created.id);
  return NextResponse.json(page ?? created);
}

export const GET = apiHandler(GET_handler, { source: 'cms.pages.GET' });
export const POST = apiHandler(POST_handler, { source: 'cms.pages.POST' });

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { cmsPageUpdateSchema } from '@/features/cms/validations/api';
import { ActivityTypes, logActivity } from '@/features/observability/server';
import { parseJsonBody } from '@/features/products/server';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { z } from 'zod';

type Params = { id: string };

const logCmsActivity = (payload: {
  event: 'PAGE_UPDATED' | 'PAGE_DELETED';
  description: string;
  userId: string | null;
  entityId: string;
  metadata: Record<string, unknown>;
}): void => {
  const cmsActivityTypes = (ActivityTypes as Record<string, unknown> | undefined)?.['CMS'] as
    | Record<string, string>
    | undefined;
  const type = cmsActivityTypes?.[payload.event];
  if (!type || typeof logActivity !== 'function') {
    return;
  }
  void logActivity({
    type,
    description: payload.description,
    userId: payload.userId,
    entityId: payload.entityId,
    entityType: 'cms_page',
    metadata: payload.metadata,
  }).catch(() => {});
};

const parseBody = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<
  | { ok: true; data: z.infer<typeof cmsPageUpdateSchema> }
  | { ok: false; response: Response }
> => {
  if (ctx.body !== undefined) {
    const parsed = cmsPageUpdateSchema.safeParse(ctx.body);
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
    return { ok: false, response: NextResponse.json({ error: 'Invalid payload' }, { status: 400 }) };
  }
  return parseJsonBody(req, cmsPageUpdateSchema, { logPrefix: 'cms-pages' });
};

/**
 * GET /api/cms/pages/[id]
 * Fetches a single page by its ID.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  const { id } = params;
  const cmsRepository = await getCmsRepository();
  const page = await cmsRepository.getPageById(id);

  if (!page) {
    throw notFoundError('Page not found');
  }

  return NextResponse.json(page);
}

/**
 * PUT /api/cms/pages/[id]
 * Updates a page.
 */
async function PUT_handler(req: NextRequest, ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  const { id } = params;

  const parsed = await parseBody(req, ctx);
  if (!parsed.ok) {
    return parsed.response;
  }
  const { name, status, publishedAt, seoTitle, seoDescription, seoOgImage, seoCanonical, robotsMeta, themeId, slugIds, components, showMenu } = parsed.data;

  const cmsRepository = await getCmsRepository();

  // Update basic info, status, SEO, and components
  const updatedPage = await cmsRepository.updatePage(id, {
    name,
    status,
    publishedAt,
    seoTitle,
    seoDescription,
    seoOgImage,
    seoCanonical,
    robotsMeta,
    themeId,
    showMenu,
    components,
  });

  if (!updatedPage) {
    throw notFoundError('Page not found');
  }

  // Update slugs only when provided
  if (slugIds !== undefined) {
    await cmsRepository.replacePageSlugs(id, slugIds);
  }

  logCmsActivity({
    event: 'PAGE_UPDATED',
    description: `Updated CMS page: ${updatedPage.name}`,
    userId: ctx.userId ?? null,
    entityId: id,
    metadata: { name: updatedPage.name, status },
  });

  return NextResponse.json(updatedPage);
}

/**
 * DELETE /api/products/categories/[id]
 * Deletes a product category and all its children (cascade).
 */
/**
 * DELETE /api/cms/pages/[id]
 * Deletes a page.
 */
async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  const { id } = params;
  const cmsRepository = await getCmsRepository();
  
  const page = await cmsRepository.getPageById(id);
  await cmsRepository.deletePage(id);

  if (page) {
    logCmsActivity({
      event: 'PAGE_DELETED',
      description: `Deleted CMS page: ${page.name}`,
      userId: ctx.userId ?? null,
      entityId: id,
      metadata: { name: page.name },
    });
  }

  return new Response(null, { status: 204 });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: 'cms.pages.[id].GET' });

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: 'cms.pages.[id].PUT' });

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: 'cms.pages.[id].DELETE' });

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { cmsPageUpdateSchema } from '@/features/cms/validations/api';
import { ActivityTypes, logActivity } from '@/features/observability/server';
import { parseJsonBody } from '@/features/products/server';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

type Params = { id: string };

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

  const parsed = await parseJsonBody(req, cmsPageUpdateSchema, {
    logPrefix: 'cms-pages',
  });
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

  void logActivity({
    type: ActivityTypes.CMS.PAGE_UPDATED,
    description: `Updated CMS page: ${updatedPage.name}`,
    userId: ctx.userId ?? null,
    entityId: id,
    entityType: 'cms_page',
    metadata: { name: updatedPage.name, status }
  }).catch(() => {});

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
    void logActivity({
      type: ActivityTypes.CMS.PAGE_DELETED,
      description: `Deleted CMS page: ${page.name}`,
      userId: ctx.userId ?? null,
      entityId: id,
      entityType: 'cms_page',
      metadata: { name: page.name }
    }).catch(() => {});
  }

  return new Response(null, { status: 204 });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: 'cms.pages.[id].GET' });

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: 'cms.pages.[id].PUT' });

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: 'cms.pages.[id].DELETE' });

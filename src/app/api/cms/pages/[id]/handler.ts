import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { getCmsRepository } from '@/features/cms/server';
import { cmsPageUpdateSchema } from '@/features/cms/server';
import { logCmsActivity } from '@/features/cms/services/cms-activity';
import { parseJsonBody } from '@/features/products/server';
import type { IdDto as Params } from '@/shared/contracts/base';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import { applyCacheLife } from '@/shared/lib/next/cache-life';

// ... existing logCmsActivity function ...

const parseBody = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<
  { ok: true; data: z.infer<typeof cmsPageUpdateSchema> } | { ok: false; response: Response }
> => {
  if (ctx.body !== undefined) {
    const parsed = cmsPageUpdateSchema.safeParse(ctx.body);
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
  return parseJsonBody(req, cmsPageUpdateSchema, { logPrefix: 'cms-pages' });
};

/**
 * GET /api/cms/pages/[id]
 * Fetches a single page by its ID.
 */
async function getCmsPageByIdCached(id: string) {
  'use cache';
  applyCacheLife('swr300');

  const cmsRepository = await getCmsRepository();
  return cmsRepository.getPageById(id);
}

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;
  const page = await getCmsPageByIdCached(id);

  if (!page) {
    throw notFoundError('Page not found');
  }

  return NextResponse.json(page);
}

/**
 * PUT /api/cms/pages/[id]
 * Updates a page.
 */
export async function putHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;

  const parsed = await parseBody(req, ctx);
  if (!parsed.ok) {
    return parsed.response;
  }
  const {
    name,
    status,
    publishedAt,
    seoTitle,
    seoDescription,
    seoOgImage,
    seoCanonical,
    robotsMeta,
    themeId,
    slugIds,
    components,
    showMenu,
  } = parsed.data;

  const cmsRepository = await getCmsRepository();

  // Update basic info, status, SEO, and components
  const updatedPage = await cmsRepository.updatePage(id, {
    name,
    ...(status ? { status } : {}),
    publishedAt: publishedAt ?? undefined,
    seoTitle: seoTitle ?? undefined,
    seoDescription: seoDescription ?? undefined,
    seoOgImage: seoOgImage ?? undefined,
    seoCanonical: seoCanonical ?? undefined,
    robotsMeta: robotsMeta ?? undefined,
    themeId: themeId ?? undefined,
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

  void logCmsActivity({
    event: 'PAGE_UPDATED',
    description: `Updated CMS page: ${updatedPage.name}`,
    userId: ctx.userId ?? null,
    entityId: id,
    metadata: { name: updatedPage.name, status },
  });

  return NextResponse.json(updatedPage);
}

/**
 * DELETE /api/cms/pages/[id]
 * Deletes a page.
 */
export async function deleteHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;
  const cmsRepository = await getCmsRepository();

  const page = await cmsRepository.getPageById(id);
  await cmsRepository.deletePage(id);

  if (page) {
    void logCmsActivity({
      event: 'PAGE_DELETED',
      description: `Deleted CMS page: ${page.name}`,
      userId: ctx.userId ?? null,
      entityId: id,
      metadata: { name: page.name },
    });
  }

  return new Response(null, { status: 204 });
}

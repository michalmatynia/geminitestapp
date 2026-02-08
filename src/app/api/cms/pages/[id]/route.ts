export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { parseJsonBody } from '@/features/products/server';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

type Params = { id: string };

const pageUpdateSchema = z.object({
  name: z.string().trim().min(1),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  publishedAt: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  seoOgImage: z.string().nullable().optional(),
  seoCanonical: z.string().nullable().optional(),
  robotsMeta: z.string().nullable().optional(),
  showMenu: z.boolean().optional(),
  themeId: z.string().nullable().optional(),
  slugIds: z.array(z.string().trim().min(1)).optional(),
  components: z.array(
    z.object({
      type: z.string().trim().min(1),
      content: z.record(z.string(), z.any()),
    })
  ),
});

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
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  const { id } = params;

  const parsed = await parseJsonBody(req, pageUpdateSchema, {
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

  return NextResponse.json(updatedPage);
}

/**
 * DELETE /api/cms/pages/[id]
 * Deletes a page.
 */
async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  const { id } = params;
  const cmsRepository = await getCmsRepository();
  
  await cmsRepository.deletePage(id);

  return new Response(null, { status: 204 });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: 'cms.pages.[id].GET' });

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: 'cms.pages.[id].PUT' });

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: 'cms.pages.[id].DELETE' });

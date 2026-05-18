import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getDomainSlugLinks,
  getSlugForDomainById,
  isSlugLinkedToAnyDomain,
  isDomainZoningEnabled,
  removeDomainSlug,
  resolveCmsDomainFromRequest,
  resolveCmsDomainScopeById,
  setDomainDefaultSlug,
  setGlobalDefaultSlug,
} from '@/features/cms/server';
import { getCmsRepository } from '@/features/cms/server';
import { cmsSlugUpdateSchema } from '@/features/cms/server';
import { logCmsActivity } from '@/features/cms/services/cms-activity';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import type { IdDto as Params } from '@/shared/contracts/base';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';

export const querySchema = z.object({
  domainId: optionalTrimmedQueryString(),
});

const resolveDomainFromRequest = async (
  req: NextRequest,
  query?: z.infer<typeof querySchema>
) => {
  const domainId = query?.domainId ?? null;
  if (domainId) {
    const domain = await resolveCmsDomainScopeById(domainId);
    if (!domain) {
      throw notFoundError('Domain not found');
    }
    return domain;
  }
  return resolveCmsDomainFromRequest(req);
};

/**
 * GET /api/cms/slugs/[id]
 * Fetches a single slug by its ID.
 */
export async function getHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const cmsRepository = await getCmsRepository();
  const domain = await resolveDomainFromRequest(req, query);
  const slug = await getSlugForDomainById(domain.id, id, cmsRepository);

  if (!slug) {
    throw notFoundError('Slug not found');
  }

  return NextResponse.json(slug);
}

/**
 * DELETE /api/cms/slugs/[id]
 * Deletes a slug.
 */
export async function deleteHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const cmsRepository = await getCmsRepository();
  const domain = await resolveDomainFromRequest(req, query);

  await removeDomainSlug(domain.id, id);
  const stillLinked = await isSlugLinkedToAnyDomain(id);
  if (!stillLinked) {
    await cmsRepository.deleteSlug(id);
  }

  void logCmsActivity({
    event: stillLinked ? 'SLUG_UNLINKED' : 'SLUG_DELETED',
    description: `${stillLinked ? 'Unlinked' : 'Deleted'} CMS slug`,
    userId: ctx.userId ?? null,
    entityId: id,
    entityType: 'cms_slug',
    metadata: { domainId: domain.id },
  }).catch(() => {});

  return new Response(null, { status: 204 });
}

/**
 * PUT /api/cms/slugs/[id]
 * Updates a slug.
 */
export async function putHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;

  const parsed = await parseJsonBody(req, cmsSlugUpdateSchema, {
    logPrefix: 'cms-slugs',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { slug, isDefault } = parsed.data;

  const cmsRepository = await getCmsRepository();
  const domain = await resolveDomainFromRequest(req, query);
  const zoningEnabled = await isDomainZoningEnabled();

  const updatedSlug = await cmsRepository.updateSlug(id, {
    slug,
    // Default is domain-scoped, handled below.
  });

  if (!updatedSlug) {
    throw notFoundError('Slug not found');
  }

  if (typeof isDefault === 'boolean') {
    if (zoningEnabled) {
      if (isDefault) {
        await setDomainDefaultSlug(domain.id, id);
      } else {
        const links = await getDomainSlugLinks(domain.id);
        const isCurrentDefault = links.some((link) => link.slugId === id && link.isDefault);
        if (isCurrentDefault) {
          await setDomainDefaultSlug(domain.id, null);
        }
      }
    } else {
      if (isDefault) {
        await setGlobalDefaultSlug(id);
      } else if (updatedSlug?.isDefault) {
        await setGlobalDefaultSlug(null);
      }
    }
  }

  if (zoningEnabled) {
    const domainSlug = await getSlugForDomainById(domain.id, id, cmsRepository);
    void logCmsActivity({
      event: 'SLUG_UPDATED',
      description: `Updated CMS slug: ${updatedSlug.slug}`,
      userId: ctx.userId ?? null,
      entityId: id,
      entityType: 'cms_slug',
      metadata: { slug: updatedSlug.slug, domainId: domain.id, isDefault: isDefault ?? null },
    }).catch(() => {});
    return NextResponse.json(domainSlug ?? updatedSlug);
  }

  const refreshed = await cmsRepository.getSlugById(id);
  void logCmsActivity({
    event: 'SLUG_UPDATED',
    description: `Updated CMS slug: ${updatedSlug.slug}`,
    userId: ctx.userId ?? null,
    entityId: id,
    entityType: 'cms_slug',
    metadata: { slug: updatedSlug.slug, isDefault: isDefault ?? null },
  }).catch(() => {});
  return NextResponse.json(refreshed ?? updatedSlug);
}

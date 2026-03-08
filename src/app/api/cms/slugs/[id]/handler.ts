import { NextRequest, NextResponse } from 'next/server';

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
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

type Params = { id: string };

const resolveDomainFromRequest = async (req: NextRequest) => {
  const domainId = req.nextUrl.searchParams.get('domainId');
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
export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;
  const cmsRepository = await getCmsRepository();
  const domain = await resolveDomainFromRequest(req);
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
export async function DELETE_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;
  const cmsRepository = await getCmsRepository();
  const domain = await resolveDomainFromRequest(req);

  await removeDomainSlug(domain.id, id);
  const stillLinked = await isSlugLinkedToAnyDomain(id);
  if (!stillLinked) {
    await cmsRepository.deleteSlug(id);
  }

  return new Response(null, { status: 204 });
}

/**
 * PUT /api/cms/slugs/[id]
 * Updates a slug.
 */
export async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;

  const parsed = await parseJsonBody(req, cmsSlugUpdateSchema, {
    logPrefix: 'cms-slugs',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { slug, isDefault } = parsed.data;

  const cmsRepository = await getCmsRepository();
  const domain = await resolveDomainFromRequest(req);
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
    return NextResponse.json(domainSlug ?? updatedSlug);
  }

  const refreshed = await cmsRepository.getSlugById(id);
  return NextResponse.json(refreshed ?? updatedSlug);
}

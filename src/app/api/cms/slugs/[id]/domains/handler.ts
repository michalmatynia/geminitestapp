import { NextRequest, NextResponse } from 'next/server';

import {
  ensureDomainSlug,
  getDomainIdsForSlug,
  isDomainZoningEnabled,
  removeDomainSlug,
  resolveCmsDomainScopeById,
} from '@/features/cms/server';
import { getCmsRepository } from '@/features/cms/server';
import { cmsSlugDomainsUpdateSchema } from '@/features/cms/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

type Params = { id: string };

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;
  const cmsRepository = await getCmsRepository();
  const slug = await cmsRepository.getSlugById(id);
  if (!slug) {
    throw notFoundError('Slug not found');
  }
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return NextResponse.json({ domainIds: [] });
  }
  const domainIds = await getDomainIdsForSlug(id);
  return NextResponse.json({ domainIds });
}

export async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  const { id } = params;
  const parsed = await parseJsonBody(req, cmsSlugDomainsUpdateSchema, {
    logPrefix: 'cms-slug-domains',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const cmsRepository = await getCmsRepository();
  const slug = await cmsRepository.getSlugById(id);
  if (!slug) {
    throw notFoundError('Slug not found');
  }

  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return NextResponse.json({ domainIds: [] });
  }

  const canonicalIds: string[] = [];
  for (const domainId of parsed.data.domainIds) {
    const domain = await resolveCmsDomainScopeById(domainId);
    if (domain) {
      canonicalIds.push(domain.id);
    }
  }
  const nextIds = Array.from(new Set(canonicalIds));
  const currentIds = await getDomainIdsForSlug(id);

  const toAdd = nextIds.filter((domainId: string) => !currentIds.includes(domainId));
  const toRemove = currentIds.filter((domainId: string) => !nextIds.includes(domainId));

  for (const domainId of toAdd) {
    await ensureDomainSlug(domainId, id);
  }
  for (const domainId of toRemove) {
    await removeDomainSlug(domainId, id);
  }

  return NextResponse.json({ domainIds: nextIds });
}

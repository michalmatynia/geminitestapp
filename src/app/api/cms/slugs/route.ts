export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import {
  ensureDomainSlug,
  getSlugsForDomain,
  getSlugForDomainById,
  resolveCmsDomainFromRequest,
  resolveCmsDomainScopeById,
} from '@/features/cms/services/cms-domain';
import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { cmsSlugCreateSchema } from '@/features/cms/validations/api';
import { parseJsonBody } from '@/features/products/server';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { z } from 'zod';

const resolveDomainFromRequest = async (req: NextRequest) => {
  const searchParams = req.nextUrl?.searchParams ?? new URL(req.url).searchParams;
  const domainId = searchParams.get('domainId');
  if (domainId) {
    const domain = await resolveCmsDomainScopeById(domainId);
    if (!domain) {
      throw notFoundError('Domain not found');
    }
    return domain;
  }
  return resolveCmsDomainFromRequest(req);
};

const parseBody = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<
  | { ok: true; data: z.infer<typeof cmsSlugCreateSchema> }
  | { ok: false; response: Response }
> => {
  if (ctx.body !== undefined) {
    const parsed = cmsSlugCreateSchema.safeParse(ctx.body);
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
    return { ok: false, response: NextResponse.json({ error: 'Invalid payload' }, { status: 400 }) };
  }
  return parseJsonBody(req, cmsSlugCreateSchema, { logPrefix: 'cms-slugs' });
};

/**
 * GET /api/cms/slugs
 * Fetches a list of all slugs.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse | Response> {
  const cmsRepository = await getCmsRepository();
  const scope = req.nextUrl?.searchParams.get('scope') ?? new URL(req.url).searchParams.get('scope');
  if (scope === 'all') {
    await resolveCmsDomainFromRequest(req);
    const slugs = await cmsRepository.getSlugs();
    return NextResponse.json(slugs);
  }
  const domain = await resolveDomainFromRequest(req);
  const slugs = await getSlugsForDomain(domain.id, cmsRepository);
  return NextResponse.json(slugs);
}

/**
 * POST /api/cms/slugs
 * Creates a new slug.
 */
async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseBody(req, ctx);
  if (!parsed.ok) {
    return parsed.response;
  }
  const { slug } = parsed.data;
  const cmsRepository = await getCmsRepository();
  const domain = await resolveDomainFromRequest(req);
  const existing = await cmsRepository.getSlugByValue(slug);
  const record = existing ?? (await cmsRepository.createSlug({ slug, isDefault: false }));
  if (typeof ensureDomainSlug === 'function') {
    await ensureDomainSlug(domain.id, record.id);
  }
  const domainSlug = await getSlugForDomainById(domain.id, record.id, cmsRepository);
  return NextResponse.json(domainSlug ?? { ...record, isDefault: false });
}

export const GET = apiHandler(GET_handler, { source: 'cms.slugs.GET' });
export const POST = apiHandler(POST_handler, { source: 'cms.slugs.POST' });

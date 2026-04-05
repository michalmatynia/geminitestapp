import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ensureDomainSlug,
  getSlugsForDomain,
  getSlugForDomainById,
  resolveCmsDomainFromRequest,
  resolveCmsDomainScopeById,
} from '@/features/cms/server';
import { getCmsRepository } from '@/features/cms/server';
import { cmsSlugCreateSchema } from '@/features/cms/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import {
  normalizeOptionalQueryString,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  domainId: optionalTrimmedQueryString(),
  scope: z.preprocess(
    (value) => (normalizeOptionalQueryString(value) === 'all' ? 'all' : undefined),
    z.literal('all').optional()
  ),
});

const cmsSlugCreateRequestSchema = cmsSlugCreateSchema.extend({
  pageId: cmsSlugCreateSchema.shape.pageId.optional().default(null),
  isDefault: cmsSlugCreateSchema.shape.isDefault.optional().default(false),
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

const parseBody = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<
  | { ok: true; data: z.infer<typeof cmsSlugCreateRequestSchema> }
  | { ok: false; response: Response }
> => {
  if (ctx.body !== undefined) {
    const parsed = cmsSlugCreateRequestSchema.safeParse(ctx.body);
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
    return {
      ok: false,
      response: await createErrorResponse(
        validationError('Invalid payload', { issues: parsed.error.flatten() }),
        { request: req, source: 'cms-slugs' }
      ),
    };
  }
  return parseJsonBody(req, cmsSlugCreateRequestSchema, { logPrefix: 'cms-slugs' });
};

/**
 * GET /api/cms/slugs
 * Fetches a list of all slugs.
 */
export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<NextResponse | Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const cmsRepository = await getCmsRepository();
  if (query.scope === 'all') {
    await resolveCmsDomainFromRequest(req);
    const slugs = await cmsRepository.getSlugs();
    return NextResponse.json(slugs);
  }
  const domain = await resolveDomainFromRequest(req, query);
  const slugs = await getSlugsForDomain(domain.id, cmsRepository);
  return NextResponse.json(slugs);
}

/**
 * POST /api/cms/slugs
 * Creates a new slug.
 */
export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const parsed = await parseBody(req, ctx);
  if (!parsed.ok) {
    return parsed.response;
  }
  const { isDefault, locale, pageId, slug, translationGroupId } = parsed.data;
  const cmsRepository = await getCmsRepository();
  const domain = await resolveDomainFromRequest(req, query);
  const existing = await cmsRepository.getSlugByValue(slug);
  const createSlugInput: Parameters<typeof cmsRepository.createSlug>[0] = {
    slug,
    isDefault,
  };
  if (pageId) {
    createSlugInput.pageId = pageId;
  }
  if (locale !== 'pl') {
    createSlugInput.locale = locale;
  }
  if (translationGroupId) {
    createSlugInput.translationGroupId = translationGroupId;
  }
  const record = existing ?? (await cmsRepository.createSlug(createSlugInput));
  if (typeof ensureDomainSlug === 'function') {
    await ensureDomainSlug(domain.id, record.id);
  }
  const domainSlug = await getSlugForDomainById(domain.id, record.id, cmsRepository);
  return NextResponse.json(domainSlug ?? { ...record, isDefault: false });
}

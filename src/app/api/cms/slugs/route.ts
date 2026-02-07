export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { notFoundError } from "@/shared/errors/app-error";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import {
  ensureDomainSlug,
  getSlugsForDomain,
  getSlugForDomainById,
  resolveCmsDomainFromRequest,
  resolveCmsDomainScopeById,
} from "@/features/cms/services/cms-domain";

const slugSchema = z.object({
  slug: z.string().trim().min(1),
});

const resolveDomainFromRequest = async (req: NextRequest) => {
  const domainId = req.nextUrl.searchParams.get("domainId");
  if (domainId) {
    const domain = await resolveCmsDomainScopeById(domainId);
    if (!domain) {
      throw notFoundError("Domain not found");
    }
    return domain;
  }
  return resolveCmsDomainFromRequest(req);
};

/**
 * GET /api/cms/slugs
 * Fetches a list of all slugs.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse | Response> {
  const cmsRepository = await getCmsRepository();
  const scope = req.nextUrl.searchParams.get("scope");
  if (scope === "all") {
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
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, slugSchema, {
    logPrefix: "cms-slugs",
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { slug } = parsed.data;
  const cmsRepository = await getCmsRepository();
  const domain = await resolveDomainFromRequest(req);
  const existing = await cmsRepository.getSlugByValue(slug);
  const record = existing ?? (await cmsRepository.createSlug({ slug, isDefault: false }));
  await ensureDomainSlug(domain.id, record.id);
  const domainSlug = await getSlugForDomainById(domain.id, record.id, cmsRepository);
  return NextResponse.json(domainSlug ?? { ...record, isDefault: false });
}

export const GET = apiHandler(GET_handler, { source: "cms.slugs.GET" });
export const POST = apiHandler(POST_handler, { source: "cms.slugs.POST" });

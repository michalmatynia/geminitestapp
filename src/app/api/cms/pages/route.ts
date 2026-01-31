import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { ErrorSystem } from "@/features/observability/server";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import { notFoundError } from "@/shared/errors/app-error";
import { getSlugsForDomain, resolveCmsDomainFromRequest, resolveCmsDomainScopeById } from "@/features/cms/services/cms-domain";

const pageCreateSchema = z.object({
  name: z.string().trim().min(1),
  themeId: z.string().trim().optional(),
  slugIds: z.array(z.string().trim().min(1)).default([]),
});

/**
 * GET /api/cms/pages
 * Fetches a list of all pages.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse | Response> {
  try {
    const cmsRepository = await getCmsRepository();
    const scope = req.nextUrl.searchParams.get("scope");
    if (scope === "all") {
      const pages = await cmsRepository.getPages();
      return NextResponse.json(pages);
    }

    const domainId = req.nextUrl.searchParams.get("domainId");
    const domain = domainId
      ? await resolveCmsDomainScopeById(domainId)
      : await resolveCmsDomainFromRequest(req);
    if (!domain) {
      throw notFoundError("Domain not found");
    }

    const slugs = await getSlugsForDomain(domain.id, cmsRepository);
    if (!slugs.length) {
      return NextResponse.json([]);
    }

    const allowed = new Set(slugs.map((slug) => slug.slug));
    const pages = await cmsRepository.getPages();
    const filtered = pages.filter((page) =>
      (page.slugs ?? []).some((link) => allowed.has(link.slug.slug))
    );
    return NextResponse.json(filtered);
  } catch (_error) {
    await ErrorSystem.captureException(_error, {
      service: "api/cms/pages",
      method: "GET",
    });
    return createErrorResponse(_error, {
      request: req,
      source: "cms.pages.GET",
      fallbackMessage: "Failed to fetch pages",
    });
  }
}

/**
 * POST /api/cms/pages
 * Creates a new page.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, pageCreateSchema, {
      logPrefix: "cms-pages",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { name, themeId, slugIds } = parsed.data;
    
    const cmsRepository = await getCmsRepository();
    const newPage = await cmsRepository.createPage({ name });
    
    // Update themeId if provided
    if (themeId) {
      await cmsRepository.updatePage(newPage.id, { themeId });
    }
    
    if (slugIds.length > 0) {
      for (const slugId of slugIds) {
        await cmsRepository.addSlugToPage(newPage.id, slugId);
      }
    }
    
    return NextResponse.json(newPage);
  } catch (_error) {
    await ErrorSystem.captureException(_error, {
      service: "api/cms/pages",
      method: "POST",
    });
    return createErrorResponse(_error, {
      source: "cms.pages.POST",
      fallbackMessage: "Failed to create page",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "cms.pages.GET" });
export const POST = apiHandler(POST_handler, { source: "cms.pages.POST" });

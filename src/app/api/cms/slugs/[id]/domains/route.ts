import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import { notFoundError } from "@/shared/errors/app-error";
import type { ApiHandlerContext } from "@/shared/types/api";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import {
  ensureDomainSlug,
  getDomainIdsForSlug,
  isDomainZoningEnabled,
  removeDomainSlug,
  resolveCmsDomainScopeById,
} from "@/features/cms/services/cms-domain";

type Params = { id: string };

const domainsSchema = z.object({
  domainIds: z.array(z.string().trim().min(1)),
});

async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  try {
    const { id } = params;
    const cmsRepository = await getCmsRepository();
    const slug = await cmsRepository.getSlugById(id);
    if (!slug) {
      throw notFoundError("Slug not found");
    }
    const zoningEnabled = await isDomainZoningEnabled();
    if (!zoningEnabled) {
      return NextResponse.json({ domainIds: [] });
    }
    const domainIds = await getDomainIdsForSlug(id);
    return NextResponse.json({ domainIds });
  } catch (error) {
    return createErrorResponse(error, {
      request: _req,
      source: "cms.slugs.[id].domains.GET",
      fallbackMessage: "Failed to fetch slug zones",
    });
  }
}

async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<NextResponse | Response> {
  try {
    const { id } = params;
    const parsed = await parseJsonBody(req, domainsSchema, {
      logPrefix: "cms-slug-domains",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const cmsRepository = await getCmsRepository();
    const slug = await cmsRepository.getSlugById(id);
    if (!slug) {
      throw notFoundError("Slug not found");
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
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.slugs.[id].domains.PUT",
      fallbackMessage: "Failed to update slug zones",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: "cms.slugs.[id].domains.GET",
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: "cms.slugs.[id].domains.PUT",
});

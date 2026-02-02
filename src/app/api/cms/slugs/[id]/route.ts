export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import type { ApiHandlerContext } from "@/shared/types/api";
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
} from "@/features/cms/services/cms-domain";

type Params = { id: string };

const slugUpdateSchema = z.object({
  slug: z.string().trim().min(1),
  isDefault: z.boolean().optional(),
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
 * GET /api/cms/slugs/[id]
 * Fetches a single slug by its ID.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  try {
    const { id } = params;
    const cmsRepository = await getCmsRepository();
    const domain = await resolveDomainFromRequest(req);
    const slug = await getSlugForDomainById(domain.id, id, cmsRepository);

    if (!slug) {
      throw notFoundError("Slug not found");
    }

    return NextResponse.json(slug);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.slugs.[id].GET",
      fallbackMessage: "Failed to fetch slug",
    });
  }
}

/**
 * DELETE /api/cms/slugs/[id]
 * Deletes a slug.
 */
async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  try {
    const { id } = params;
    const cmsRepository = await getCmsRepository();
    const domain = await resolveDomainFromRequest(req);

    await removeDomainSlug(domain.id, id);
    const stillLinked = await isSlugLinkedToAnyDomain(id);
    if (!stillLinked) {
      await cmsRepository.deleteSlug(id);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.slugs.[id].DELETE",
      fallbackMessage: "Failed to delete slug",
    });
  }
}

/**
 * PUT /api/cms/slugs/[id]
 * Updates a slug.
 */
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  try {
    const { id } = params;

    const parsed = await parseJsonBody(req, slugUpdateSchema, {
      logPrefix: "cms-slugs",
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
      throw notFoundError("Slug not found");
    }

    if (typeof isDefault === "boolean") {
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
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.slugs.[id].PUT",
      fallbackMessage: "Failed to update slug",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: "cms.slugs.[id].GET" });

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "cms.slugs.[id].DELETE" });

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: "cms.slugs.[id].PUT" });

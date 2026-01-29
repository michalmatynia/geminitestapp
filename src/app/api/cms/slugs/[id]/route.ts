import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import type { ApiHandlerContext } from "@/shared/types/api";

type Params = { id: string };

const slugUpdateSchema = z.object({
  slug: z.string().trim().min(1),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/cms/slugs/[id]
 * Fetches a single slug by its ID.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  try {
    const { id } = params;
    const cmsRepository = await getCmsRepository();
    const slug = await cmsRepository.getSlugById(id);

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
    
    await cmsRepository.deleteSlug(id);

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
    
    if (isDefault) {
      // In a real repo we might want a dedicated method for this, 
      // but for now we'll handle it if needed.
      // Slugs repository doesn't have unsetDefault yet, 
      // but we can add it if needed.
    }

    const updatedSlug = await cmsRepository.updateSlug(id, {
      slug,
      isDefault,
    });

    if (!updatedSlug) {
      throw notFoundError("Slug not found");
    }

    return NextResponse.json(updatedSlug);
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

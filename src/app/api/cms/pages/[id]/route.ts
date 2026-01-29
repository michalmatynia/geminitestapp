import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import type { ApiHandlerContext } from "@/shared/types/api";

type Params = { id: string };

const pageUpdateSchema = z.object({
  name: z.string().trim().min(1),
  slugIds: z.array(z.string().trim().min(1)),
  components: z.array(
    z.object({
      type: z.string().trim().min(1),
      content: z.record(z.string(), z["unknown"]()),
    })
  ),
});

/**
 * GET /api/cms/pages/[id]
 * Fetches a single page by its ID.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  try {
    const { id } = params;
    const cmsRepository = await getCmsRepository();
    const page = await cmsRepository.getPageById(id);

    if (!page) {
      throw notFoundError("Page not found");
    }

    return NextResponse.json(page);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.pages.[id].GET",
      fallbackMessage: "Failed to fetch page",
    });
  }
}

/**
 * PUT /api/cms/pages/[id]
 * Updates a page.
 */
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  try {
    const { id } = params;

    const parsed = await parseJsonBody(req, pageUpdateSchema, {
      logPrefix: "cms-pages",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { name, slugIds, components } = parsed.data;

    const cmsRepository = await getCmsRepository();
    
    // Update basic info and components
    const updatedPage = await cmsRepository.updatePage(id, {
      name,
      components,
    });

    if (!updatedPage) {
      throw notFoundError("Page not found");
    }

    // Update slugs
    await cmsRepository.replacePageSlugs(id, slugIds);

    return NextResponse.json(updatedPage);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.pages.[id].PUT",
      fallbackMessage: "Failed to update page",
    });
  }
}

/**
 * DELETE /api/cms/pages/[id]
 * Deletes a page.
 */
async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: Params): Promise<NextResponse | Response> {
  try {
    const { id } = params;
    const cmsRepository = await getCmsRepository();
    
    await cmsRepository.deletePage(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.pages.[id].DELETE",
      fallbackMessage: "Failed to delete page",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: "cms.pages.[id].GET" });

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: "cms.pages.[id].PUT" });

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "cms.pages.[id].DELETE" });

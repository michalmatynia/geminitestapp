export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { getCmsRepository } from "@/features/cms/services/cms-repository";

const createPageSchema = z.object({
  name: z.string().trim().min(1),
  slugIds: z.array(z.string().trim().min(1)).optional(),
});

/**
 * GET /api/cms/pages
 * Fetches a list of pages.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse | Response> {
  try {
    const cmsRepository = await getCmsRepository();
    const pages = await cmsRepository.getPages();
    return NextResponse.json(pages);
  } catch (error) {
    return createErrorResponse(error, {
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
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse | Response> {
  try {
    const parsed = await parseJsonBody(req, createPageSchema, {
      logPrefix: "cms-pages",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { name, slugIds } = parsed.data;
    const cmsRepository = await getCmsRepository();
    const created = await cmsRepository.createPage({ name });

    if (slugIds && slugIds.length > 0) {
      await cmsRepository.replacePageSlugs(created.id, slugIds);
    }

    const page = await cmsRepository.getPageById(created.id);
    return NextResponse.json(page ?? created);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.pages.POST",
      fallbackMessage: "Failed to create page",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "cms.pages.GET" });
export const POST = apiHandler(POST_handler, { source: "cms.pages.POST" });

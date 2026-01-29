import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { ErrorSystem } from "@/features/observability/server";
import { getCmsRepository } from "@/features/cms/services/cms-repository";

const pageCreateSchema = z.object({
  name: z.string().trim().min(1),
  slugIds: z.array(z.string().trim().min(1)).default([]),
});

/**
 * GET /api/cms/pages
 * Fetches a list of all pages.
 */
async function GET_handler(): Promise<NextResponse | Response> {
  try {
    const cmsRepository = await getCmsRepository();
    const pages = await cmsRepository.getPages();
    return NextResponse.json(pages);
  } catch (_error) {
    await ErrorSystem.captureException(_error, {
      service: "api/cms/pages",
      method: "GET",
    });
    return createErrorResponse(_error, {
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
    const { name, slugIds } = parsed.data;
    
    const cmsRepository = await getCmsRepository();
    const newPage = await cmsRepository.createPage({ name });
    
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

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "cms.pages.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "cms.pages.POST" });

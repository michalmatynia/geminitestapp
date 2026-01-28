import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

const slugSchema = z.object({
  slug: z.string().trim().min(1),
});

/**
 * GET /api/cms/slugs
 * Fetches a list of all slugs.
 */
async function GET_handler() {
  try {
    const slugs = await prisma.slug.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(slugs);
  } catch (_error) {
    return createErrorResponse(_error, {
      source: "cms.slugs.GET",
      fallbackMessage: "Failed to fetch slugs",
    });
  }
}

/**
 * POST /api/cms/slugs
 * Creates a new slug.
 */
async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, slugSchema, {
      logPrefix: "cms-slugs",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { slug } = parsed.data;
    const newSlug = await prisma.slug.create({
      data: { slug },
    });
    return NextResponse.json(newSlug);
  } catch (error) {
    return createErrorResponse(error, {
      source: "cms.slugs.POST",
      fallbackMessage: "Failed to create slug",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "cms.slugs.GET" });
export const POST = apiHandler(POST_handler, { source: "cms.slugs.POST" });

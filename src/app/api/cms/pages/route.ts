import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import { ErrorSystem } from "@/features/observability";

const pageCreateSchema = z.object({
  name: z.string().trim().min(1),
  slugIds: z.array(z.string().trim().min(1)).default([]),
});

/**
 * GET /api/cms/pages
 * Fetches a list of all pages.
 */
async function GET_handler() {
  try {
    const pages = await prisma.page.findMany({
      include: {
        slugs: {
          include: {
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
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
async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, pageCreateSchema, {
      logPrefix: "cms-pages",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { name, slugIds } = parsed.data;
    const newPage = await prisma.page.create({
      data: {
        name,
        slugs: {
          create: slugIds.map((slugId) => ({
            slug: {
              connect: { id: slugId },
            },
          })),
        },
      },
    });
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

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { Prisma } from "@prisma/client";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { notFoundError } from "@/lib/errors/app-error";

type Params = { id: string };
type Ctx = { params: Promise<Params> } | { params: Params };

async function getId(ctx: Ctx): Promise<string> {
  const p = await Promise.resolve(ctx.params);
  return p.id;
}

const pageUpdateSchema = z.object({
  name: z.string().trim().min(1),
  slugIds: z.array(z.string().trim().min(1)),
  components: z.array(
    z.object({
      type: z.string().trim().min(1),
      content: z.unknown(),
    })
  ),
});

/**
 * GET /api/cms/pages/[id]
 * Fetches a single page by its ID.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const id = await getId(ctx);

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        slugs: {
          include: {
            slug: true,
          },
        },
        components: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!page) {
      throw notFoundError("Page not found");
    }

    return NextResponse.json(page);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms/pages/[id].GET",
      fallbackMessage: "Failed to fetch page",
    });
  }
}

/**
 * PUT /api/cms/pages/[id]
 * Updates a page.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const id = await getId(ctx);

    const parsed = await parseJsonBody(req, pageUpdateSchema, {
      logPrefix: "cms-pages",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { name, slugIds, components } = parsed.data;

    const updatedPage = await prisma.page.update({
      where: { id },
      data: {
        name,
        slugs: {
          deleteMany: {},
          create: slugIds.map((slugId) => ({
            slug: {
              connect: { id: slugId },
            },
          })),
        },
        components: {
          deleteMany: {},
          create: components.map((component, index) => ({
            type: component.type,
            content: component.content as Prisma.InputJsonValue,
            order: index,
          })),
        },
      },
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms/pages/[id].PUT",
      fallbackMessage: "Failed to update page",
    });
  }
}

/**
 * DELETE /api/cms/pages/[id]
 * Deletes a page.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const id = await getId(ctx);

    await prisma.page.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms/pages/[id].DELETE",
      fallbackMessage: "Failed to delete page",
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { Prisma } from "@prisma/client";

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
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}

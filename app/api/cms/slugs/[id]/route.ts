import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";

type Params = { id: string };
type Ctx = { params: Promise<Params> } | { params: Params };

async function getId(ctx: Ctx): Promise<string> {
  const p = await Promise.resolve(ctx.params);
  return p.id;
}

const slugUpdateSchema = z.object({
  slug: z.string().trim().min(1),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/cms/slugs/[id]
 * Fetches a single slug by its ID.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const id = await getId(ctx);

    const slug = await prisma.slug.findUnique({
      where: { id },
    });

    if (!slug) {
      return NextResponse.json({ error: "Slug not found" }, { status: 404 });
    }

    return NextResponse.json(slug);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch slug" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cms/slugs/[id]
 * Deletes a slug.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const id = await getId(ctx);

    await prisma.slug.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete slug" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cms/slugs/[id]
 * Updates a slug.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const id = await getId(ctx);

    const parsed = await parseJsonBody(req, slugUpdateSchema, {
      logPrefix: "cms-slugs",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { slug, isDefault } = parsed.data;

    if (isDefault) {
      await prisma.slug.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const updatedSlug = await prisma.slug.update({
      where: { id },
      data: { slug, isDefault },
    });

    return NextResponse.json(updatedSlug);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update slug" },
      { status: 500 }
    );
  }
}

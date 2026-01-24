import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { notFoundError } from "@/lib/errors/app-error";

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
      throw notFoundError("Slug not found");
    }

    return NextResponse.json(slug);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms/slugs/[id].GET",
      fallbackMessage: "Failed to fetch slug",
    });
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
    return createErrorResponse(error, {
      request: req,
      source: "cms/slugs/[id].DELETE",
      fallbackMessage: "Failed to delete slug",
    });
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
      data: {
        slug,
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json(updatedSlug);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms/slugs/[id].PUT",
      fallbackMessage: "Failed to update slug",
    });
  }
}

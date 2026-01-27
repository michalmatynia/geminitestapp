import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

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
async function GET_handler(req: NextRequest, ctx: Ctx) {
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
      source: "cms.slugs.[id].GET",
      fallbackMessage: "Failed to fetch slug",
    });
  }
}

/**
 * DELETE /api/cms/slugs/[id]
 * Deletes a slug.
 */
async function DELETE_handler(req: NextRequest, ctx: Ctx) {
  try {
    const id = await getId(ctx);

    await prisma.slug.delete({
      where: { id },
    });

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
async function PUT_handler(req: NextRequest, ctx: Ctx) {
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
      source: "cms.slugs.[id].PUT",
      fallbackMessage: "Failed to update slug",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "cms.slugs.[id].GET" });
export const DELETE = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "cms.slugs.[id].DELETE" });
export const PUT = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => PUT_handler(req, { params: Promise.resolve(params) }), { source: "cms.slugs.[id].PUT" });

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { Prisma } from "@prisma/client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

type Params = { id: string };
type Ctx = { params: Params | Promise<Params> };

async function getParams(ctx: Ctx): Promise<Params> {
  // Works whether Next provides params as an object or a Promise.
  return await Promise.resolve(ctx.params);
}

const blockUpdateSchema = z.object({
  name: z.string().trim().min(1),
  content: z.unknown(),
});

/**
 * GET /api/cms/blocks/[id]
 * Fetches a single block by its ID.
 */
async function GET_handler(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await getParams(ctx);

    const block = await prisma.block.findUnique({
      where: { id },
    });

    if (!block) {
      throw notFoundError("Block not found");
    }

    return NextResponse.json(block);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.blocks.[id].GET",
      fallbackMessage: "Failed to fetch block",
    });
  }
}

/**
 * PUT /api/cms/blocks/[id]
 * Updates a block.
 */
async function PUT_handler(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await getParams(ctx);

    const parsed = await parseJsonBody(req, blockUpdateSchema, {
      logPrefix: "cms-blocks",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { name, content } = parsed.data;

    const updatedBlock = await prisma.block.update({
      where: { id },
      data: {
        name,
        content: content as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updatedBlock);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.blocks.[id].PUT",
      fallbackMessage: "Failed to update block",
    });
  }
}

/**
 * DELETE /api/cms/blocks/[id]
 * Deletes a block.
 */
async function DELETE_handler(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await getParams(ctx);

    await prisma.block.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.blocks.[id].DELETE",
      fallbackMessage: "Failed to delete block",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "cms.blocks.[id].GET" });
export const PUT = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => PUT_handler(req, { params: Promise.resolve(params) }), { source: "cms.blocks.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "cms.blocks.[id].DELETE" });

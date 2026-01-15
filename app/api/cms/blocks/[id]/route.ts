import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";

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
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await getParams(ctx);

    const block = await prisma.block.findUnique({
      where: { id },
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    return NextResponse.json(block);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch block" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cms/blocks/[id]
 * Updates a block.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
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
      data: { name, content },
    });

    return NextResponse.json(updatedBlock);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update block" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cms/blocks/[id]
 * Deletes a block.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await getParams(ctx);

    await prisma.block.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete block" },
      { status: 500 }
    );
  }
}

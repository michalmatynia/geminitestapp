import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = { id: string };
type Ctx = { params: Promise<Params> } | { params: Params };

async function getParams(ctx: Ctx): Promise<Params> {
  // Works whether Next provides params as an object or a Promise (your build expects Promise)
  return await Promise.resolve((ctx as any).params);
}

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

    const { name, content } = (await req.json()) as {
      name: string;
      content: any;
    };

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

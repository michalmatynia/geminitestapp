import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/cms/blocks/[id]
 * Fetches a single block by its ID.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const block = await prisma.block.findUnique({
      where: { id: params.id },
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
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, content } = (await req.json()) as { name: string; content: any };
    const updatedBlock = await prisma.block.update({
      where: { id: params.id },
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
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.block.delete({
      where: { id: params.id },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete block" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/cms/blocks
 * Fetches a list of all blocks.
 */
export async function GET() {
  try {
    const blocks = await prisma.block.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(blocks);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch blocks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cms/blocks
 * Creates a new block.
 */
export async function POST(req: Request) {
  try {
    const { name, content } = (await req.json()) as { name: string; content: any };
    const newBlock = await prisma.block.create({
      data: { name, content },
    });
    return NextResponse.json(newBlock);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create block" },
      { status: 500 }
    );
  }
}

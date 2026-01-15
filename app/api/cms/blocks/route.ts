import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { Prisma } from "@prisma/client";

const blockSchema = z.object({
  name: z.string().trim().min(1),
  content: z.unknown(),
});

/**
 * GET /api/cms/blocks
 * Fetches a list of all blocks.
 */
export async function GET() {
  try {
    console.log("--- [Debug] GET /api/cms/blocks: Fetching blocks from DB ---");
    const blocks = await prisma.block.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    console.log("--- [Debug] GET /api/cms/blocks: Blocks fetched ---", blocks);
    return NextResponse.json(blocks);
  } catch (error) {
    console.error("--- [Debug] GET /api/cms/blocks: Error fetching blocks ---", error);
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
    const parsed = await parseJsonBody(req, blockSchema, {
      logPrefix: "cms-blocks",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    console.log("Received request to create block:", parsed.data);
    const { name, content } = parsed.data;
    const newBlock = await prisma.block.create({
      data: {
        name,
        content: content as Prisma.InputJsonValue,
      },
    });
    console.log("Successfully created block:", newBlock);
    return NextResponse.json(newBlock);
  } catch (error) {
    console.error("Full error object:", error);
    return NextResponse.json(
      { error: "Failed to create block" },
      { status: 500 }
    );
  }
}

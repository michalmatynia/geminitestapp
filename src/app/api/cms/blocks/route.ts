import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import { getCmsRepository } from "@/features/cms/services/cms-repository";

const blockSchema = z.object({
  name: z.string().trim().min(1),
  content: z["unknown"](),
});

/**
 * GET /api/cms/blocks
 * Fetches a list of all blocks.
 */
async function GET_handler() {
  try {
    console.log("--- [Debug] GET /api/cms/blocks: Fetching blocks from repository ---");
    const cmsRepository = await getCmsRepository();
    const blocks = await cmsRepository.getBlocks();
    console.log("--- [Debug] GET /api/cms/blocks: Blocks fetched ---", blocks);
    return NextResponse.json(blocks);
  } catch (error) {
    console.error("--- [Debug] GET /api/cms/blocks: Error fetching blocks ---", error);
    return createErrorResponse(error, {
      source: "cms.blocks.GET",
      fallbackMessage: "Failed to fetch blocks",
    });
  }
}

/**
 * POST /api/cms/blocks
 * Creates a new block.
 */
async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, blockSchema, {
      logPrefix: "cms-blocks",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    console.log("Received request to create block:", parsed.data);
    const { name, content } = parsed.data;
    
    const cmsRepository = await getCmsRepository();
    const newBlock = await cmsRepository.createBlock({
      name,
      content,
    });
    
    console.log("Successfully created block:", newBlock);
    return NextResponse.json(newBlock);
  } catch (error) {
    console.error("Full error object:", error);
    return createErrorResponse(error, {
      source: "cms.blocks.POST",
      fallbackMessage: "Failed to create block",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "cms.blocks.GET" });
export const POST = apiHandler(POST_handler, { source: "cms.blocks.POST" });

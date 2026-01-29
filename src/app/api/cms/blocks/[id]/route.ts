import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { getCmsRepository } from "@/features/cms/services/cms-repository";

const blockUpdateSchema = z.object({
  name: z.string().trim().min(1),
  content: z["unknown"](),
});

/**
 * GET /api/cms/blocks/[id]
 * Fetches a single block by its ID.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const id = params.id;
    const cmsRepository = await getCmsRepository();
    const block = await cmsRepository.getBlockById(id);

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
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const id = params.id;

    const parsed = await parseJsonBody(req, blockUpdateSchema, {
      logPrefix: "cms-blocks",
    });
    if (!parsed.ok) {
      return parsed.response as Response;
    }
    const { name, content } = parsed.data;

    const cmsRepository = await getCmsRepository();
    const updatedBlock = await cmsRepository.updateBlock(id, {
      name,
      content,
    });

    if (!updatedBlock) {
      throw notFoundError("Block not found");
    }

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
async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const id = params.id;
    const cmsRepository = await getCmsRepository();
    
    await cmsRepository.deleteBlock(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.blocks.[id].DELETE",
      fallbackMessage: "Failed to delete block",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: "cms.blocks.[id].GET" });

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: "cms.blocks.[id].PUT" });

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "cms.blocks.[id].DELETE" });

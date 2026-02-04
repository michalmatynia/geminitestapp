export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDraft, updateDraft, deleteDraft } from "@/features/drafter/server";
import type { UpdateProductDraftInput } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const updateDraftSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  ean: z.string().optional().nullable(),
  gtin: z.string().optional().nullable(),
  asin: z.string().optional().nullable(),
  name_en: z.string().optional().nullable(),
  name_pl: z.string().optional().nullable(),
  name_de: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_pl: z.string().optional().nullable(),
  description_de: z.string().optional().nullable(),
  weight: z.number().optional().nullable(),
  sizeLength: z.number().optional().nullable(),
  sizeWidth: z.number().optional().nullable(),
  length: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  supplierLink: z.string().optional().nullable(),
  priceComment: z.string().optional().nullable(),
  stock: z.number().optional().nullable(),
  catalogIds: z.array(z.string()).optional(),
  categoryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  parameters: z
    .array(
      z.object({
        parameterId: z.string().min(1),
        value: z.string().optional().nullable(),
      })
    )
    .optional(),
  defaultPriceGroupId: z.string().optional().nullable(),
  active: z.boolean().optional(),
  icon: z.string().optional().nullable(),
  imageLinks: z.array(z.string()).optional(),
  baseProductId: z.string().optional().nullable(),
});

/**
 * GET /api/drafts/[id]
 * Get a single draft by ID
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const { id } = params;
    const draft = await getDraft(id);

    if (!draft) {
      return createErrorResponse(notFoundError("Draft not found", { id }), {
        request: req,
        source: "drafts.[id].GET",
      });
    }

    return NextResponse.json(draft);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "drafts.[id].GET",
      fallbackMessage: "Failed to get draft",
    });
  }
}

/**
 * PUT /api/drafts/[id]
 * Update a draft
 */
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const { id } = params;
    const parsed = await parseJsonBody(req, updateDraftSchema, {
      logPrefix: "drafts.byId.PUT",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const categoryId =
      (typeof data.categoryId === "string" && data.categoryId.trim()) ||
      (Array.isArray(data.categoryIds) ? data.categoryIds.find((value: string) => value.trim()) : null) ||
      null;
    const draft = await updateDraft(id, { ...data, categoryId } as UpdateProductDraftInput);

    if (!draft) {
      return createErrorResponse(notFoundError("Draft not found", { id }), {
        request: req,
        source: "drafts.[id].PUT",
      });
    }

    return NextResponse.json(draft);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "drafts.[id].PUT",
      fallbackMessage: "Failed to update draft",
    });
  }
}

/**
 * DELETE /api/drafts/[id]
 * Delete a draft
 */
async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const { id } = params;
    const success = await deleteDraft(id);

    if (!success) {
      return createErrorResponse(notFoundError("Draft not found", { id }), {
        request: req,
        source: "drafts.[id].DELETE",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "drafts.[id].DELETE",
      fallbackMessage: "Failed to delete draft",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: "drafts.[id].GET" });
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: "drafts.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "drafts.[id].DELETE" });

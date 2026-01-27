import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listDrafts, createDraft } from "@/features/admin/drafter/services/draft-repository";
import type { CreateProductDraftInput } from "@/features/products/types/drafts";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { apiHandler } from "@/shared/lib/api/api-handler";

const createDraftSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
 * GET /api/drafts
 * List all product drafts
 */
async function GET_handler(req: NextRequest) {
  try {
    const drafts = await listDrafts();
    return NextResponse.json(drafts);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "drafts.GET",
      fallbackMessage: "Failed to list drafts",
    });
  }
}

/**
 * POST /api/drafts
 * Create a new product draft
 */
async function POST_handler(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, createDraftSchema, {
      logPrefix: "drafts.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const draft = await createDraft(data as CreateProductDraftInput);
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "drafts.POST",
      fallbackMessage: "Failed to create draft",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "drafts.GET" });
export const POST = apiHandler(POST_handler, { source: "drafts.POST" });

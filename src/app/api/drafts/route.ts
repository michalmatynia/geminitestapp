export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listDrafts, createDraft } from "@/features/drafter/server";
import type { CreateProductDraftInput } from "@/features/products/server";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

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
 * GET /api/drafts
 * List all product drafts
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const drafts = await listDrafts();
  return NextResponse.json(drafts);
}

/**
 * POST /api/drafts
 * Create a new product draft
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, createDraftSchema, {
    logPrefix: "drafts.POST",
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const categoryId =
    (typeof data.categoryId === "string" && data.categoryId.trim()) ||
    (Array.isArray(data.categoryIds) ? data.categoryIds.find((id: string) => id.trim()) : null) ||
    null;
  const draft = await createDraft({
    ...data,
    categoryId,
  } as CreateProductDraftInput);
  return NextResponse.json(draft, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "drafts.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "drafts.POST" });

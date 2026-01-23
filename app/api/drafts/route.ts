import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listDrafts, createDraft } from "@/lib/services/draft-repository";
import type { CreateProductDraftInput } from "@/types/drafts";

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
export async function GET() {
  try {
    const drafts = await listDrafts();
    return NextResponse.json(drafts);
  } catch (error) {
    console.error("Failed to list drafts:", error);
    return NextResponse.json(
      { error: "Failed to list drafts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/drafts
 * Create a new product draft
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    const data = createDraftSchema.parse(body);
    const draft = await createDraft(data as CreateProductDraftInput);
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error("Failed to create draft:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create draft" },
      { status: 500 }
    );
  }
}

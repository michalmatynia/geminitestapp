import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDraft, updateDraft, deleteDraft } from "@/lib/services/draft-repository";
import type { UpdateProductDraftInput } from "@/types/drafts";

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
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
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
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const draft = await getDraft(id);

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Failed to get draft:", error);
    return NextResponse.json(
      { error: "Failed to get draft" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/drafts/[id]
 * Update a draft
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as unknown;
    const data = updateDraftSchema.parse(body);
    const draft = await updateDraft(id, data as UpdateProductDraftInput);

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Failed to update draft:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update draft" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/drafts/[id]
 * Delete a draft
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteDraft(id);

    if (!success) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete draft:", error);
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    );
  }
}

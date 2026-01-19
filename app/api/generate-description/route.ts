import { NextRequest, NextResponse } from "next/server";
import { generateProductDescription } from "@/lib/services/aiDescriptionService";
import type { ProductFormData } from "@/types";

/**
 * POST /api/generate-description
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      productData?: ProductFormData;
      imageUrls?: string[];
      visionOutputEnabled?: boolean;
      generationOutputEnabled?: boolean;
    };
    
    const productData = body.productData;
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((item): item is string => typeof item === "string")
      : [];

    if (!productData?.name_en) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const result = await generateProductDescription({
      productData,
      imageUrls,
      visionOutputEnabled: body.visionOutputEnabled,
      generationOutputEnabled: body.generationOutputEnabled
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error("Generate Description Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { generateProductDescription } from "@/features/products/server";
import type { ProductFormData } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { validationError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

/**
 * POST /api/generate-description
 */
async function POST_handler(req: NextRequest) {
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
      throw validationError("Product name is required", { field: "name_en" });
    }

    const result = await generateProductDescription({
      productData,
      imageUrls,
      visionOutputEnabled: body.visionOutputEnabled,
      generationOutputEnabled: body.generationOutputEnabled
    });

    return NextResponse.json(result);

  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "generate-description.POST",
      fallbackMessage: "Failed to generate product description",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "generate-description.POST" });

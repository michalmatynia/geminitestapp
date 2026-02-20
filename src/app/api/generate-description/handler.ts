import { NextRequest, NextResponse } from 'next/server';

import { generateProductDescription } from '@/features/products/services/aiDescriptionService';
import { productCreateSchema } from '@/features/products/validations/schemas'; // Import schema
import { validationError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

interface GenerateDescriptionBody {
  productData?: {
    name_en?: string | null;
    [key: string]: unknown;
  };
  imageUrls?: string[];
  visionOutputEnabled?: boolean;
  generationOutputEnabled?: boolean;
}

/**
 * POST /api/generate-description
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json()) as GenerateDescriptionBody;

  const rawProductData = body.productData;
  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((item: unknown): item is string => typeof item === 'string')
    : [];

  if (!rawProductData?.name_en) {
    throw validationError('Product name is required', { field: 'name_en' });
  }

  // Validate and transform rawProductData to ProductFormData
  const productData = productCreateSchema.parse(rawProductData);

  const result = await generateProductDescription({
    productData: productData,
    imageUrls,
    visionOutputEnabled: body.visionOutputEnabled,
    generationOutputEnabled: body.generationOutputEnabled
  });

  return NextResponse.json(result);
}

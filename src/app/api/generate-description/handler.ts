import { NextRequest, NextResponse } from 'next/server';

import { generateProductAiDescription } from '@/features/products/services/aiDescriptionService';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

interface GenerateDescriptionBody {
  productId?: string;
  imageUrls?: string[];
  visionInputPrompt?: string;
  visionOutputPrompt?: string;
  generationInputPrompt?: string;
  generationOutputPrompt?: string;
  visionEnabled?: boolean;
  generationEnabled?: boolean;
}

/**
 * POST /api/generate-description
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json()) as GenerateDescriptionBody;

  const productId = body.productId || 'unknown';
  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((item: unknown): item is string => typeof item === 'string')
    : [];

  const result = await generateProductAiDescription({
    productId,
    images: imageUrls,
    visionInputPrompt: body.visionInputPrompt || '',
    visionOutputPrompt: body.visionOutputPrompt,
    generationInputPrompt: body.generationInputPrompt || '',
    generationOutputPrompt: body.generationOutputPrompt,
    options: {
      visionEnabled: body.visionEnabled,
      generationEnabled: body.generationEnabled,
    },
  });

  return NextResponse.json(result);
}

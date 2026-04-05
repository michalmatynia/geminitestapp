import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { baseOrderImportPreviewPayloadSchema } from '@/shared/contracts/products/orders-import';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { loadBaseOrderImportPreview } from '@/features/products/server/product-orders-import-preview';

export { baseOrderImportPreviewPayloadSchema as previewOrdersImportSchema };

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof baseOrderImportPreviewPayloadSchema>;
  const response = await loadBaseOrderImportPreview(data);

  return NextResponse.json(response);
}

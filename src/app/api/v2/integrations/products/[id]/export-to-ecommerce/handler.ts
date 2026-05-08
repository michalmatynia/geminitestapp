import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { exportProductToEcommerce } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
});

const parseProductId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.id;
};

export async function postExportToEcommerceHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = parseProductId(params);
  const response = await exportProductToEcommerce(productId);
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

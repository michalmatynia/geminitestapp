import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteSimpleParameter,
  updateSimpleParameter,
} from '@/features/products/services/simple-parameter-service';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const productSimpleParameterUpdateSchema = z.object({
  name_en: z.string().trim().min(1).optional(),
  name_pl: z.string().trim().optional().nullable(),
  name_de: z.string().trim().optional().nullable(),
  catalogId: z.string().trim().min(1).optional(),
});

/**
 * PUT /api/products/simple-parameters/[id]
 * Updates a simple product parameter.
 */
export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const data = ctx.body as z.infer<typeof productSimpleParameterUpdateSchema>;
  const updated = await updateSimpleParameter(id, {
    ...(data.name_en !== undefined ? { name_en: data.name_en } : {}),
    ...(data.name_pl !== undefined ? { name_pl: data.name_pl } : {}),
    ...(data.name_de !== undefined ? { name_de: data.name_de } : {}),
    ...(data.catalogId !== undefined ? { catalogId: data.catalogId } : {}),
  });
  return NextResponse.json(updated);
}

/**
 * DELETE /api/products/simple-parameters/[id]
 * Deletes a simple product parameter.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  await deleteSimpleParameter(params.id);
  return NextResponse.json({ success: true });
}

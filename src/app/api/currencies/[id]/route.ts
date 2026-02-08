export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrencyRepository } from '@/features/internationalization/server';
import {
  badRequestError,
  notFoundError,
  duplicateEntryError,
} from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';
import { idParamSchema } from '@/shared/validations/api-schemas';

const currencySchema = z.object({
  code: z.enum(['USD', 'EUR', 'PLN', 'GBP', 'SEK']),
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).optional(),
});

/**
 * PUT /api/currencies/[id]
 * Updates a currency.
 */
async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const data = ctx.body as z.infer<typeof currencySchema>;

  const repository = await getCurrencyRepository();
  const existing = await repository.getCurrencyById(id);
  
  if (!existing) {
    throw notFoundError('Currency not found');
  }

  if (data.code !== id) {
    const collision = await repository.getCurrencyByCode(data.code);
    if (collision) {
      throw duplicateEntryError('Currency code already exists');
    }
  }

  const updated = await repository.updateCurrency(id, {
    code: data.code,
    name: data.name,
    symbol: data.symbol,
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/currencies/[id]
 * Deletes a currency.
 */
async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const repository = await getCurrencyRepository();
  
  const inUse = await repository.isCurrencyInUse(id);
  if (inUse) {
    throw badRequestError('Currency is in use and cannot be deleted');
  }

  await repository.deleteCurrency(id);
  return new Response(null, { status: 204 });
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'currencies.[id].PUT',
  paramsSchema: idParamSchema,
  parseJsonBody: true,
  bodySchema: currencySchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'currencies.[id].DELETE',
  paramsSchema: idParamSchema,
});

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrencyRepository } from '@/features/internationalization/server';
import { conflictError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

export const runtime = 'nodejs';

const currencySchema = z.object({
  code: z.enum(['USD', 'EUR', 'PLN', 'GBP', 'SEK']),
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).optional(),
});

/**
 * GET /api/currencies
 * Fetches all currencies (and ensures defaults exist).
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getCurrencyRepository();
  await repository.ensureDefaultCurrencies();
  const currencies = await repository.listCurrencies();
  
  return NextResponse.json(currencies);
}

/**
 * POST /api/currencies
 * Creates a currency.
 */
async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof currencySchema>;

  const repository = await getCurrencyRepository();
  const existing = await repository.getCurrencyByCode(data.code);
  
  if (existing) {
    throw conflictError('Currency code already exists.', { code: data.code });
  }

  const currency = await repository.createCurrency({
    code: data.code,
    name: data.name,
    symbol: data.symbol ?? null,
  });

  return NextResponse.json(currency);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'currencies.GET' });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'currencies.POST', parseJsonBody: true, bodySchema: currencySchema });

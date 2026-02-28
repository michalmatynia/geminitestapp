import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getCurrencyRepository,
  getInternationalizationProvider,
  type InternationalizationProvider,
} from '@/shared/lib/internationalization/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { conflictError } from '@/shared/errors/app-error';

export const currencySchema = z.object({
  code: z.enum(['USD', 'EUR', 'PLN', 'GBP', 'SEK']),
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).optional(),
});

/**
 * GET /api/currencies
 * Fetches all currencies (and ensures defaults exist).
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const readCurrencies = async (provider: InternationalizationProvider): Promise<unknown[]> => {
    const repository = await getCurrencyRepository(provider);
    await repository.ensureDefaultCurrencies();
    return await repository.listCurrencies();
  };

  const primaryProvider = await getInternationalizationProvider();
  const currencies = await readCurrencies(primaryProvider);

  return NextResponse.json(currencies);
}

/**
 * POST /api/currencies
 * Creates a currency.
 */
export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
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
    isActive: true,
    isDefault: false,
  });

  return NextResponse.json(currency);
}

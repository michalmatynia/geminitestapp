import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getCurrencyRepository,
  getInternationalizationProvider,
  type InternationalizationProvider,
} from '@/features/internationalization/server';
import { logSystemEvent } from '@/features/observability/server';
import { conflictError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

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
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const readCurrencies = async (
    provider: InternationalizationProvider
  ): Promise<unknown[]> => {
    const repository = await getCurrencyRepository(provider);
    await repository.ensureDefaultCurrencies();
    return await repository.listCurrencies();
  };

  const primaryProvider = await getInternationalizationProvider();
  let currencies: unknown[] = [];
  let primaryError: unknown = null;
  try {
    currencies = await readCurrencies(primaryProvider);
  } catch (error: unknown) {
    primaryError = error;
    await logSystemEvent({
      level: 'warn',
      message: '[currencies.GET] Failed to read primary provider.',
      source: 'currencies.GET',
      request: req,
      error,
      context: { primaryProvider },
    });
  }

  if (currencies.length === 0) {
    const fallbackProvider: InternationalizationProvider =
      primaryProvider === 'prisma' ? 'mongodb' : 'prisma';
    const canReadFallback =
      fallbackProvider === 'mongodb'
        ? Boolean(process.env['MONGODB_URI'])
        : Boolean(process.env['DATABASE_URL']);
    if (canReadFallback) {
      try {
        const fallbackCurrencies = await readCurrencies(fallbackProvider);
        if (fallbackCurrencies.length > 0) {
          await logSystemEvent({
            level: 'warn',
            message: '[currencies.GET] Primary provider returned empty result; using fallback provider.',
            source: 'currencies.GET',
            request: req,
            context: {
              primaryProvider,
              fallbackProvider,
              fallbackCount: fallbackCurrencies.length,
            },
          });
          return NextResponse.json(fallbackCurrencies);
        }
      } catch (error: unknown) {
        await logSystemEvent({
          level: 'warn',
          message: '[currencies.GET] Failed to read fallback provider.',
          source: 'currencies.GET',
          request: req,
          error,
          context: { primaryProvider, fallbackProvider },
        });
      }
    }
  }

  if (primaryError && currencies.length === 0) {
    throw primaryError;
  }

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

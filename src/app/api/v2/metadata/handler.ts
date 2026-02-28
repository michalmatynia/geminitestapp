import { NextRequest, NextResponse } from 'next/server';
import { 
  getCurrencyRepository,
  getInternationalizationProvider 
} from '@/features/internationalization/server';
import { type CreateCurrencyDto } from '@/shared/contracts/internationalization';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';
import { type CountryCode } from '@prisma/client';

export async function GET_intl_handler(
  _req: NextRequest, 
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const provider = await getInternationalizationProvider();

  if (type === 'currencies') {
    const repo = await getCurrencyRepository(provider);
    return NextResponse.json(await repo.listCurrencies());
  }

  if (type === 'countries') {
    const countries = await prisma.country.findMany({
      include: { currencies: true },
    });
    return NextResponse.json(countries);
  }

  if (type === 'languages') {
    const languages = await prisma.language.findMany({
      include: { countries: true },
    });
    return NextResponse.json(languages);
  }

  throw badRequestError(`Invalid internationalization type: ${type}`);
}

export async function POST_intl_handler(
  req: NextRequest, 
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const data = (await req.json()) as Record<string, unknown>;

  if (type === 'currencies') {
    const repo = await getCurrencyRepository();
    return NextResponse.json(await repo.createCurrency(data as unknown as CreateCurrencyDto));
  }

  if (type === 'countries') {
    const country = await prisma.country.create({
      data: {
        code: data['code'] as CountryCode,
        name: data['name'] as string,
        currencies: data['currencyIds'] ? {
          create: (data['currencyIds'] as string[]).map((currencyId: string) => ({ currencyId })),
        } : undefined,
      },
      include: { currencies: true },
    });
    return NextResponse.json(country);
  }

  if (type === 'languages') {
    const language = await prisma.language.create({
      data: {
        code: data['code'] as string,
        name: data['name'] as string,
        nativeName: data['nativeName'] as string,
        countries: data['countryIds'] ? {
          create: (data['countryIds'] as string[]).map((countryId: string) => ({ countryId })),
        } : undefined,
      },
      include: { countries: true },
    });
    return NextResponse.json(language);
  }

  throw badRequestError(`Invalid internationalization type: ${type}`);
}

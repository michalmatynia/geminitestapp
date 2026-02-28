import { NextRequest, NextResponse } from 'next/server';
import { 
  getCurrencyRepository,
  getInternationalizationProvider 
} from '@/features/internationalization/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';

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
  const data = await req.json();

  if (type === 'currencies') {
    const repo = await getCurrencyRepository();
    return NextResponse.json(await repo.createCurrency(data));
  }

  if (type === 'countries') {
    const country = await prisma.country.create({
      data: {
        ...data,
        currencies: data.currencyIds ? {
          connect: data.currencyIds.map((id: string) => ({ id })),
        } : undefined,
      },
      include: { currencies: true },
    });
    return NextResponse.json(country);
  }

  if (type === 'languages') {
    const language = await prisma.language.create({
      data: {
        ...data,
        countries: data.countryIds ? {
          connect: data.countryIds.map((id: string) => ({ id })),
        } : undefined,
      },
      include: { countries: true },
    });
    return NextResponse.json(language);
  }

  throw badRequestError(`Invalid internationalization type: ${type}`);
}

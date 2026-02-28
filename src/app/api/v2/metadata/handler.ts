import { NextRequest, NextResponse } from 'next/server';
import { 
  getCountries, 
  getCurrencies, 
  getLanguages 
} from '@/features/internationalization/api';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function GET_intl_handler(
  _req: NextRequest, 
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  if (type === 'countries') return NextResponse.json(await getCountries());
  if (type === 'currencies') return NextResponse.json(await getCurrencies());
  if (type === 'languages') return NextResponse.json(await getLanguages());
  throw badRequestError(`Invalid internationalization type: ${type}`);
}

export async function POST_intl_handler(
  _req: NextRequest, 
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  // Fallback to GET for now if POST is just for fetching, or implement saving logic
  if (type === 'countries') return NextResponse.json(await getCountries());
  if (type === 'currencies') return NextResponse.json(await getCurrencies());
  if (type === 'languages') return NextResponse.json(await getLanguages());
  throw badRequestError(`Invalid internationalization type: ${type}`);
}

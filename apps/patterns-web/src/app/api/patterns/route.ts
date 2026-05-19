import { NextResponse } from 'next/server';
import { getPatternProducts } from '@/lib/patternsRepository';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const catalog = await getPatternProducts();
  return NextResponse.json(catalog);
}

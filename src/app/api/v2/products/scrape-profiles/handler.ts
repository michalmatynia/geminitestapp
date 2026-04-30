import { type NextRequest, NextResponse } from 'next/server';

import { listProductScrapeProfiles } from '@/features/products/server/product-scrape-profiles';
import { productScrapeProfilesListResponseSchema } from '@/shared/contracts/products/scrape-profiles';

export async function getHandler(_req: NextRequest): Promise<Response> {
  return NextResponse.json(productScrapeProfilesListResponseSchema.parse(listProductScrapeProfiles()));
}

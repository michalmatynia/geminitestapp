import { type NextRequest, NextResponse } from 'next/server';

import { listProductScrapeProfiles } from '@/features/products/server/product-scrape-profiles';
import { productScrapeProfilesListResponseSchema } from '@/shared/contracts/products/scrape-profiles';

export function getHandler(_req: NextRequest): Promise<Response> {
  return Promise.resolve(
    NextResponse.json(productScrapeProfilesListResponseSchema.parse(listProductScrapeProfiles()))
  );
}

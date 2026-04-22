export const runtime = 'nodejs';

import { getHandler, paramsSchema } from '@/app/api/v2/products/scans/[scanId]/artifacts/[artifactName]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const GET = apiHandlerWithParams<{ scanId: string; artifactName: string }>(getHandler, {
  source: 'v2.products.scans.[scanId].artifacts.[artifactName].GET',
  paramsSchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

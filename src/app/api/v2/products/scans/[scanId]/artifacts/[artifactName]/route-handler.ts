export const runtime = 'nodejs';

import { GET_handler, paramsSchema } from '@/app/api/v2/products/scans/[scanId]/artifacts/[artifactName]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const GET = apiHandlerWithParams<{ scanId: string; artifactName: string }>(GET_handler, {
  source: 'v2.products.scans.[scanId].artifacts.[artifactName].GET',
  paramsSchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

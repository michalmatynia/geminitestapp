import {
  postHandler,
  productScanAmazonExtractCandidateRequestSchema,
} from '@/app/api/v2/products/scans/amazon/extract-candidate/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.scans.amazon.extract-candidate.POST',
  parseJsonBody: true,
  bodySchema: productScanAmazonExtractCandidateRequestSchema,
  requireAuth: true,
});

import { type NextRequest, NextResponse } from 'next/server';

import {
  productScanAmazonExtractCandidateRequestSchema,
  productScanAmazonExtractCandidateResponseSchema,
  type ProductScanAmazonExtractCandidateRequest,
} from '@/shared/contracts/product-scans';
import { getProductScanById } from '@/features/products/server/product-scans-repository';
import { queueAmazonBatchProductScans } from '@/features/products/server/product-scans-service';
import { resolveProductScanAmazonCandidateUrls } from '@/features/products/lib/product-scan-amazon-candidates';
import { AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY } from '@/shared/lib/browser-execution/amazon-runtime-constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productScanAmazonExtractCandidateRequestSchema };

type SourceScanRecord = Awaited<ReturnType<typeof getProductScanById>>;

const buildOrderedCandidateUrls = (selectedUrl: string, candidateUrls: string[]): string[] => {
  const orderedUrls = [selectedUrl, ...candidateUrls.filter((url) => url !== selectedUrl)];
  return Array.from(new Set(orderedUrls));
};

const resolveSourceScanId = (
  body: ProductScanAmazonExtractCandidateRequest
): string =>
  typeof body.scanId === 'string' ? body.scanId.trim() : '';

const loadSourceScan = async (sourceScanId: string): Promise<SourceScanRecord> => {
  if (sourceScanId.length === 0) {
    return null;
  }
  return getProductScanById(sourceScanId);
};

const resolveRawResultObject = (
  scan: SourceScanRecord
): Record<string, unknown> | null => {
  if (
    scan?.rawResult !== null &&
    scan?.rawResult !== undefined &&
    typeof scan.rawResult === 'object' &&
    Array.isArray(scan.rawResult) === false
  ) {
    return scan.rawResult as Record<string, unknown>;
  }
  return null;
};

const resolveSelectorProfile = (
  body: ProductScanAmazonExtractCandidateRequest,
  sourceScan: SourceScanRecord
): string => {
  const requestProfile =
    typeof body.selectorProfile === 'string' ? body.selectorProfile.trim() : '';
  if (requestProfile.length > 0) {
    return requestProfile;
  }

  const sourceProfile = resolveRawResultObject(sourceScan)?.['selectorProfile'];
  if (typeof sourceProfile === 'string' && sourceProfile.trim().length > 0) {
    return sourceProfile.trim();
  }

  return 'amazon';
};

const resolveMatchedImageId = (
  body: ProductScanAmazonExtractCandidateRequest
): string | null => {
  if (typeof body.candidateId === 'string' && body.candidateId.trim().length > 0) {
    return body.candidateId.trim();
  }
  return null;
};

const resolveCandidateRank = (
  body: ProductScanAmazonExtractCandidateRequest
): number | null => {
  if (typeof body.candidateRank === 'number' && Number.isFinite(body.candidateRank)) {
    return Math.trunc(body.candidateRank);
  }
  return null;
};

const buildQueueRequestInput = (
  body: ProductScanAmazonExtractCandidateRequest,
  sourceScan: SourceScanRecord
): Record<string, unknown> => {
  const selectedCandidateUrl = body.candidateUrl.trim();
  return {
    runtimeKey: AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
    selectorProfile: resolveSelectorProfile(body, sourceScan),
    triageOnlyOnAmazonCandidates: false,
    collectAmazonCandidatePreviews: false,
    probeOnlyOnAmazonMatch: false,
    skipAmazonProbe: false,
    directAmazonCandidateUrl: selectedCandidateUrl,
    directAmazonCandidateUrls: buildOrderedCandidateUrls(
      selectedCandidateUrl,
      resolveProductScanAmazonCandidateUrls(sourceScan)
    ),
    directMatchedImageId: resolveMatchedImageId(body),
    directAmazonCandidateRank: resolveCandidateRank(body),
  };
};

const postHandler = async (
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> => {
  const body = ctx.body as ProductScanAmazonExtractCandidateRequest;
  const sourceScanId = resolveSourceScanId(body);
  const sourceScan = await loadSourceScan(sourceScanId);

  if (sourceScanId.length > 0 && sourceScan === null) {
    return NextResponse.json({ error: 'Source Amazon scan not found.' }, { status: 404 });
  }

  const result = await queueAmazonBatchProductScans({
    productIds: [body.productId],
    ownerUserId: ctx.userId ?? null,
    requestInput: buildQueueRequestInput(body, sourceScan),
  });

  const firstResult = result.results[0] ?? null;
  if (firstResult === null) {
    return NextResponse.json(
      { error: 'Amazon candidate extraction was not queued.' },
      { status: 500 }
    );
  }

  return NextResponse.json(productScanAmazonExtractCandidateResponseSchema.parse(firstResult));
};

export { postHandler as POST_handler };

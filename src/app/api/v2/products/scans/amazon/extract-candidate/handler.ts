import { type NextRequest, NextResponse } from 'next/server';

import {
  productScanAmazonExtractCandidateRequestSchema,
  productScanAmazonExtractCandidateResponseSchema,
  type ProductScanAmazonExtractCandidateRequest,
} from '@/shared/contracts/product-scans';
import { getProductScanById } from '@/features/products/server/product-scans-repository';
import { queueAmazonBatchProductScans } from '@/features/products/server/product-scans-service';
import {
  isProductScanAmazonCandidateSelectionReady,
  resolveProductScanAmazonCandidatePreviews,
  resolveProductScanAmazonCandidateUrls,
  type ProductScanAmazonCandidatePreview,
} from '@/features/products/lib/product-scan-amazon-candidates';
import { AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY } from '@/shared/lib/browser-execution/amazon-runtime-constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productScanAmazonExtractCandidateRequestSchema };

type SourceScanRecord = Awaited<ReturnType<typeof getProductScanById>>;
type SourceCandidateSelection = {
  orderedUrls: string[];
  preview: ProductScanAmazonCandidatePreview | null;
};

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

const resolveSourceCandidateSelection = (
  body: ProductScanAmazonExtractCandidateRequest,
  sourceScan: SourceScanRecord
): SourceCandidateSelection | null => {
  if (sourceScan === null) {
    return null;
  }

  const selectedCandidateUrl = body.candidateUrl.trim();
  const sourceCandidateUrls = resolveProductScanAmazonCandidateUrls(sourceScan);
  if (sourceCandidateUrls.includes(selectedCandidateUrl) === false) {
    return null;
  }
  const orderedUrls = buildOrderedCandidateUrls(selectedCandidateUrl, sourceCandidateUrls);

  const preview =
    resolveProductScanAmazonCandidatePreviews(sourceScan).find(
      (candidate) => candidate.url === selectedCandidateUrl
    ) ?? null;

  return {
    orderedUrls,
    preview,
  };
};

const validateSourceScan = (
  body: ProductScanAmazonExtractCandidateRequest,
  sourceScanId: string,
  sourceScan: SourceScanRecord
): Response | null => {
  if (sourceScanId.length === 0) {
    return null;
  }
  if (sourceScan === null) {
    return NextResponse.json({ error: 'Source Amazon scan not found.' }, { status: 404 });
  }
  if (sourceScan.productId !== body.productId) {
    return NextResponse.json(
      { error: 'Source Amazon scan does not belong to this product.' },
      { status: 409 }
    );
  }
  if (sourceScan.provider !== 'amazon') {
    return NextResponse.json(
      { error: 'Source scan must be an Amazon scan.' },
      { status: 409 }
    );
  }
  if (isProductScanAmazonCandidateSelectionReady(sourceScan) === false) {
    return NextResponse.json(
      { error: 'Source Amazon scan is not awaiting candidate selection.' },
      { status: 409 }
    );
  }
  if (resolveSourceCandidateSelection(body, sourceScan) === null) {
    return NextResponse.json(
      { error: 'Selected Amazon candidate was not found on the source scan.' },
      { status: 409 }
    );
  }
  return null;
};

const buildQueueRequestInput = (
  body: ProductScanAmazonExtractCandidateRequest,
  sourceScan: SourceScanRecord
): Record<string, unknown> => {
  const selectedCandidateUrl = body.candidateUrl.trim();
  const sourceSelection = resolveSourceCandidateSelection(body, sourceScan);
  return {
    runtimeKey: AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
    selectorProfile: resolveSelectorProfile(body, sourceScan),
    triageOnlyOnAmazonCandidates: false,
    collectAmazonCandidatePreviews: false,
    probeOnlyOnAmazonMatch: false,
    skipAmazonProbe: false,
    directAmazonCandidateUrl: selectedCandidateUrl,
    directAmazonCandidateUrls:
      sourceSelection?.orderedUrls ??
      buildOrderedCandidateUrls(selectedCandidateUrl, resolveProductScanAmazonCandidateUrls(sourceScan)),
    directMatchedImageId:
      sourceSelection?.preview?.matchedImageId ?? resolveMatchedImageId(body),
    directAmazonCandidateRank:
      sourceSelection?.preview?.rank ?? resolveCandidateRank(body),
  };
};

const postHandler = async (
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> => {
  const body = ctx.body as ProductScanAmazonExtractCandidateRequest;
  const sourceScanId = resolveSourceScanId(body);
  const sourceScan = await loadSourceScan(sourceScanId);
  const validationError = validateSourceScan(body, sourceScanId, sourceScan);
  if (validationError) {
    return validationError;
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

export { postHandler as postHandler };

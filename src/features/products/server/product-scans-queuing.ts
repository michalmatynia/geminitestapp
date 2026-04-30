import 'server-only';

import type { ProductScanBatchResponse } from '@/shared/contracts/product-scans';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
} from '@/shared/lib/browser-execution';

import {
  hasDirectAmazonCandidateRequestInput,
} from './product-scans-queuing.amazon';
import { queueBatchProductScans } from './product-scans-queuing.batch';
import {
  AMAZON_QUEUE_CONFIG,
  AMAZON_RUNTIME_KEY_DEFAULTED_FLAG,
  SUPPLIER_1688_QUEUE_CONFIG,
} from './product-scans-queuing.shared';

type ProductScanStepSequenceInput = {
  stepSequence?: unknown[] | null;
  stepSequenceKey?: string | null;
};

type QueueAmazonBatchProductScansInput = ProductScanStepSequenceInput & {
  productIds: string[];
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
  userId?: string | null;
  recordDiagnostics?: boolean;
};

type Queue1688BatchProductScansInput = ProductScanStepSequenceInput & {
  productIds: string[];
  forceVisible?: boolean;
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
  userId?: string | null;
};

const resolveSequenceRequestInput = (
  input: ProductScanStepSequenceInput
): Record<string, unknown> => ({
  ...(input.stepSequenceKey !== null &&
  input.stepSequenceKey !== undefined &&
  input.stepSequenceKey.length > 0
    ? { stepSequenceKey: input.stepSequenceKey }
    : {}),
  ...(input.stepSequence !== null && input.stepSequence !== undefined
    ? { stepSequence: input.stepSequence }
    : {}),
});

const resolveDefaultAmazonRuntimeKey = (
  requestInput: Record<string, unknown> | undefined
): string =>
  hasDirectAmazonCandidateRequestInput(requestInput)
    ? AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY
    : AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY;

const hasExplicitRuntimeKey = (requestInput: Record<string, unknown>): boolean => {
  const runtimeKey = requestInput['runtimeKey'];
  return typeof runtimeKey === 'string' && runtimeKey.trim().length > 0;
};

const buildDefaultAmazonRequestInput = (
  input: QueueAmazonBatchProductScansInput
): Record<string, unknown> => ({
  runtimeKey: resolveDefaultAmazonRuntimeKey(input.requestInput),
  collectAmazonCandidatePreviews: true,
  [AMAZON_RUNTIME_KEY_DEFAULTED_FLAG]: true,
  ...resolveSequenceRequestInput(input),
});

const buildProvidedAmazonRequestInput = (
  input: QueueAmazonBatchProductScansInput
): Record<string, unknown> => {
  const requestInput = input.requestInput ?? {};
  const runtimeDefaults = hasExplicitRuntimeKey(requestInput)
    ? {}
    : {
        runtimeKey: resolveDefaultAmazonRuntimeKey(requestInput),
        [AMAZON_RUNTIME_KEY_DEFAULTED_FLAG]: true,
      };
  return {
    collectAmazonCandidatePreviews: true,
    ...requestInput,
    ...runtimeDefaults,
    ...(input.recordDiagnostics === true ? { recordDiagnostics: true } : {}),
  };
};

const resolveAmazonRequestInput = (
  input: QueueAmazonBatchProductScansInput
): Record<string, unknown> => {
  const requestInput =
    input.requestInput === undefined
      ? buildDefaultAmazonRequestInput(input)
      : buildProvidedAmazonRequestInput(input);
  return input.recordDiagnostics === true
    ? { ...requestInput, recordDiagnostics: true }
    : requestInput;
};

export async function queueAmazonBatchProductScans(
  input: QueueAmazonBatchProductScansInput
): Promise<ProductScanBatchResponse> {
  return queueBatchProductScans({
    productIds: input.productIds,
    config: AMAZON_QUEUE_CONFIG,
    requestInput: resolveAmazonRequestInput(input),
    ownerUserId: input.ownerUserId ?? input.userId,
  });
}

export async function queue1688BatchProductScans(
  input: Queue1688BatchProductScansInput
): Promise<ProductScanBatchResponse> {
  return queueBatchProductScans({
    productIds: input.productIds,
    config: SUPPLIER_1688_QUEUE_CONFIG,
    forceVisible: input.forceVisible,
    requestInput: input.requestInput ?? resolveSequenceRequestInput(input),
    ownerUserId: input.ownerUserId ?? input.userId,
  });
}

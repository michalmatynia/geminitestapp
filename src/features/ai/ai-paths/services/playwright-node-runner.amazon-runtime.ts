import type { Page } from 'playwright';

import { withAmazonScanActionRunSteps } from '@/features/playwright/scan-steps';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';
import {
  AmazonScanSequencer,
  type AmazonScanInput,
} from '@/shared/lib/browser-execution/sequencers/AmazonScanSequencer';
import type {
  ProductScanArtifacts,
  ProductScanHelpers,
} from '@/shared/lib/browser-execution/sequencers/ProductScanSequencer';

export {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
};

type ExecuteAmazonReverseImageScanRuntimeInput = {
  page: Page;
  runtimeKey: string;
  input: Record<string, unknown>;
  emit: (port: string, value: unknown) => void;
  log: (...args: unknown[]) => void;
  artifacts: ProductScanArtifacts;
  helpers: ProductScanHelpers;
};

export async function executeAmazonReverseImageScanRuntime(
  input: ExecuteAmazonReverseImageScanRuntimeInput
): Promise<unknown> {
  let resultPayload: unknown = null;

  const sequencer = new AmazonScanSequencer(
    {
      page: input.page,
      emit: (type, payload) => {
        if (type === 'result') {
          resultPayload = payload;
        }
        input.emit(type, payload);
      },
      log: (message, context) => input.log(message, context),
      artifacts: input.artifacts,
      helpers: input.helpers,
    },
    {
      ...(input.input as AmazonScanInput),
      runtimeKey: input.runtimeKey,
    }
  );

  await sequencer.scan();

  return resultPayload !== null
    ? withAmazonScanActionRunSteps(resultPayload)
    : {
        status: 'completed',
        message: 'Amazon scan completed without an explicit result payload.',
      };
}

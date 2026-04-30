import type { Page } from 'playwright';

import { withSupplier1688ScanActionRunSteps } from '@/features/playwright/scan-steps';
import {
  Supplier1688ScanSequencer,
  type Supplier1688ScanInput,
} from '@/shared/lib/browser-execution/sequencers/Supplier1688ScanSequencer';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY } from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';
import type {
  ProductScanArtifacts,
  ProductScanHelpers,
} from '@/shared/lib/browser-execution/sequencers/ProductScanSequencer';

export { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY };

type ExecuteSupplier1688ProbeScanRuntimeInput = {
  page: Page;
  input: Record<string, unknown>;
  emit: (port: string, value: unknown) => void;
  log: (...args: unknown[]) => void;
  artifacts: ProductScanArtifacts;
  helpers: ProductScanHelpers;
};

export async function executeSupplier1688ProbeScanRuntime(
  input: ExecuteSupplier1688ProbeScanRuntimeInput
): Promise<unknown> {
  let resultPayload: unknown = null;

  const sequencer = new Supplier1688ScanSequencer(
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
    input.input as Supplier1688ScanInput
  );

  await sequencer.scan();

  return resultPayload !== null
    ? withSupplier1688ScanActionRunSteps(resultPayload)
    : {
        status: 'completed',
        message: '1688 supplier probe scan completed without an explicit result payload.',
      };
}

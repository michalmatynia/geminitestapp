import 'server-only';

import type { AiPathRunRecord, RuntimePortValues } from '@/shared/contracts/ai-paths';

import { persistMarketplaceCopyDebrandBatchRunResult } from './marketplace-copy-debrand-run-completion';

export type PersistCompletedProductAiPathRunSideEffectsInput = {
  run: AiPathRunRecord;
  runMeta: Record<string, unknown>;
  runtimeState: unknown;
  accOutputs: Record<string, RuntimePortValues>;
};

export const persistCompletedProductAiPathRunSideEffects = async (
  input: PersistCompletedProductAiPathRunSideEffectsInput
): Promise<void> => {
  await persistMarketplaceCopyDebrandBatchRunResult(input);
};

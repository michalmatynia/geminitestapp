import 'server-only';

import {
  enqueuePlaywrightNodeRun,
  readPlaywrightNodeArtifact,
  readPlaywrightNodeRun,
} from '@/features/ai/ai-paths/services/playwright-node-runner';
import { validatePlaywrightNodeScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';
import type {
  PlaywrightNodeArtifactReadResult,
  PlaywrightNodeRunArtifact,
  PlaywrightNodeRunInstance,
  PlaywrightNodeRunInstanceKind,
  PlaywrightNodeRunRecord,
  PlaywrightNodeRunRequest,
} from '@/features/ai/ai-paths/services/playwright-node-runner.types';

export type PlaywrightEngineRunRequest = PlaywrightNodeRunRequest;
export type PlaywrightEngineRunArtifact = PlaywrightNodeRunArtifact;
export type PlaywrightEngineRunRecord = PlaywrightNodeRunRecord;
export type PlaywrightEngineArtifactReadResult = PlaywrightNodeArtifactReadResult;
export type PlaywrightEngineRunInstanceKind = PlaywrightNodeRunInstanceKind;
export type PlaywrightEngineRunInstance = PlaywrightNodeRunInstance;

export type EnqueuePlaywrightEngineRunInput = {
  request: PlaywrightEngineRunRequest;
  waitForResult: boolean;
  ownerUserId?: string | null;
  instance?: PlaywrightEngineRunInstance | null;
};

export const enqueuePlaywrightEngineRun = async (
  input: EnqueuePlaywrightEngineRunInput
): Promise<PlaywrightEngineRunRecord> =>
  enqueuePlaywrightNodeRun({
    request: input.request,
    waitForResult: input.waitForResult,
    ownerUserId: input.ownerUserId,
    instance: input.instance,
  });

export const readPlaywrightEngineRun = readPlaywrightNodeRun;
export const readPlaywrightEngineArtifact = readPlaywrightNodeArtifact;
export const validatePlaywrightEngineScript = validatePlaywrightNodeScript;

// Backward-compatible exports for legacy consumers that still use node-runner names.
export {
  enqueuePlaywrightNodeRun,
  readPlaywrightNodeArtifact,
  readPlaywrightNodeRun,
  validatePlaywrightNodeScript,
};

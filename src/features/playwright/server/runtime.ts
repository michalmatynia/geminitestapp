import 'server-only';

import {
  enqueuePlaywrightNodeRun,
  readPlaywrightNodeArtifact,
  readPlaywrightNodeRun,
} from '@/features/ai/server';
import { validatePlaywrightNodeScript } from '@/features/ai/server';
import type {
  PlaywrightNodeArtifactReadResult,
  PlaywrightNodeRunArtifact,
  PlaywrightNodeRunInstanceFamily,
  PlaywrightNodeRunInstance,
  PlaywrightNodeRunInstanceKind,
  PlaywrightNodeRunRecord,
  PlaywrightNodeRunRequest,
} from '@/features/ai/server';

export type PlaywrightEngineRunRequest = PlaywrightNodeRunRequest;
export type PlaywrightEngineRunArtifact = PlaywrightNodeRunArtifact;
export type PlaywrightEngineRunRecord = PlaywrightNodeRunRecord;
export type PlaywrightEngineArtifactReadResult = PlaywrightNodeArtifactReadResult;
export type PlaywrightEngineRunInstanceKind = PlaywrightNodeRunInstanceKind;
export type PlaywrightEngineRunInstanceFamily = PlaywrightNodeRunInstanceFamily;
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

export const runPlaywrightEngineTask = async (input: {
  request: PlaywrightEngineRunRequest;
  ownerUserId?: string | null;
  instance?: PlaywrightEngineRunInstance | null;
}): Promise<PlaywrightEngineRunRecord> =>
  enqueuePlaywrightEngineRun({
    request: input.request,
    waitForResult: true,
    ownerUserId: input.ownerUserId,
    instance: input.instance,
  });

export const startPlaywrightEngineTask = async (input: {
  request: PlaywrightEngineRunRequest;
  ownerUserId?: string | null;
  instance?: PlaywrightEngineRunInstance | null;
}): Promise<PlaywrightEngineRunRecord> =>
  enqueuePlaywrightEngineRun({
    request: input.request,
    waitForResult: false,
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

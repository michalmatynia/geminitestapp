/**
 * runtime.ts — Playwright engine runtime facade
 *
 * Server-side entry point for executing Playwright automation scripts. This
 * module wraps the AI-paths Playwright node runner and provides a simplified
 * API for enqueueing and reading automation runs.
 *
 * Key responsibilities:
 *  - Enqueue Playwright script execution requests (sync or async).
 *  - Read run records and artifacts from the database.
 *  - Validate script syntax before execution.
 *  - Type re-exports for consistent naming across the codebase.
 *
 * The runtime supports multiple instance families (product scans, listing
 * scrapes, connection tests) and can wait for results or return immediately
 * with a run ID for polling.
 */
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
  PlaywrightNodeRunInstanceFamily,
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

export const readPlaywrightEngineRun = async (
  runId: string
): Promise<PlaywrightEngineRunRecord | null> => await readPlaywrightNodeRun(runId);

export const readPlaywrightEngineArtifact = async (input: {
  runId: string;
  fileName: string;
}): Promise<PlaywrightEngineArtifactReadResult | null> => await readPlaywrightNodeArtifact(input);

export const validatePlaywrightEngineScript = (
  script: string
): ReturnType<typeof validatePlaywrightNodeScript> => validatePlaywrightNodeScript(script);

// Backward-compatible exports for legacy consumers that still use node-runner names.
export {
  enqueuePlaywrightNodeRun,
  readPlaywrightNodeArtifact,
  readPlaywrightNodeRun,
  validatePlaywrightNodeScript,
};

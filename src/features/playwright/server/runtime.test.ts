import { beforeEach, describe, expect, it, vi } from 'vitest';

const { enqueuePlaywrightNodeRunMock } = vi.hoisted(() => ({
  enqueuePlaywrightNodeRunMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/playwright-node-runner', () => ({
  enqueuePlaywrightNodeRun: (...args: unknown[]) => enqueuePlaywrightNodeRunMock(...args),
  readPlaywrightNodeArtifact: vi.fn(),
  readPlaywrightNodeRun: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/playwright-node-runner.parser', () => ({
  validatePlaywrightNodeScript: vi.fn(),
}));

import {
  enqueuePlaywrightEngineRun,
  runPlaywrightEngineTask,
  startPlaywrightEngineTask,
} from './runtime';

describe('playwright server runtime helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-123',
      status: 'queued',
    });
  });

  it('runs synchronous engine tasks with waitForResult enabled', async () => {
    await runPlaywrightEngineTask({
      request: { script: 'export default async function run() {}' },
      ownerUserId: 'user-1',
      instance: { kind: 'programmable_listing' },
    } as never);

    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: { script: 'export default async function run() {}' },
      waitForResult: true,
      ownerUserId: 'user-1',
      instance: { kind: 'programmable_listing' },
    });
  });

  it('starts background engine tasks with waitForResult disabled', async () => {
    await startPlaywrightEngineTask({
      request: { script: 'export default async function run() {}' },
      ownerUserId: 'user-1',
      instance: { kind: 'social_capture_batch' },
    } as never);

    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: { script: 'export default async function run() {}' },
      waitForResult: false,
      ownerUserId: 'user-1',
      instance: { kind: 'social_capture_batch' },
    });
  });

  it('preserves the explicit enqueue helper for callers that control wait behavior', async () => {
    await enqueuePlaywrightEngineRun({
      request: { script: 'export default async function run() {}' },
      waitForResult: false,
      ownerUserId: null,
      instance: null,
    });

    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: { script: 'export default async function run() {}' },
      waitForResult: false,
      ownerUserId: null,
      instance: null,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  enqueuePlaywrightNodeRunMock,
  readPlaywrightNodeArtifactMock,
  readPlaywrightNodeRunMock,
  validatePlaywrightNodeScriptMock,
} = vi.hoisted(() => ({
  enqueuePlaywrightNodeRunMock: vi.fn(),
  readPlaywrightNodeArtifactMock: vi.fn(),
  readPlaywrightNodeRunMock: vi.fn(),
  validatePlaywrightNodeScriptMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/playwright-node-runner', () => ({
  enqueuePlaywrightNodeRun: (...args: unknown[]) => enqueuePlaywrightNodeRunMock(...args),
  readPlaywrightNodeArtifact: (...args: unknown[]) => readPlaywrightNodeArtifactMock(...args),
  readPlaywrightNodeRun: (...args: unknown[]) => readPlaywrightNodeRunMock(...args),
}));

vi.mock('@/features/ai/ai-paths/services/playwright-node-runner.parser', () => ({
  validatePlaywrightNodeScript: (...args: unknown[]) => validatePlaywrightNodeScriptMock(...args),
}));

import {
  enqueuePlaywrightEngineRun,
  readPlaywrightEngineArtifact,
  readPlaywrightEngineRun,
  runPlaywrightEngineTask,
  startPlaywrightEngineTask,
  validatePlaywrightEngineScript,
} from './runtime';

describe('playwright server runtime helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-123',
      status: 'queued',
    });
    readPlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-123',
      status: 'completed',
    });
    readPlaywrightNodeArtifactMock.mockResolvedValue({
      artifact: { path: 'run-123/final.png' },
      content: Buffer.from('artifact'),
    });
    validatePlaywrightNodeScriptMock.mockReturnValue([]);
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

  it('reads run records lazily through the node runner helper', async () => {
    await expect(readPlaywrightEngineRun('run-123')).resolves.toMatchObject({
      runId: 'run-123',
      status: 'completed',
    });
    expect(readPlaywrightNodeRunMock).toHaveBeenCalledWith('run-123');
  });

  it('reads artifacts lazily through the node runner helper', async () => {
    await expect(
      readPlaywrightEngineArtifact({
        runId: 'run-123',
        fileName: 'final.png',
      })
    ).resolves.toMatchObject({
      artifact: { path: 'run-123/final.png' },
    });
    expect(readPlaywrightNodeArtifactMock).toHaveBeenCalledWith({
      runId: 'run-123',
      fileName: 'final.png',
    });
  });

  it('validates scripts through the shared parser helper', () => {
    validatePlaywrightNodeScriptMock.mockReturnValueOnce(['bad script']);
    expect(validatePlaywrightEngineScript('test()')).toEqual(['bad script']);
    expect(validatePlaywrightNodeScriptMock).toHaveBeenCalledWith('test()');
  });
});

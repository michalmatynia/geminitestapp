import { describe, expect, it, vi } from 'vitest';

import { handleExecutionCompletion } from '@/features/ai/ai-paths/services/path-run-executor/execution-completion';

describe('handleExecutionCompletion', () => {
  it('prefers a failed upstream node message over a blocked downstream node message', async () => {
    const updateRunSnapshot = vi.fn().mockResolvedValue(true);
    const status = await handleExecutionCompletion({
      run: {
        id: 'run-1',
      } as never,
      nodes: [
        {
          id: 'node-model',
          type: 'model',
          title: 'Model',
        },
        {
          id: 'node-db',
          type: 'database',
          title: 'Database Query',
        },
      ] as never,
      accOutputs: {
        'node-model': {
          status: 'failed',
          error: '400 "this model does not support image input"',
        },
        'node-db': {
          status: 'blocked',
          waitingOnPorts: ['result'],
        },
      },
      runtimeHaltReason: 'blocked',
      nodeValidationEnabled: true,
      blockedRunPolicy: 'fail_run',
      requiredProcessingNodeIds: [],
      runMetaWithRuntimeContext: {},
      runStartedAt: '2026-04-09T15:29:17.699Z',
      traceId: 'trace-1',
      profileSnapshot: {
        traceId: 'trace-1',
        recordedAt: '2026-04-09T15:29:20.165Z',
        eventCount: 0,
        sampledEventCount: 0,
        droppedEventCount: 0,
        summary: null,
        highlights: [],
        nodeSpans: [],
      },
      stateManager: {
        buildCurrentRuntimeStateSnapshot: vi.fn().mockResolvedValue({
          history: [],
        }),
      } as never,
      updateRunSnapshot,
    });

    expect(status).toBe('failed');
    expect(updateRunSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errorMessage: 'Run failed at Model (400 "this model does not support image input").',
      })
    );
  });

  it('fails when callback-waiting node outputs remain after execution stops', async () => {
    const updateRunSnapshot = vi.fn().mockResolvedValue(true);

    const status = await handleExecutionCompletion({
      run: {
        id: 'run-2',
      } as never,
      nodes: [
        {
          id: 'node-prompt',
          type: 'prompt',
          title: 'Prompt: Description EN->PL',
        },
      ] as never,
      accOutputs: {
        'node-prompt': {
          status: 'waiting_callback',
          message: 'Upstream waiting diagnostics: Upstream status for bundle: JSON Parser (waiting_callback)',
          waitingOnPorts: ['bundle'],
        },
      },
      runtimeHaltReason: null,
      nodeValidationEnabled: true,
      blockedRunPolicy: 'fail_run',
      requiredProcessingNodeIds: [],
      runMetaWithRuntimeContext: {},
      runStartedAt: '2026-04-09T15:29:17.699Z',
      traceId: 'trace-2',
      profileSnapshot: {
        traceId: 'trace-2',
        recordedAt: '2026-04-09T15:29:20.165Z',
        eventCount: 0,
        sampledEventCount: 0,
        droppedEventCount: 0,
        summary: null,
        highlights: [],
        nodeSpans: [],
      },
      stateManager: {
        buildCurrentRuntimeStateSnapshot: vi.fn().mockResolvedValue({
          history: [],
        }),
      } as never,
      updateRunSnapshot,
    });

    expect(status).toBe('failed');
    expect(updateRunSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errorMessage:
          'Run failed while waiting at Prompt: Description EN->PL (waiting on: bundle). Upstream waiting diagnostics: Upstream status for bundle: JSON Parser (waiting_callback)',
      })
    );
  });
});

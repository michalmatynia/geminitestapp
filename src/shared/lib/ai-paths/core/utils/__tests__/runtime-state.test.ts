import { describe, expect, it } from 'vitest';

import { parseRuntimeState } from '@/shared/lib/ai-paths/core/utils/runtime-state';

describe('parseRuntimeState', () => {
  it('prunes non-canonical runtime strategy labels from persisted history entries', () => {
    const parsed = parseRuntimeState({
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {
        'node-1': [
          {
            timestamp: '2026-04-15T08:00:00.000Z',
            pathId: 'path-1',
            pathName: 'Path 1',
            nodeId: 'node-1',
            nodeType: 'template',
            nodeTitle: 'Template',
            status: 'completed',
            iteration: 1,
            inputs: {},
            outputs: {
              prompt: 'ok',
            },
            inputHash: null,
            runtimeStrategy: 'compatibility',
            runtimeResolutionSource: 'registry',
            runtimeCodeObjectId: null,
          },
        ],
      },
    });

    expect(parsed.history?.['node-1']?.[0]).toMatchObject({
      runtimeResolutionSource: 'registry',
      runtimeCodeObjectId: null,
    });
    expect(parsed.history?.['node-1']?.[0]?.runtimeStrategy).toBeUndefined();
  });
});

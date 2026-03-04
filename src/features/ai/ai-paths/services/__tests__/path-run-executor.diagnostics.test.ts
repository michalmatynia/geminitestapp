import { describe, expect, it } from 'vitest';

import type { AiNode, RuntimePortValues } from '@/shared/contracts/ai-paths';
import {
  buildFailedRunFailureMessage,
  collectFailedNodeDiagnostics,
} from '@/features/ai/ai-paths/services/path-run-executor.diagnostics';

describe('path-run executor failed-node diagnostics', () => {
  const nodes: AiNode[] = [
    {
      id: 'node-model',
      type: 'model',
      title: 'Model',
      description: '',
      position: { x: 0, y: 0 },
      inputs: ['prompt'],
      outputs: ['result'],
      config: {},
    },
    {
      id: 'node-viewer',
      type: 'viewer',
      title: 'Viewer',
      description: '',
      position: { x: 200, y: 0 },
      inputs: ['result'],
      outputs: [],
      config: {},
    },
  ];

  it('collects only failed nodes and prefers error over message', () => {
    const outputs: Record<string, RuntimePortValues> = {
      'node-model': {
        status: 'failed',
        error: ' provider timeout ',
        message: 'fallback',
      },
      'node-viewer': {
        status: 'completed',
      },
    };

    expect(collectFailedNodeDiagnostics(nodes, outputs)).toEqual([
      {
        nodeId: 'node-model',
        nodeType: 'model',
        nodeTitle: 'Model',
        message: 'provider timeout',
      },
    ]);
  });

  it('uses message when error is not present', () => {
    const outputs: Record<string, RuntimePortValues> = {
      'node-model': {
        status: 'failed',
        message: 'model failed',
      },
    };

    expect(collectFailedNodeDiagnostics(nodes, outputs)[0]?.message).toBe('model failed');
  });

  it('formats failed-run message with first failure and suffix', () => {
    const message = buildFailedRunFailureMessage([
      {
        nodeId: 'node-model',
        nodeType: 'model',
        nodeTitle: 'Model',
        message: 'provider timeout',
      },
      {
        nodeId: 'node-other',
        nodeType: 'audio',
        nodeTitle: 'Audio',
        message: null,
      },
    ]);
    expect(message).toBe('Run failed at Model (provider timeout) (+1 more failed node).');
  });

  it('uses generic failed-run message when no failed nodes are provided', () => {
    expect(buildFailedRunFailureMessage([])).toBe(
      'Run failed: one or more required processing nodes failed.'
    );
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { evaluateGraph } from '@/features/ai/ai-paths/lib/core/runtime/engine';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

describe('AI Paths Runtime Engine', () => {
  const mockFetchEntityByType = vi.fn();
  const mockReportAiPathsError = vi.fn();
  const mockToast = vi.fn();

  const defaultOptions = {
    activePathId: 'test-path',
    fetchEntityByType: mockFetchEntityByType,
    reportAiPathsError: mockReportAiPathsError,
    toast: mockToast,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute a simple linear graph', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Const',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: 'string', value: 'hello' } },
      },
      {
        id: 'node-2',
        type: 'mapper',
        title: 'Mapper',
        description: '',
        inputs: ['context'],
        outputs: ['out'],
        position: { x: 100, y: 0 },
        config: {
          mapper: {
            outputs: ['out'],
            mappings: { out: '$.val' },
          },
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        from: 'node-1',
        to: 'node-2',
        fromPort: 'value',
        toPort: 'context',
      },
    ];

    // Note: handleMapper expects context to be an object. 
    // We update node-1 to return an object.
    nodes[0]!.config!.constant!.value = JSON.stringify({ val: 'mapped' });
    nodes[0]!.config!.constant!.valueType = 'json';

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-1']).toEqual({ value: { val: 'mapped' } });
    expect(result.outputs['node-2']).toEqual({ out: 'mapped' });
  });

  it('should respect maxIterations and stop on circular dependencies', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'math',
        title: 'Add',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { math: { operation: 'add', operand: 1 } },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        from: 'node-1',
        to: 'node-1',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      seedOutputs: { 'node-1': { value: 1 } },
    });

    // Max iterations is nodes.length + 2 = 3. 
    // Initial: 1
    // It 1: 1+1 = 2
    // It 2: 2+1 = 3
    // It 3: 3+1 = 4
    expect(result.outputs['node-1']?.['value']).toBeLessThan(10); 
    expect(result.outputs['node-1']?.['value']).toBeDefined();
  });

  it('should skip nodes provided in skipNodeIds', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Const',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: 'string', value: 'initial' } },
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges: [],
      skipNodeIds: ['node-1'],
      seedOutputs: { 'node-1': { value: 'seeded' } }
    });

    // Should keep the seeded value and not run the handler
    expect(result.outputs['node-1']?.['value']).toBe('seeded');
  });

  it('should use cache when hashes match', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Const',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: 'string', value: 'initial' }, runtime: { cache: { mode: 'force' } } },
      },
    ];

    const onNodeStart = vi.fn();

    // First run to get hash
    const result1 = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges: [],
    });

    const hash = result1.hashes?.['node-1'];
    expect(hash).toBeDefined();

    // Second run with seed
    const result2 = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges: [],
      seedOutputs: result1.outputs,
      seedHashes: result1.hashes ?? {},
      onNodeStart,
    });

    expect(onNodeStart).not.toHaveBeenCalled();
    expect(result2.outputs['node-1']).toEqual(result1.outputs['node-1']);
  });

  it('should trigger onNodeStart and onNodeFinish callbacks', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Const',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: 'string', value: 'test' } },
      },
    ];

    const onNodeStart = vi.fn();
    const onNodeFinish = vi.fn();

    await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges: [],
      onNodeStart,
      onNodeFinish,
    });

    expect(onNodeStart).toHaveBeenCalledWith(expect.objectContaining({
      node: expect.objectContaining({ id: 'node-1' })
    }));
    expect(onNodeFinish).toHaveBeenCalledWith(expect.objectContaining({
      node: expect.objectContaining({ id: 'node-1' }),
      nextOutputs: { value: 'test' }
    }));
  });

  it('waits only for required ports when input contracts are defined', async () => {
    const nodes: AiNode[] = [
      {
        id: 'required-source',
        type: 'constant',
        title: 'Required Source',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: 'string', value: 'required' } },
      },
      {
        id: 'optional-source',
        type: 'constant',
        title: 'Optional Source',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 80, y: 0 },
        config: { constant: { valueType: 'string', value: 'optional' } },
      },
      {
        id: 'bundle-node',
        type: 'bundle',
        title: 'Bundle',
        description: '',
        inputs: ['value', 'context'],
        outputs: ['bundle'],
        position: { x: 160, y: 0 },
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              value: { required: true },
              context: { required: false },
            },
          },
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'edge-required',
        from: 'required-source',
        to: 'bundle-node',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-optional',
        from: 'optional-source',
        to: 'bundle-node',
        fromPort: 'value',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      skipNodeIds: ['optional-source'],
    });

    expect(result.outputs['bundle-node']).toEqual({
      bundle: {
        value: 'required',
      },
    });
  });

  it('falls back to all-connected waiting when no required contracts are defined', async () => {
    const nodes: AiNode[] = [
      {
        id: 'required-source',
        type: 'constant',
        title: 'Required Source',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: 'string', value: 'required' } },
      },
      {
        id: 'optional-source',
        type: 'constant',
        title: 'Optional Source',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 80, y: 0 },
        config: { constant: { valueType: 'string', value: 'optional' } },
      },
      {
        id: 'bundle-node',
        type: 'bundle',
        title: 'Bundle',
        description: '',
        inputs: ['value', 'context'],
        outputs: ['bundle'],
        position: { x: 160, y: 0 },
        config: {
          runtime: {
            waitForInputs: true,
          },
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'edge-required',
        from: 'required-source',
        to: 'bundle-node',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-optional',
        from: 'optional-source',
        to: 'bundle-node',
        fromPort: 'value',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      skipNodeIds: ['optional-source'],
    });

    expect(result.outputs['bundle-node']).toBeUndefined();
  });

  it('emits waiting diagnostics for missing required inputs', async () => {
    const profileEvents: Array<Record<string, unknown>> = [];
    const nodes: AiNode[] = [
      {
        id: 'required-source',
        type: 'constant',
        title: 'Required Source',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: 'string', value: 'required' } },
      },
      {
        id: 'bundle-node',
        type: 'bundle',
        title: 'Bundle',
        description: '',
        inputs: ['value', 'context'],
        outputs: ['bundle'],
        position: { x: 160, y: 0 },
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              value: { required: true },
              context: { required: true },
            },
          },
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'edge-required',
        from: 'required-source',
        to: 'bundle-node',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      recordHistory: true,
      profile: {
        onEvent: (event): void => {
          profileEvents.push(event as unknown as Record<string, unknown>);
        },
      },
    });

    const skippedEvent = profileEvents.find(
      (event): boolean =>
        event['type'] === 'node' &&
        event['nodeId'] === 'bundle-node' &&
        event['status'] === 'skipped' &&
        event['reason'] === 'missing_inputs'
    );
    expect(skippedEvent).toBeDefined();
    expect((skippedEvent?.['requiredPorts'] as string[] | undefined) ?? []).toContain('context');
    expect((skippedEvent?.['waitingOnPorts'] as string[] | undefined) ?? []).toContain('context');

    const historyEntries = result.history?.['bundle-node'];
    const skipHistory = Array.isArray(historyEntries)
      ? historyEntries.find((entry) => entry['skipReason'] === 'missing_inputs')
      : null;
    expect(skipHistory).toBeDefined();
    expect((skipHistory?.['requiredPorts'] as string[] | undefined) ?? []).toContain('context');
    expect((skipHistory?.['waitingOnPorts'] as string[] | undefined) ?? []).toContain('context');
  });

  it('supports per-activation side-effect policy for notification nodes', async () => {
    const nodes: AiNode[] = [
      {
        id: 'math-node',
        type: 'math',
        title: 'Math',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { math: { operation: 'add', operand: 1 } },
      },
      {
        id: 'notify-node',
        type: 'notification',
        title: 'Notify',
        description: '',
        inputs: ['value'],
        outputs: [],
        position: { x: 140, y: 0 },
        config: {
          runtime: {
            sideEffectPolicy: 'per_activation',
          },
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'edge-loop',
        from: 'math-node',
        to: 'math-node',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-notify',
        from: 'math-node',
        to: 'notify-node',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      seedOutputs: { 'math-node': { value: 0 } },
      recordHistory: true,
    });

    expect(mockToast.mock.calls.length).toBeGreaterThan(1);
    const notifyHistory = result.history?.['notify-node'] ?? [];
    const executedEntries = notifyHistory.filter(
      (entry) => entry['sideEffectDecision'] === 'executed'
    );
    expect(executedEntries.length).toBeGreaterThan(1);
  });

  it('keeps per-run side-effect policy for notification nodes', async () => {
    const nodes: AiNode[] = [
      {
        id: 'math-node',
        type: 'math',
        title: 'Math',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: { math: { operation: 'add', operand: 1 } },
      },
      {
        id: 'notify-node',
        type: 'notification',
        title: 'Notify',
        description: '',
        inputs: ['value'],
        outputs: [],
        position: { x: 140, y: 0 },
        config: {
          runtime: {
            sideEffectPolicy: 'per_run',
          },
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'edge-loop',
        from: 'math-node',
        to: 'math-node',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-notify',
        from: 'math-node',
        to: 'notify-node',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      seedOutputs: { 'math-node': { value: 0 } },
      recordHistory: true,
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    const notifyHistory = result.history?.['notify-node'] ?? [];
    const skippedEntries = notifyHistory.filter(
      (entry) => entry['sideEffectDecision'] === 'skipped_policy'
    );
    expect(skippedEntries.length).toBeGreaterThan(0);
  });
});

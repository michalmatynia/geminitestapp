import { describe, it, expect, vi } from 'vitest';

import { evaluateGraph } from '@/shared/lib/ai-paths/core/runtime/engine';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

describe('evaluateGraph', () => {
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

  it('should evaluate a simple constant node', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Constant',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: 'string',
            value: 'hello',
          },
        },
      },
    ];
    const edges: Edge[] = [];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-1']).toEqual({ value: 'hello' });
  });

  it('should evaluate constant + math nodes', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Constant',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: 'number',
            value: '10',
          },
        },
      },
      {
        id: 'node-2',
        type: 'math',
        title: 'Math',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 200, y: 0 },
        config: {
          math: {
            operation: 'add',
            operand: 5,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-1',
        to: 'node-2',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-1']).toEqual({ value: 10 });
    expect(result.outputs['node-2']).toEqual({ value: 15 });
  });

  it('should handle branching logic with router', async () => {
    const nodes: AiNode[] = [
      {
        id: 'node-1',
        type: 'constant',
        title: 'Value',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: { valueType: 'number', value: '100' },
        },
      },
      {
        id: 'node-router',
        type: 'router',
        title: 'Router',
        description: '',
        inputs: ['value'],
        outputs: ['valid', 'errors', 'value'],
        position: { x: 200, y: 0 },
        config: {
          router: {
            mode: 'value',
            matchMode: 'equals',
            compareTo: '100',
          },
        },
      },
      {
        id: 'node-success',
        type: 'template',
        title: 'Success',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 400, y: -100 },
        config: {
          template: { template: 'Success: {{value}}' },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'e1',
        from: 'node-1',
        to: 'node-router',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'e2',
        from: 'node-router',
        to: 'node-success',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-router']).toMatchObject({ valid: true });
    expect(result.outputs['node-success']).toEqual({ prompt: 'Success: 100' });
  });

  it('should evaluate a parser node with JSON input', async () => {
    const nodes: AiNode[] = [
      {
        id: 'seed-node',
        type: 'constant',
        title: 'Seed',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: -200, y: 0 },
        config: {
          constant: {
            valueType: 'json',
            value: JSON.stringify({
              name: 'Test Product',
              details: { price: 99.99 },
            }),
          },
        },
      },
      {
        id: 'node-parser',
        type: 'parser',
        title: 'Parser',
        description: '',
        inputs: ['entityJson'],
        outputs: ['title', 'price'],
        position: { x: 0, y: 0 },
        config: {
          parser: {
            mappings: {
              title: '$.name',
              price: '$.details.price',
            },
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'e-seed',
        from: 'seed-node',
        to: 'node-parser',
        fromPort: 'value',
        toPort: 'entityJson',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-parser']).toEqual({
      title: 'Test Product',
      price: 99.99,
    });
  });

  it('should handle context node resolution', async () => {
    const mockProduct = { id: 'p1', title: 'Original Title' };
    mockFetchEntityByType.mockResolvedValue(mockProduct);

    const nodes: AiNode[] = [
      {
        id: 'node-context',
        type: 'context',
        title: 'Context',
        description: '',
        inputs: [],
        outputs: ['context', 'entityId', 'entityType', 'entityJson'],
        position: { x: 0, y: 0 },
        config: {
          context: {
            role: 'product',
            entityType: 'product',
            entityIdSource: 'manual',
            entityId: 'p1',
          },
        },
      },
    ];
    const edges: Edge[] = [];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['node-context']).toMatchObject({
      entityId: 'p1',
      entityType: 'product',
      entityJson: mockProduct,
    });
    expect(mockFetchEntityByType).toHaveBeenCalledWith('product', 'p1');
  });

  it('resolves simulation context before trigger when trigger requires simulation context', async () => {
    const mockProduct = { id: 'product-2', title: 'Desk Lamp' };
    mockFetchEntityByType.mockResolvedValue(mockProduct);

    const nodes: AiNode[] = [
      {
        id: 'simulation-1',
        type: 'simulation',
        title: 'Simulation',
        description: '',
        inputs: ['trigger'],
        outputs: ['context'],
        position: { x: -200, y: 0 },
        config: {
          simulation: {
            entityType: 'product',
            entityId: 'product-2',
            productId: 'product-2',
            runBehavior: 'before_connected_trigger',
          },
        },
      },
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'simulation_required',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-sim-trigger',
        from: 'simulation-1',
        to: 'trigger-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      triggerNodeId: 'trigger-1',
      triggerEvent: 'manual',
      triggerContext: {},
    });

    expect(mockFetchEntityByType).toHaveBeenCalledWith('product', 'product-2');
    expect(result.outputs['simulation-1']?.['entityId']).toBe('product-2');
    expect(result.outputs['trigger-1']?.['trigger']).toBe(true);
  });

  it('ignores stale seeded simulation outputs for manual-only simulation nodes', async () => {
    const nodes: AiNode[] = [
      {
        id: 'simulation-1',
        type: 'simulation',
        title: 'Simulation',
        description: '',
        inputs: ['trigger'],
        outputs: ['context'],
        position: { x: -200, y: 0 },
        config: {
          simulation: {
            entityType: 'product',
            entityId: 'product-2',
            productId: 'product-2',
            runBehavior: 'manual_only',
          },
        },
      },
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'simulation_preferred',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-sim-trigger',
        from: 'simulation-1',
        to: 'trigger-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      triggerNodeId: 'trigger-1',
      triggerEvent: 'manual',
      triggerContext: {},
      seedOutputs: {
        'simulation-1': {
          context: {
            entityId: 'stale-product',
            entityType: 'product',
            entity: { id: 'stale-product' },
          },
          entityId: 'stale-product',
          entityType: 'product',
        },
      },
    });

    expect(result.outputs['simulation-1']).toBeUndefined();
    expect(result.outputs['trigger-1']?.['entityId'] ?? null).toBeNull();
  });

  it('fails fast when trigger requires simulation context but no simulation context can be resolved', async () => {
    const nodes: AiNode[] = [
      {
        id: 'simulation-1',
        type: 'simulation',
        title: 'Simulation',
        description: '',
        inputs: ['trigger'],
        outputs: ['context'],
        position: { x: -200, y: 0 },
        config: {
          simulation: {
            entityType: 'product',
            entityId: '',
            productId: '',
            runBehavior: 'manual_only',
          },
        },
      },
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'simulation_required',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-sim-trigger',
        from: 'simulation-1',
        to: 'trigger-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    await expect(
      evaluateGraph({
        ...defaultOptions,
        nodes,
        edges,
        triggerNodeId: 'trigger-1',
        triggerEvent: 'manual',
        triggerContext: {},
      })
    ).rejects.toThrow(/requires .*simulation context/i);
  });

  it('does not treat plain trigger entity context as simulation context when simulation is required', async () => {
    const nodes: AiNode[] = [
      {
        id: 'simulation-1',
        type: 'simulation',
        title: 'Simulation',
        description: '',
        inputs: ['trigger'],
        outputs: ['context'],
        position: { x: -200, y: 0 },
        config: {
          simulation: {
            entityType: 'product',
            entityId: '',
            productId: '',
            runBehavior: 'manual_only',
          },
        },
      },
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'simulation_required',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-sim-trigger',
        from: 'simulation-1',
        to: 'trigger-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    await expect(
      evaluateGraph({
        ...defaultOptions,
        nodes,
        edges,
        triggerNodeId: 'trigger-1',
        triggerEvent: 'manual',
        triggerContext: {
          entityId: 'product-123',
          entityType: 'product',
        },
      })
    ).rejects.toThrow(/requires .*simulation context/i);
  });

  it('resolves live trigger context through fetcher without backward simulation loop', async () => {
    const mockProduct = { id: 'product-77', title: 'Floor Lamp' };
    mockFetchEntityByType.mockResolvedValue(mockProduct);

    const nodes: AiNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'trigger_only',
          },
        },
      },
      {
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        description: '',
        inputs: ['trigger'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 220, y: 0 },
        config: {
          fetcher: {
            sourceMode: 'live_context',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      triggerNodeId: 'trigger-1',
      triggerEvent: 'manual',
      triggerContext: {
        entityId: 'product-77',
        entityType: 'product',
      },
    });

    expect(mockFetchEntityByType).toHaveBeenCalledWith('product', 'product-77');
    expect(result.outputs['fetcher-1']?.['entityId']).toBe('product-77');
    expect(
      (result.outputs['fetcher-1']?.['context'] as Record<string, unknown>)?.['contextSource']
    ).toBe('trigger_fetcher');
  });

  it('resolves simulated context through fetcher and feeds Context node in forward flow', async () => {
    const mockProduct = { id: 'product-88', title: 'Desk Lamp' };
    mockFetchEntityByType.mockResolvedValue(mockProduct);

    const nodes: AiNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'trigger_only',
          },
        },
      },
      {
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        description: '',
        inputs: ['trigger'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 220, y: 0 },
        config: {
          fetcher: {
            sourceMode: 'simulation_id',
            entityType: 'product',
            entityId: 'product-88',
          },
        },
      },
      {
        id: 'context-1',
        type: 'context',
        title: 'Context',
        description: '',
        inputs: ['context'],
        outputs: ['context', 'entityId', 'entityType', 'entityJson'],
        position: { x: 460, y: 0 },
        config: {
          context: {
            role: 'product',
            entityType: 'auto',
            entityIdSource: 'context',
            scopeMode: 'full',
            scopeTarget: 'entity',
            includePaths: [],
            excludePaths: [],
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-fetcher-context',
        from: 'fetcher-1',
        to: 'context-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      triggerNodeId: 'trigger-1',
      triggerEvent: 'manual',
      triggerContext: {},
    });

    expect(mockFetchEntityByType).toHaveBeenCalledWith('product', 'product-88');
    expect(result.outputs['fetcher-1']?.['entityId']).toBe('product-88');
    expect(
      (result.outputs['fetcher-1']?.['context'] as Record<string, unknown>)?.['contextSource']
    ).toBe('simulation_fetcher');
    expect(result.outputs['context-1']?.['entityId']).toBe('product-88');
    expect(result.outputs['context-1']?.['entityJson']).toMatchObject(mockProduct);
  });

  it('treats simulation-capable fetcher as valid source for trigger simulation_required mode', async () => {
    const mockProduct = { id: 'product-91', title: 'Chair' };
    mockFetchEntityByType.mockResolvedValue(mockProduct);

    const nodes: AiNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'simulation_required',
          },
        },
      },
      {
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        description: '',
        inputs: ['trigger'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 220, y: 0 },
        config: {
          fetcher: {
            sourceMode: 'simulation_id',
            entityType: 'product',
            entityId: 'product-91',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      triggerNodeId: 'trigger-1',
      triggerEvent: 'manual',
      triggerContext: {},
    });

    expect(result.outputs['fetcher-1']?.['entityId']).toBe('product-91');
  });

  it('fails simulation_required when connected fetcher is live-only and no simulation context exists', async () => {
    const nodes: AiNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'entityId', 'entityType'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'simulation_required',
          },
        },
      },
      {
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        description: '',
        inputs: ['trigger'],
        outputs: ['context', 'entityId', 'entityType'],
        position: { x: 220, y: 0 },
        config: {
          fetcher: {
            sourceMode: 'live_context',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    await expect(
      evaluateGraph({
        ...defaultOptions,
        nodes,
        edges,
        triggerNodeId: 'trigger-1',
        triggerEvent: 'manual',
        triggerContext: {},
      })
    ).rejects.toThrow(/requires .*simulation context/i);
  });

  it('emits blocked node status when wait-for-inputs node is missing required inputs', async () => {
    const onNodeBlocked = vi.fn();
    const nodes: AiNode[] = [
      {
        id: 'seed-1',
        type: 'constant',
        title: 'Seed',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: 'string',
            value: 'noop',
          },
        },
      },
      {
        id: 'model-1',
        type: 'model',
        title: 'Model',
        description: '',
        inputs: ['prompt', 'images', 'context'],
        outputs: ['result', 'jobId'],
        position: { x: 220, y: 0 },
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              prompt: { required: true },
              images: { required: false },
              context: { required: false },
            },
          },
          model: {
            modelId: 'test-model',
            waitForResult: true,
            temperature: 0.7,
            maxTokens: 1000,
            vision: false,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-seed-model-context',
        from: 'seed-1',
        to: 'model-1',
        fromPort: 'value',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      onNodeBlocked,
    });

    const blockedCall = onNodeBlocked.mock.calls.find((call) => {
      const payload = call[0] as { node?: { id?: string }; reason?: string };
      return payload.node?.id === 'model-1' && payload.reason === 'missing_inputs';
    });
    expect(blockedCall).toBeDefined();
    // In current implementation, blocked status is in nodeStatuses, not outputs
    expect(result.nodeStatuses['model-1']).toBe('blocked');
  });

  it('emits waiting status when missing inputs are still expected from upstream nodes', async () => {
    const onNodeBlocked = vi.fn();
    const nodes: AiNode[] = [
      {
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt Builder',
        description: '',
        inputs: ['value'],
        outputs: ['prompt'],
        position: { x: 0, y: 0 },
        config: {
          prompt: {
            template: 'Describe the current item.',
          },
        },
      },
      {
        id: 'model-1',
        type: 'model',
        title: 'Model',
        description: '',
        inputs: ['prompt'],
        outputs: ['result', 'jobId'],
        position: { x: 240, y: 0 },
        config: {
          runtime: {
            waitForInputs: true,
          },
          model: {
            modelId: 'test-model',
            waitForResult: true,
            temperature: 0.7,
            maxTokens: 500,
            vision: false,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-prompt-model',
        from: 'prompt-1',
        to: 'model-1',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
    ];

    await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      skipAiJobs: true,
      onNodeBlocked,
    });

    const waitingCall = onNodeBlocked.mock.calls.find((call) => {
      const payload = call[0] as { node?: { id?: string }; status?: string };
      return payload.node?.id === 'model-1' && payload.status === 'waiting_callback';
    });
    expect(waitingCall).toBeDefined();
  });

  it('does not block prompt nodes on empty optional connected ports', async () => {
    const nodes: AiNode[] = [
      {
        id: 'seed-1',
        type: 'constant',
        title: 'Seed',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: 'string',
            value: 'noop',
          },
        },
      },
      {
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        description: '',
        inputs: ['value', 'context'],
        outputs: ['prompt'],
        position: { x: 220, y: 0 },
        inputContracts: {
          value: { required: false },
          context: { required: false },
        },
        config: {
          prompt: {
            template: 'Draft ready',
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-seed-prompt-context',
        from: 'seed-1',
        to: 'prompt-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['prompt-1']?.['status']).not.toBe('blocked');
    expect(String(result.outputs['prompt-1']?.['prompt'] ?? '')).toContain('Draft ready');
  });

  it('includes upstream waiting diagnostics when model is blocked on prompt', async () => {
    const nodes: AiNode[] = [
      {
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt Builder',
        description: '',
        inputs: ['result'],
        outputs: ['prompt'],
        position: { x: 0, y: 0 },
        config: {
          prompt: {
            template: 'Name: {{result}}',
          },
          runtime: {
            waitForInputs: true,
            inputContracts: {
              result: { required: true },
            },
          },
        },
      },
      {
        id: 'model-1',
        type: 'model',
        title: 'Model',
        description: '',
        inputs: ['prompt'],
        outputs: ['result', 'jobId'],
        position: { x: 220, y: 0 },
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              prompt: { required: true },
            },
          },
          model: {
            modelId: 'test-model',
            waitForResult: true,
            temperature: 0.7,
            maxTokens: 1000,
            vision: false,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-prompt-model',
        from: 'prompt-1',
        to: 'model-1',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
      {
        id: 'edge-model-prompt',
        from: 'model-1',
        to: 'prompt-1',
        fromPort: 'result',
        toPort: 'result',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['model-1']?.['status']).toBe('waiting_callback');
    expect(result.outputs['model-1']?.['skipReason']).toBe('missing_inputs');
    expect(result.outputs['model-1']?.['waitingOnPorts']).toContain('prompt');
    expect(result.outputs['model-1']?.['message']).toContain('Upstream status for prompt');
    expect(result.outputs['model-1']?.['waitingOnDetails']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          port: 'prompt',
          upstream: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'prompt-1',
              status: 'blocked',
              waitingOnPorts: expect.arrayContaining(['result']),
            }),
          ]),
        }),
      ])
    );
  });

  it('does not emit blocked halt when unresolved nodes are waiting on upstream callbacks', async () => {
    const onHalt = vi.fn();
    const nodes: AiNode[] = [
      {
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt Builder',
        description: '',
        inputs: ['result'],
        outputs: ['prompt'],
        position: { x: 0, y: 0 },
        config: {
          prompt: {
            template: 'Name: {{result}}',
          },
          runtime: {
            waitForInputs: true,
            inputContracts: {
              result: { required: true },
            },
          },
        },
      },
      {
        id: 'model-1',
        type: 'model',
        title: 'Model',
        description: '',
        inputs: ['prompt'],
        outputs: ['result', 'jobId'],
        position: { x: 220, y: 0 },
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              prompt: { required: true },
            },
          },
          model: {
            modelId: 'test-model',
            waitForResult: true,
            temperature: 0.7,
            maxTokens: 1000,
            vision: false,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-prompt-model',
        from: 'prompt-1',
        to: 'model-1',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
      {
        id: 'edge-model-prompt',
        from: 'model-1',
        to: 'prompt-1',
        fromPort: 'result',
        toPort: 'result',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      onHalt,
    });

    expect(result.outputs['model-1']?.['status']).toBe('waiting_callback');
    expect(onHalt).not.toHaveBeenCalled();
  });

  it('accepts prompt text containing image URLs as model prompt input', async () => {
    const nodes: AiNode[] = [
      {
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        description: '',
        inputs: ['images'],
        outputs: ['prompt'],
        position: { x: 0, y: 0 },
        config: {
          prompt: {
            template: 'Analyze URL text only: https://example.com/image.png and return a title.',
          },
          runtime: {
            waitForInputs: false,
            inputContracts: {
              images: { required: false },
            },
          },
        },
      },
      {
        id: 'model-1',
        type: 'model',
        title: 'Model',
        description: '',
        inputs: ['prompt'],
        outputs: ['result', 'jobId'],
        position: { x: 220, y: 0 },
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              prompt: { required: true },
            },
          },
          model: {
            modelId: 'test-model',
            waitForResult: true,
            temperature: 0.7,
            maxTokens: 1000,
            vision: false,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-prompt-model',
        from: 'prompt-1',
        to: 'model-1',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      skipAiJobs: true,
    });

    expect(result.inputs['model-1']).toMatchObject({
      prompt: expect.stringContaining('https://example.com/image.png'),
    });
    expect(result.outputs['model-1']?.['status']).toBe('skipped');
    expect(result.outputs['model-1']?.['skipReason']).toBe('ai_jobs_disabled');
  });

  it('clears stale model outputs when required inputs are missing', async () => {
    const nodes: AiNode[] = [
      {
        id: 'seed-1',
        type: 'constant',
        title: 'Seed',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: 'string',
            value: 'noop',
          },
        },
      },
      {
        id: 'model-1',
        type: 'model',
        title: 'Model',
        description: '',
        inputs: ['prompt', 'images', 'context'],
        outputs: ['result', 'jobId'],
        position: { x: 220, y: 0 },
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              prompt: { required: true },
              images: { required: false },
              context: { required: false },
            },
          },
          model: {
            modelId: 'test-model',
            waitForResult: true,
            temperature: 0.7,
            maxTokens: 1000,
            vision: false,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-seed-model-context',
        from: 'seed-1',
        to: 'model-1',
        fromPort: 'value',
        toPort: 'context',
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      seedOutputs: {
        'model-1': {
          result: 'stale output',
          jobId: 'job-old',
          status: 'completed',
        },
      },
    });

    expect(result.outputs['model-1']).toMatchObject({
      status: 'blocked',
      skipReason: 'missing_inputs',
    });
    expect(result.outputs['model-1']?.['result']).toBeUndefined();
    expect(result.outputs['model-1']?.['jobId']).toBeUndefined();
  });

  it('auto-enables wait-for-inputs for nodes with required input contracts', async () => {
    const nodes: AiNode[] = [
      {
        id: 'seed-1',
        type: 'constant',
        title: 'Seed',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: 'string',
            value: 'noop',
          },
        },
      },
      {
        id: 'model-1',
        type: 'model',
        title: 'Model',
        description: '',
        inputs: ['prompt', 'images', 'context'],
        outputs: ['result', 'jobId'],
        position: { x: 220, y: 0 },
        inputContracts: {
          prompt: { required: true },
          images: { required: false },
          context: { required: false },
        },
        config: {
          model: {
            modelId: 'test-model',
            waitForResult: true,
            temperature: 0.7,
            maxTokens: 1000,
            vision: false,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: 'edge-seed-model-context',
        from: 'seed-1',
        to: 'model-1',
        fromPort: 'value',
        toPort: 'context',
      },
    ];
    const onHalt = vi.fn();

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      onHalt,
    });

    expect(result.outputs['model-1']?.['status']).toBe('blocked');
    expect(result.outputs['model-1']?.['skipReason']).toBe('missing_inputs');
    expect(onHalt).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'blocked',
      })
    );
  });

  it('should handle complex graph with multiple iterations', async () => {
    // node-1 (const 5) -> node-2 (math +1) -> node-3 (math +1) -> node-4 (math +1)
    const nodes: AiNode[] = [
      {
        id: 'n1',
        type: 'constant',
        title: 'Start',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: { valueType: 'number', value: '5' },
        },
      },
      {
        id: 'n2',
        type: 'math',
        title: 'Add 1',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 200, y: 0 },
        config: {
          math: { operation: 'add', operand: 1 },
        },
      },
      {
        id: 'n3',
        type: 'math',
        title: 'Add 1',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 400, y: 0 },
        config: {
          math: { operation: 'add', operand: 1 },
        },
      },
      {
        id: 'n4',
        type: 'math',
        title: 'Add 1',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 600, y: 0 },
        config: {
          math: { operation: 'add', operand: 1 },
        },
      },
    ];
    const edges: Edge[] = [
      { id: 'e1', from: 'n1', to: 'n2', fromPort: 'value', toPort: 'value' },
      { id: 'e2', from: 'n2', to: 'n3', fromPort: 'value', toPort: 'value' },
      { id: 'e3', from: 'n3', to: 'n4', fromPort: 'value', toPort: 'value' },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs['n4']).toEqual({ value: 8 });
  });

  it('should stop if max iterations reached in a loop', async () => {
    // n1 (math +1) -> n1 (loop back)
    // evaluateGraph uses maxIterations = Math.max(2, nodes.length + 2)
    // For 1 node, maxIterations = 3.
    const nodes: AiNode[] = [
      {
        id: 'n1',
        type: 'math',
        title: 'Counter',
        description: '',
        inputs: ['value'],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          math: { operation: 'add', operand: 1 },
        },
      },
    ];
    const edges: Edge[] = [{ id: 'e1', from: 'n1', to: 'n1', fromPort: 'value', toPort: 'value' }];

    await expect(
      evaluateGraph({
        ...defaultOptions,
        nodes,
        edges,
        seedOutputs: { n1: { value: 0 } },
        maxIterations: 3,
      })
    ).rejects.toThrow(/maximum iterations/i);
  });

  it('keeps inferred array values for database update mappings', async () => {
    const inferredParameters = [
      { parameterId: 'p_material', value: 'Metal' },
      { parameterId: 'p_colour', value: 'Silver' },
    ];

    const nodes: AiNode[] = [
      {
        id: 'node-array',
        type: 'constant',
        title: 'Inferred Params',
        description: '',
        inputs: [],
        outputs: ['value'],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: 'json',
            value: JSON.stringify(inferredParameters),
          },
        },
      },
      {
        id: 'node-db',
        type: 'database',
        title: 'DB Update',
        description: '',
        inputs: ['value', 'entityId', 'entityType', 'productId'],
        outputs: ['result', 'bundle'],
        position: { x: 250, y: 0 },
        config: {
          runtime: { waitForInputs: true },
          database: {
            operation: 'update',
            entityType: 'product',
            useMongoActions: true,
            actionCategory: 'update',
            action: 'updateOne',
            mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              queryTemplate: '{"id":"{{entityId}}"}',
              single: true,
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              limit: 1,
              sort: '',
              projection: '',
            },
            dryRun: true,
            skipEmpty: true,
          },
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'edge-array-db',
        from: 'node-array',
        to: 'node-db',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const onNodeStart = vi.fn();

    await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      triggerContext: {
        entityId: 'product-1',
        productId: 'product-1',
        entityType: 'product',
      },
      onNodeStart,
    });

    const dbStart = onNodeStart.mock.calls
      .map((args) => args[0])
      .find((payload) => payload?.node?.id === 'node-db');

    expect(dbStart?.nodeInputs?.value).toEqual(inferredParameters);
  });

  describe('Graph Caching', () => {
    const stableRunId = 'run-cache-graph';
    const stableRunStartedAt = '2026-01-01T00:00:00.000Z';

    const triggerNode: AiNode = {
      id: 'trigger',
      type: 'trigger',
      title: 'Trigger',
      description: '',
      inputs: [],
      outputs: ['value'],
      position: { x: -200, y: 0 },
      config: {},
    };

    it('should not re-execute a node if inputs and config have not changed', async () => {
      const nodes: AiNode[] = [
        {
          id: 'n1',
          type: 'constant',
          title: 'Const',
          description: '',
          inputs: [],
          outputs: ['value'],
          position: { x: 0, y: 0 },
          config: {
            constant: { valueType: 'string', value: 'initial' },
            runtime: { cache: { mode: 'auto' } },
          },
        },
      ];

      // First run
      const result1 = await evaluateGraph({
        ...defaultOptions,
        runId: stableRunId,
        runStartedAt: stableRunStartedAt,
        nodes: [triggerNode, ...nodes],
        edges: [],
      });

      expect(result1.outputs['n1']).toEqual({ value: 'initial' });
      const hash1 = result1.hashes?.['n1'];
      expect(hash1).toBeDefined();

      const onNodeStart = vi.fn();
      await evaluateGraph({
        ...defaultOptions,
        runId: stableRunId,
        seedRunId: stableRunId,
        runStartedAt: stableRunStartedAt,
        seedRunStartedAt: stableRunStartedAt,
        nodes: [triggerNode, ...nodes],
        edges: [],
        seedOutputs: result1.outputs,
        seedHashes: result1.hashes,
        onNodeStart,
      });

      expect(onNodeStart).toHaveBeenCalledTimes(1);
      expect(onNodeStart.mock.calls[0]?.[0]?.node.id).toBe('trigger');
    });

    it('should re-execute if cache is disabled', async () => {
      const nodes: AiNode[] = [
        {
          id: 'n1',
          type: 'constant',
          title: 'Const',
          description: '',
          inputs: [],
          outputs: ['value'],
          position: { x: 0, y: 0 },
          config: {
            constant: { valueType: 'string', value: 'initial' },
            runtime: { cache: { mode: 'disabled' } },
          },
        },
      ];

      const onNodeStart = vi.fn();

      const result1 = await evaluateGraph({
        ...defaultOptions,
        runId: stableRunId,
        runStartedAt: stableRunStartedAt,
        nodes: [triggerNode, ...nodes],
        edges: [],
      });

      await evaluateGraph({
        ...defaultOptions,
        runId: stableRunId,
        seedRunId: stableRunId,
        runStartedAt: stableRunStartedAt,
        seedRunStartedAt: stableRunStartedAt,
        nodes: [triggerNode, ...nodes],
        edges: [],
        seedOutputs: result1.outputs,
        seedHashes: result1.hashes,
        onNodeStart,
      });

      // trigger node always executes, and n1 is NOT cacheable (disabled), so both run.
      const executedNodeIds = onNodeStart.mock.calls.map((args) => args[0].node.id);
      expect(executedNodeIds).toContain('trigger');
      expect(executedNodeIds).toContain('n1');
    });
  });
});

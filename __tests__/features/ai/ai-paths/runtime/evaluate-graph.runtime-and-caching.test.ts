import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evaluateGraph } from '@/shared/lib/ai-paths/core/runtime/engine';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

import {
  defaultOptions,
  mockFetchEntityByType,
  mockReportAiPathsError,
  resetEvaluateGraphMocks,
} from './evaluate-graph.test-support';

describe('evaluateGraph', () => {
  beforeEach(() => {
    resetEvaluateGraphMocks();
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
    const waitingOnDetails = result.outputs['model-1']?.['waitingOnDetails'] as
      | Array<{
          port?: string;
          upstream?: Array<{
            nodeId?: string;
            status?: string;
            waitingOnPorts?: string[];
            blockedReason?: string;
          }>;
        }>
      | undefined;
    const promptDetail = waitingOnDetails?.find(
      (detail): boolean => detail?.port === 'prompt' && Array.isArray(detail.upstream)
    );
    const promptUpstream = promptDetail?.upstream?.find(
      (entry): boolean =>
        entry?.nodeId === 'prompt-1' &&
        /^(?:blocked|waiting_callback)$/.test(String(entry?.status ?? ''))
    );

    expect(promptDetail).toBeDefined();
    expect(promptUpstream).toBeDefined();
    if (Array.isArray(promptUpstream?.waitingOnPorts)) {
      expect(promptUpstream.waitingOnPorts).toContain('result');
    } else {
      expect(promptUpstream?.blockedReason).toBe('missing_inputs');
    }
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

  it('downgrades fetcher simulation-id hydration misconfiguration to waiting instead of failing', async () => {
    const onNodeBlocked = vi.fn();
    const nodes: AiNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        inputs: ['context'],
        outputs: ['trigger', 'triggerName'],
        position: { x: 0, y: 0 },
        config: {
          trigger: {
            event: 'manual',
          },
        },
      },
      {
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        description: '',
        inputs: ['trigger', 'context', 'entityId', 'entityType'],
        outputs: ['context', 'meta', 'entityId', 'entityType'],
        position: { x: 220, y: 0 },
        config: {
          fetcher: {
            sourceMode: 'simulation_id',
            entityType: 'product',
            entityId: '',
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
      onNodeBlocked,
    });

    expect(result.outputs['fetcher-1']?.['status']).toBe('waiting_callback');
    expect(result.outputs['fetcher-1']?.['blockedReason']).toBe('missing_inputs');
    expect(result.outputs['fetcher-1']?.['waitingOnPorts']).toEqual(
      expect.arrayContaining(['entityId'])
    );
    const blockedCall = onNodeBlocked.mock.calls.find((call) => {
      const payload = call[0] as { node?: { id?: string }; status?: string };
      return payload.node?.id === 'fetcher-1' && payload.status === 'waiting_callback';
    });
    expect(blockedCall).toBeDefined();
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
            updateTemplate: '{"$set":{"parameters":{{value}}}}',
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

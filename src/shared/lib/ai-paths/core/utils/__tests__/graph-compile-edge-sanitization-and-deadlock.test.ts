import { describe, expect, it } from 'vitest';

import { compileGraph, sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node',
    type: 'viewer',
    title: 'Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
    ...patch,
  }) as AiNode;

describe('compileGraph edge sanitization and deadlock heuristics', () => {
  it('keeps only explicit valid trigger-fetcher edges', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'meta', 'entityId', 'entityType'],
      }),
      buildNode({
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        inputs: ['trigger', 'context', 'meta', 'entityId', 'entityType'],
        outputs: ['context', 'meta', 'entityId', 'entityType'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher-explicit',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-trigger-fetcher-legacy',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const sanitized = sanitizeEdges(nodes, edges);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]).toMatchObject({
      id: 'edge-trigger-fetcher-explicit',
      fromPort: 'trigger',
      toPort: 'trigger',
    });
  });

  it('drops invalid cross-wired edges instead of auto-aligning ports', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'parser-1',
        type: 'parser',
        title: 'Parser',
        inputs: ['entityJson'],
        outputs: ['bundle', 'images'],
      }),
      buildNode({
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        inputs: ['bundle', 'images'],
        outputs: ['prompt'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-bundle-cross',
        from: 'parser-1',
        to: 'prompt-1',
        fromPort: 'bundle',
        toPort: 'images',
      },
      {
        id: 'edge-images-cross',
        from: 'parser-1',
        to: 'prompt-1',
        fromPort: 'images',
        toPort: 'bundle',
      },
    ];

    const sanitized = sanitizeEdges(nodes, edges);
    expect(sanitized).toEqual([]);

    const report = compileGraph(nodes, edges);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'invalid_edge_incompatible_connection' &&
          finding.edgeId === 'edge-bundle-cross'
      )
    ).toBe(true);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'invalid_edge_incompatible_connection' &&
          finding.edgeId === 'edge-images-cross'
      )
    ).toBe(true);
  });

  it('surfaces dropped findings when an edge omits required ports', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'source-1',
        type: 'parser',
        title: 'Parser',
        inputs: ['entityJson'],
        outputs: ['bundle'],
      }),
      buildNode({
        id: 'target-1',
        type: 'prompt',
        title: 'Prompt',
        inputs: ['bundle'],
        outputs: ['prompt'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-missing-port',
        from: 'source-1',
        to: 'target-1',
        toPort: 'bundle',
      },
    ];

    const report = compileGraph(nodes, edges);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'invalid_edge_missing_port' &&
          finding.edgeId === 'edge-missing-port'
      )
    ).toBe(true);
  });

  it('rejects legacy object-map edge payloads', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'parser-1',
        type: 'parser',
        title: 'Parser',
        inputs: ['entityJson'],
        outputs: ['bundle'],
      }),
      buildNode({
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        inputs: ['bundle'],
        outputs: ['prompt'],
      }),
    ];
    const edgesMapPayload = {
      edge_1: {
        id: 'edge_1',
        from: 'parser-1',
        to: 'prompt-1',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
    } as unknown as Edge[];

    const sanitized = sanitizeEdges(nodes, edgesMapPayload);
    expect(sanitized).toEqual([]);
  });

  it('treats missing edge payload as an empty graph', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'parser-1',
        type: 'parser',
        title: 'Parser',
        inputs: ['entityJson'],
        outputs: ['bundle'],
      }),
      buildNode({
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        inputs: ['bundle'],
        outputs: ['prompt'],
      }),
    ];

    const sanitized = sanitizeEdges(nodes, undefined as unknown as Edge[]);
    expect(sanitized).toEqual([]);
  });

  it('keeps canonical API request parameter wiring (url/body/params)', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'constant-1',
        type: 'constant',
        title: 'Constant',
        inputs: [],
        outputs: ['value'],
      }),
      buildNode({
        id: 'model-1',
        type: 'model',
        title: 'Model',
        inputs: ['prompt'],
        outputs: ['result'],
      }),
      buildNode({
        id: 'api-1',
        type: 'api_advanced',
        title: 'API',
        inputs: ['url', 'body', 'params'],
        outputs: ['result'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-url',
        from: 'constant-1',
        to: 'api-1',
        fromPort: 'value',
        toPort: 'url',
      },
      {
        id: 'edge-body',
        from: 'model-1',
        to: 'api-1',
        fromPort: 'result',
        toPort: 'body',
      },
      {
        id: 'edge-params',
        from: 'model-1',
        to: 'api-1',
        fromPort: 'result',
        toPort: 'params',
      },
    ];

    const sanitized = sanitizeEdges(nodes, edges);
    expect(sanitized).toHaveLength(3);
    expect(sanitized.map((edge) => edge.toPort).sort()).toEqual(['body', 'params', 'url']);
  });

  it('keeps canonical starter wiring and drops legacy text-port edges', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'regex-1',
        type: 'regex',
        title: 'Regex',
        inputs: ['value'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'db-1',
        type: 'database',
        title: 'Database',
        inputs: ['result'],
        outputs: ['result'],
      }),
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        inputs: [],
        outputs: ['context'],
      }),
      buildNode({
        id: 'parser-1',
        type: 'parser',
        title: 'Parser',
        inputs: ['entityJson'],
        outputs: ['description_en', 'parameters'],
      }),
      buildNode({
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        inputs: ['images', 'value'],
        outputs: ['prompt'],
      }),
      buildNode({
        id: 'viewer-1',
        type: 'viewer',
        title: 'Viewer',
        inputs: ['bundle', 'meta'],
        outputs: [],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-value-bundle',
        from: 'regex-1',
        to: 'viewer-1',
        fromPort: 'value',
        toPort: 'bundle',
      },
      {
        id: 'edge-result-meta',
        from: 'db-1',
        to: 'viewer-1',
        fromPort: 'result',
        toPort: 'meta',
      },
      {
        id: 'edge-context-images',
        from: 'trigger-1',
        to: 'prompt-1',
        fromPort: 'context',
        toPort: 'images',
      },
      {
        id: 'edge-description-text',
        from: 'parser-1',
        to: 'prompt-1',
        fromPort: 'description_en',
        toPort: 'text',
      },
      {
        id: 'edge-parameters-text',
        from: 'parser-1',
        to: 'prompt-1',
        fromPort: 'parameters',
        toPort: 'text',
      },
    ];

    const sanitized = sanitizeEdges(nodes, edges);
    expect(sanitized).toHaveLength(3);
    expect(sanitized.find((edge) => edge.id === 'edge-value-bundle')?.toPort).toBe('bundle');
    expect(sanitized.find((edge) => edge.id === 'edge-result-meta')?.toPort).toBe('meta');
    expect(sanitized.find((edge) => edge.id === 'edge-context-images')?.toPort).toBe('images');
    expect(sanitized.find((edge) => edge.id === 'edge-description-text')).toBeUndefined();
    expect(sanitized.find((edge) => edge.id === 'edge-parameters-text')).toBeUndefined();
  });

  it('drops legacy productjson/simulation port aliases during sanitization', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'simulation-1',
        type: 'simulation',
        outputs: ['context'],
      }),
      buildNode({
        id: 'fetcher-1',
        type: 'fetcher',
        inputs: ['context'],
      }),
      buildNode({
        id: 'context-1',
        type: 'context',
        outputs: ['entityJson'],
      }),
      buildNode({
        id: 'parser-1',
        type: 'parser',
        inputs: ['entityJson'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-legacy-simulation',
        from: 'simulation-1',
        to: 'fetcher-1',
        fromPort: 'simulation',
        toPort: 'context',
      },
      {
        id: 'edge-canonical-simulation',
        from: 'simulation-1',
        to: 'fetcher-1',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-legacy-productjson',
        from: 'context-1',
        to: 'parser-1',
        fromPort: 'productjson',
        toPort: 'entityJson',
      },
      {
        id: 'edge-canonical-entityjson',
        from: 'context-1',
        to: 'parser-1',
        fromPort: 'entityJson',
        toPort: 'entityJson',
      },
    ];

    const sanitized = sanitizeEdges(nodes, edges);
    expect(sanitized).toHaveLength(2);
    expect(sanitized.find((edge) => edge.id === 'edge-legacy-simulation')).toBeUndefined();
    expect(sanitized.find((edge) => edge.id === 'edge-legacy-productjson')).toBeUndefined();
    expect(sanitized.find((edge) => edge.id === 'edge-canonical-simulation')).toBeDefined();
    expect(sanitized.find((edge) => edge.id === 'edge-canonical-entityjson')).toBeDefined();
  });

  it('warns when a wait-for-inputs cycle has only cycle-internal required dependencies', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'iter-1',
        type: 'iterator',
        inputs: ['value'],
        outputs: ['value'],
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              value: { required: true },
            },
          },
        },
      }),
      buildNode({
        id: 'delay-1',
        type: 'delay',
        inputs: ['value'],
        outputs: ['value'],
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              value: { required: true },
            },
          },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-a',
        from: 'iter-1',
        to: 'delay-1',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-b',
        from: 'delay-1',
        to: 'iter-1',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const report = compileGraph(nodes, edges);
    const deadlockFinding = report.findings.find(
      (finding) => finding.code === 'cycle_wait_deadlock_risk'
    );
    expect(report.ok).toBe(true);
    expect(deadlockFinding).toBeDefined();
    expect(deadlockFinding?.message).toContain(
      'Fix: provide at least one required input from outside the loop'
    );
  });

  it('does not warn deadlock risk when at least one wait node has an external required source', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'seed-1',
        type: 'constant',
        inputs: [],
        outputs: ['value'],
      }),
      buildNode({
        id: 'iter-1',
        type: 'iterator',
        inputs: ['value', 'context'],
        outputs: ['value'],
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              value: { required: false },
              context: { required: true },
            },
          },
        },
      }),
      buildNode({
        id: 'delay-1',
        type: 'delay',
        inputs: ['value'],
        outputs: ['value'],
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              value: { required: true },
            },
          },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-seed',
        from: 'seed-1',
        to: 'iter-1',
        fromPort: 'value',
        toPort: 'context',
      },
      {
        id: 'edge-a',
        from: 'iter-1',
        to: 'delay-1',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-b',
        from: 'delay-1',
        to: 'iter-1',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const report = compileGraph(nodes, edges);
    expect(report.ok).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'cycle_wait_deadlock_risk')).toBe(
      false
    );
  });

  it('flags model prompt deadlock risk when model prompt is cycle-internal and required', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'prompt-1',
        type: 'prompt',
        inputs: ['result'],
        outputs: ['prompt'],
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              result: { required: true },
            },
          },
        },
      }),
      buildNode({
        id: 'model-1',
        type: 'model',
        inputs: ['prompt'],
        outputs: ['result', 'jobId'],
        config: {
          runtime: {
            waitForInputs: true,
            inputContracts: {
              prompt: { required: true },
            },
          },
        },
      }),
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

    const report = compileGraph(nodes, edges);
    const finding = report.findings.find((item) => item.code === 'model_prompt_deadlock_risk');
    expect(finding).toBeDefined();
    expect(finding?.message).toContain('Model prompt may never resolve');
  });
});

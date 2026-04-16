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

const hasRequiredInputMissingWiringFinding = (
  report: ReturnType<typeof compileGraph>,
  nodeId: string,
  port: string
): boolean =>
  report.findings.some(
    (finding) =>
      finding.code === 'required_input_missing_wiring' &&
      finding.nodeId === nodeId &&
      finding.port === port
  );

const buildOutOfScopeMissingInputGraph = (): { edges: Edge[]; nodes: AiNode[] } => ({
  nodes: [
    buildNode({
      id: 'trigger-1',
      type: 'trigger',
      title: 'Trigger',
      inputs: ['context'],
      outputs: ['trigger', 'context'],
    }),
    buildNode({
      id: 'fetcher-1',
      type: 'fetcher',
      title: 'Fetcher',
      inputs: ['trigger', 'context', 'meta', 'entityId', 'entityType'],
      outputs: ['context'],
    }),
    buildNode({
      id: 'parser-1',
      type: 'parser',
      title: 'Parser',
      inputs: ['context'],
      outputs: ['title'],
    }),
    buildNode({
      id: 'model-1',
      type: 'model',
      title: 'Model',
      inputs: ['prompt', 'images'],
      outputs: ['result'],
      inputContracts: {
        prompt: { required: true },
        images: { required: false },
      },
    }),
    buildNode({
      id: 'viewer-1',
      type: 'viewer',
      title: 'Viewer',
      inputs: ['result'],
      outputs: [],
    }),
  ],
  edges: [
    {
      id: 'edge-trigger-fetcher',
      from: 'trigger-1',
      to: 'fetcher-1',
      fromPort: 'trigger',
      toPort: 'trigger',
    },
    {
      id: 'edge-fetcher-parser',
      from: 'fetcher-1',
      to: 'parser-1',
      fromPort: 'context',
      toPort: 'context',
    },
    {
      id: 'edge-model-viewer',
      from: 'model-1',
      to: 'viewer-1',
      fromPort: 'result',
      toPort: 'result',
    },
  ],
});

const buildInScopeMissingInputGraph = (): { edges: Edge[]; nodes: AiNode[] } => ({
  nodes: [
    buildNode({
      id: 'trigger-1',
      type: 'trigger',
      title: 'Trigger',
      inputs: ['context'],
      outputs: ['trigger', 'context'],
    }),
    buildNode({
      id: 'model-1',
      type: 'model',
      title: 'Model',
      inputs: ['prompt', 'context', 'images'],
      outputs: ['result'],
      inputContracts: {
        prompt: { required: true },
        images: { required: false },
      },
    }),
    buildNode({
      id: 'viewer-1',
      type: 'viewer',
      title: 'Viewer',
      inputs: ['result'],
      outputs: [],
    }),
  ],
  edges: [
    {
      id: 'edge-trigger-model-context',
      from: 'trigger-1',
      to: 'model-1',
      fromPort: 'context',
      toPort: 'context',
    },
    {
      id: 'edge-model-viewer',
      from: 'model-1',
      to: 'viewer-1',
      fromPort: 'result',
      toPort: 'result',
    },
  ],
});

describe('compileGraph', () => {
  it('deduplicates exact duplicate edges during sanitization', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'source',
        type: 'mapper',
        outputs: ['value'],
      }),
      buildNode({
        id: 'target',
        type: 'compare',
        inputs: ['value'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-a',
        from: 'source',
        to: 'target',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-b',
        from: 'source',
        to: 'target',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const sanitized = sanitizeEdges(nodes, edges);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]).toMatchObject({
      from: 'source',
      to: 'target',
      fromPort: 'value',
      toPort: 'value',
    });

    const report = compileGraph(nodes, edges);
    expect(
      report.findings.some(
        (finding) => finding.code === 'duplicate_edge_dropped' && finding.edgeId === 'edge-b'
      )
    ).toBe(true);
  });

  it('surfaces dropped findings for edges that reference missing nodes', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'source',
        type: 'mapper',
        outputs: ['value'],
      }),
      buildNode({
        id: 'target',
        type: 'viewer',
        inputs: ['value'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-missing-source',
        from: 'missing-source',
        to: 'target',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const report = compileGraph(nodes, edges);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'invalid_edge_missing_node' &&
          finding.edgeId === 'edge-missing-source'
      )
    ).toBe(true);
  });

  it('blocks fan-in on single-cardinality ports', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'mapper-a',
        type: 'mapper',
        inputs: ['context'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'mapper-b',
        type: 'mapper',
        inputs: ['context'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'compare-1',
        type: 'compare',
        inputs: ['value'],
        outputs: ['valid'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-a',
        from: 'mapper-a',
        to: 'compare-1',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-b',
        from: 'mapper-b',
        to: 'compare-1',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const report = compileGraph(nodes, edges);
    expect(report.ok).toBe(false);
    expect(report.errors).toBeGreaterThan(0);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'fan_in_single_port' &&
          finding.nodeId === 'compare-1' &&
          finding.port === 'value'
      )
    ).toBe(true);
  });

  it('allows fan-in when node input cardinality is configured as many', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'mapper-a',
        type: 'mapper',
        inputs: ['context'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'mapper-b',
        type: 'mapper',
        inputs: ['context'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'compare-1',
        type: 'compare',
        inputs: ['value'],
        outputs: ['valid'],
        config: {
          runtime: {
            inputCardinality: {
              value: 'many',
            },
          },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-a',
        from: 'mapper-a',
        to: 'compare-1',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-b',
        from: 'mapper-b',
        to: 'compare-1',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const report = compileGraph(nodes, edges);
    expect(report.findings.some((finding) => finding.code === 'fan_in_single_port')).toBe(false);
  });

  it('blocks nodes with required inputs that are not wired', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'model-1',
        type: 'model',
        inputs: ['prompt', 'images'],
        outputs: ['result'],
        inputContracts: {
          prompt: { required: true },
          images: { required: false },
        },
      }),
      buildNode({
        id: 'viewer-1',
        type: 'viewer',
        inputs: ['result'],
        outputs: [],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-model-viewer',
        from: 'model-1',
        to: 'viewer-1',
        fromPort: 'result',
        toPort: 'result',
      },
    ];

    const report = compileGraph(nodes, edges);
    expect(report.ok).toBe(false);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'required_input_missing_wiring' &&
          finding.nodeId === 'model-1' &&
          finding.port === 'prompt'
      )
    ).toBe(true);
  });

  it('respects node-level optional input contracts before legacy required-port fallback', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'db-1',
        type: 'database',
        inputs: ['value', 'prompt', 'entityId'],
        outputs: ['result'],
        inputContracts: {
          value: { required: false },
          prompt: { required: false },
          entityId: { required: false },
        },
      }),
    ];

    const report = compileGraph(nodes, []);
    expect(report.ok).toBe(true);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'required_input_missing_wiring' &&
          finding.nodeId === 'db-1' &&
          (finding.port === 'value' || finding.port === 'prompt')
      )
    ).toBe(false);
  });

  it('keeps runtime input contracts as highest precedence over node-level contracts', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'db-1',
        type: 'database',
        inputs: ['value', 'prompt'],
        outputs: ['result'],
        inputContracts: {
          value: { required: false },
          prompt: { required: false },
        },
        config: {
          runtime: {
            inputContracts: {
              value: { required: true },
              prompt: { required: false },
            },
          },
        },
      }),
    ];

    const report = compileGraph(nodes, []);
    expect(report.ok).toBe(false);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'required_input_missing_wiring' &&
          finding.nodeId === 'db-1' &&
          finding.port === 'value'
      )
    ).toBe(true);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'required_input_missing_wiring' &&
          finding.nodeId === 'db-1' &&
          finding.port === 'prompt'
      )
    ).toBe(false);
  });

  it('uses declared port kinds when checking wiring compatibility', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'mapper-1',
        type: 'mapper',
        outputs: ['result'],
        outputContracts: {
          result: {
            kind: 'string',
          },
        },
      }),
      buildNode({
        id: 'model-1',
        type: 'model',
        inputs: ['value'],
        outputs: ['result'],
        inputContracts: {
          value: {
            required: true,
            kind: 'image_url',
            cardinality: 'many',
          },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-mapper-model',
        from: 'mapper-1',
        to: 'model-1',
        fromPort: 'result',
        toPort: 'value',
      },
    ];

    const report = compileGraph(nodes, edges);

    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'incompatible_wiring' && finding.edgeId === 'edge-mapper-model'
      )
    ).toBe(true);
  });

  it('warns when context-bound nodes use session cache scope', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        inputs: ['trigger', 'context', 'meta', 'entityId', 'entityType'],
        outputs: ['context', 'meta', 'entityId', 'entityType'],
        config: {
          fetcher: {
            sourceMode: 'live_context',
            entityType: 'product',
            entityId: '',
            productId: '',
          },
          runtime: {
            cache: {
              mode: 'auto',
              scope: 'session',
            },
          },
        },
      }),
    ];
    const report = compileGraph(nodes, []);
    expect(
      report.findings.some(
        (finding) => finding.code === 'context_cache_scope_risk' && finding.nodeId === 'fetcher-1'
      )
    ).toBe(true);
  });

  it('allows run-scoped compile when missing required inputs exist only outside trigger reachability', () => {
    const { nodes, edges } = buildOutOfScopeMissingInputGraph();

    const fullReport = compileGraph(nodes, edges);
    expect(fullReport.ok).toBe(false);
    expect(hasRequiredInputMissingWiringFinding(fullReport, 'model-1', 'prompt')).toBe(true);

    const scopedReport = compileGraph(nodes, edges, {
      scopeMode: 'reachable_from_roots',
      scopeRootNodeIds: ['trigger-1'],
    });
    expect(scopedReport.ok).toBe(true);
    expect(hasRequiredInputMissingWiringFinding(scopedReport, 'model-1', 'prompt')).toBe(false);
  });

  it('still blocks run-scoped compile when required inputs are missing inside trigger reachability', () => {
    const { nodes, edges } = buildInScopeMissingInputGraph();

    const scopedReport = compileGraph(nodes, edges, {
      scopeMode: 'reachable_from_roots',
      scopeRootNodeIds: ['trigger-1'],
    });
    expect(scopedReport.ok).toBe(false);
    expect(hasRequiredInputMissingWiringFinding(scopedReport, 'model-1', 'prompt')).toBe(true);
  });

  it('drops optional incompatible wiring during sanitization', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'osc-1',
        type: 'audio_oscillator',
        inputs: ['frequency'],
        outputs: ['audioSignal'],
      }),
      buildNode({
        id: 'prompt-1',
        type: 'prompt',
        inputs: ['prompt'],
        outputs: ['prompt'],
        inputContracts: {
          prompt: { required: false },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-optional-invalid',
        from: 'osc-1',
        to: 'prompt-1',
        fromPort: 'audioSignal',
        toPort: 'prompt',
      },
    ];

    const sanitized = sanitizeEdges(nodes, edges);
    expect(sanitized).toEqual([]);

    const report = compileGraph(nodes, edges);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'optional_input_incompatible_wiring' &&
          finding.edgeId === 'edge-optional-invalid'
      )
    ).toBe(false);
  });

  it('blocks cycles that use unsupported node types', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'mapper-a',
        type: 'mapper',
        inputs: ['value'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'mapper-b',
        type: 'mapper',
        inputs: ['value'],
        outputs: ['value'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-a',
        from: 'mapper-a',
        to: 'mapper-b',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-b',
        from: 'mapper-b',
        to: 'mapper-a',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const report = compileGraph(nodes, edges);
    expect(report.ok).toBe(false);
    expect(report.findings.some((finding) => finding.code === 'unsupported_cycle')).toBe(true);
  });

  it('keeps allowed loop constructs as warnings', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'iter-1',
        type: 'iterator',
        inputs: ['value'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'delay-1',
        type: 'delay',
        inputs: ['value'],
        outputs: ['value'],
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
    const cycleFinding = report.findings.find((finding) => finding.code === 'cycle_detected');
    expect(report.ok).toBe(true);
    expect(cycleFinding).toBeDefined();
    expect(cycleFinding?.message).toContain('Detected a circular loop across 2 node(s)');
    expect(cycleFinding?.message).toContain('Fix: remove at least one loop edge');
    expect(cycleFinding?.metadata?.['nodeIds']).toEqual(
      expect.arrayContaining(['iter-1', 'delay-1'])
    );
    expect(report.findings.some((finding) => finding.code === 'unsupported_cycle')).toBe(false);
  });

  it('treats trigger-simulation handshake cycles as unsupported', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        inputs: ['context'],
        outputs: ['trigger', 'context'],
      }),
      buildNode({
        id: 'simulation-1',
        type: 'simulation',
        inputs: ['trigger'],
        outputs: ['context'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-to-simulation',
        from: 'trigger-1',
        to: 'simulation-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-simulation-to-trigger',
        from: 'simulation-1',
        to: 'trigger-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const report = compileGraph(nodes, edges);
    const unsupported = report.findings.find((finding) => finding.code === 'unsupported_cycle');
    expect(report.ok).toBe(false);
    expect(unsupported).toBeDefined();
    expect(unsupported?.severity).toBe('error');
    expect(report.findings.some((finding) => finding.code === 'cycle_wait_deadlock_risk')).toBe(
      false
    );
  });

  it('does not emit trigger_context_resolution_risk for canonical trigger-only graphs', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        inputs: ['context'],
        outputs: ['trigger', 'context'],
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'trigger_only',
          },
        },
      }),
      buildNode({
        id: 'fetcher-1',
        type: 'fetcher',
        title: 'Fetcher',
        inputs: ['trigger'],
        outputs: ['context'],
        config: {
          fetcher: {
            sourceMode: 'live_context',
          },
        },
      }),
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

    const report = compileGraph(nodes, edges);
    expect(
      report.findings.some((finding) => finding.code === 'trigger_context_resolution_risk')
    ).toBe(false);
  });

  it('drops legacy Trigger.context -> Fetcher.context wiring and reports missing required trigger input', () => {
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
        inputContracts: {
          trigger: { required: true },
          context: { required: false },
          meta: { required: false },
          entityId: { required: false },
          entityType: { required: false },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher-legacy',
        from: 'trigger-1',
        to: 'fetcher-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const sanitized = sanitizeEdges(nodes, edges);
    expect(sanitized).toEqual([]);

    const report = compileGraph(nodes, edges);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'required_input_missing_wiring' &&
          finding.nodeId === 'fetcher-1' &&
          finding.port === 'trigger'
      )
    ).toBe(true);
  });
});

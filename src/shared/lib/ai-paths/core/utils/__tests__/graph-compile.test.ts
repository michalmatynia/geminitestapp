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

describe('compileGraph', () => {
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
    const nodes: AiNode[] = [
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
    ];

    const fullReport = compileGraph(nodes, edges);
    expect(fullReport.ok).toBe(false);
    expect(
      fullReport.findings.some(
        (finding) =>
          finding.code === 'required_input_missing_wiring' &&
          finding.nodeId === 'model-1' &&
          finding.port === 'prompt'
      )
    ).toBe(true);

    const scopedReport = compileGraph(nodes, edges, {
      scopeMode: 'reachable_from_roots',
      scopeRootNodeIds: ['trigger-1'],
    });
    expect(scopedReport.ok).toBe(true);
    expect(
      scopedReport.findings.some(
        (finding) =>
          finding.code === 'required_input_missing_wiring' &&
          finding.nodeId === 'model-1' &&
          finding.port === 'prompt'
      )
    ).toBe(false);
  });

  it('still blocks run-scoped compile when required inputs are missing inside trigger reachability', () => {
    const nodes: AiNode[] = [
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
    ];
    const edges: Edge[] = [
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
    ];

    const scopedReport = compileGraph(nodes, edges, {
      scopeMode: 'reachable_from_roots',
      scopeRootNodeIds: ['trigger-1'],
    });
    expect(scopedReport.ok).toBe(false);
    expect(
      scopedReport.findings.some(
        (finding) =>
          finding.code === 'required_input_missing_wiring' &&
          finding.nodeId === 'model-1' &&
          finding.port === 'prompt'
      )
    ).toBe(true);
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

  it('warns when trigger requires simulation context but no simulation edge exists', () => {
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
            contextMode: 'simulation_required',
          },
        },
      }),
    ];
    const edges: Edge[] = [];

    const report = compileGraph(nodes, edges);
    const finding = report.findings.find(
      (item) => item.code === 'trigger_context_resolution_risk' && item.nodeId === 'trigger-1'
    );
    expect(finding).toBeDefined();
    expect(finding?.message).toContain('requires simulation context');
    expect(finding?.message).toContain('no simulation-capable source');
  });

  it('warns when trigger requires simulation context but simulation source is manual-only', () => {
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
            contextMode: 'simulation_required',
          },
        },
      }),
      buildNode({
        id: 'simulation-1',
        type: 'simulation',
        title: 'Simulation',
        inputs: ['trigger'],
        outputs: ['context'],
        config: {
          simulation: {
            entityType: 'product',
            entityId: 'product-1',
            productId: 'product-1',
            runBehavior: 'manual_only',
          },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-simulation-to-trigger',
        from: 'simulation-1',
        to: 'trigger-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const report = compileGraph(nodes, edges);
    const finding = report.findings.find(
      (item) => item.code === 'trigger_context_resolution_risk' && item.nodeId === 'trigger-1'
    );
    expect(finding).toBeDefined();
    expect(finding?.message).toContain('manual-only');
    expect(finding?.message).toContain('Auto-run before connected Trigger');
  });

  it('does not warn trigger_context_resolution_risk when trigger-required simulation has an auto-run source', () => {
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
            contextMode: 'simulation_required',
          },
        },
      }),
      buildNode({
        id: 'simulation-1',
        type: 'simulation',
        title: 'Simulation',
        inputs: ['trigger'],
        outputs: ['context'],
        config: {
          simulation: {
            entityType: 'product',
            entityId: 'product-1',
            productId: 'product-1',
            runBehavior: 'before_connected_trigger',
          },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-simulation-to-trigger',
        from: 'simulation-1',
        to: 'trigger-1',
        fromPort: 'context',
        toPort: 'context',
      },
    ];

    const report = compileGraph(nodes, edges);
    expect(
      report.findings.some((finding) => finding.code === 'trigger_context_resolution_risk')
    ).toBe(false);
  });

  it('does not warn trigger_context_resolution_risk when trigger-required simulation uses fetcher simulation mode', () => {
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
            contextMode: 'simulation_required',
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
            sourceMode: 'simulation_id',
            entityType: 'product',
            entityId: 'product-1',
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

  it('warns when trigger requires simulation context and only live-context fetcher is connected', () => {
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
            contextMode: 'simulation_required',
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
    const finding = report.findings.find(
      (item) => item.code === 'trigger_context_resolution_risk' && item.nodeId === 'trigger-1'
    );
    expect(finding).toBeDefined();
    expect(finding?.message).toContain('no simulation-capable source');
    expect(finding?.message).toContain('Trigger -> Fetcher');
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

import { describe, expect, it } from 'vitest';

import { compileGraph } from '@/features/ai/ai-paths/lib/core/utils/graph';
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
    expect(
      report.findings.some((finding) => finding.code === 'fan_in_single_port')
    ).toBe(false);
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

  it('warns when optional inputs are wired incompatibly', () => {
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

    const report = compileGraph(nodes, edges);
    expect(
      report.findings.some(
        (finding) =>
          finding.code === 'optional_input_incompatible_wiring' &&
          finding.edgeId === 'edge-optional-invalid'
      )
    ).toBe(true);
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
    expect(
      report.findings.some((finding) => finding.code === 'unsupported_cycle')
    ).toBe(true);
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
    expect(report.ok).toBe(true);
    expect(
      report.findings.some((finding) => finding.code === 'cycle_detected')
    ).toBe(true);
    expect(
      report.findings.some((finding) => finding.code === 'unsupported_cycle')
    ).toBe(false);
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
    expect(report.ok).toBe(true);
    expect(
      report.findings.some((finding) => finding.code === 'cycle_wait_deadlock_risk')
    ).toBe(true);
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
    expect(
      report.findings.some((finding) => finding.code === 'cycle_wait_deadlock_risk')
    ).toBe(false);
  });
});

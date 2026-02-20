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
});

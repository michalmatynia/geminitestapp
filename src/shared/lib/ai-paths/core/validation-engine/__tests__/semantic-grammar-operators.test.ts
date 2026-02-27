import { describe, expect, it } from 'vitest';

import type {
  AiNode,
  AiPathsValidationConfig,
  Edge,
} from '@/shared/contracts/ai-paths';

import { normalizeAiPathsValidationConfig } from '../defaults';
import { evaluateAiPathsValidationPreflight } from '../evaluator';

const buildNode = (
  id: string,
  type: AiNode['type'],
  inputs: string[],
  outputs: string[],
): AiNode =>
  ({
    id,
    type,
    title: id,
    description: id,
    position: { x: 100, y: 100 },
    inputs,
    outputs,
    createdAt: '2026-02-19T00:00:00.000Z',
    updatedAt: null,
    data: {},
  }) as AiNode;

const baseValidationConfig = (): AiPathsValidationConfig =>
  normalizeAiPathsValidationConfig({
    enabled: true,
    rules: [
      {
        id: 'semantic.graph.edge_endpoints_resolve',
        title: 'Edge endpoints resolve',
        enabled: true,
        severity: 'error',
        module: 'graph',
        conditionMode: 'all',
        conditions: [{ id: 'c1', operator: 'edge_endpoints_resolve' }],
      },
      {
        id: 'semantic.graph.edge_ports_declared',
        title: 'Edge ports declared',
        enabled: true,
        severity: 'error',
        module: 'graph',
        conditionMode: 'all',
        conditions: [{ id: 'c2', operator: 'edge_ports_declared' }],
      },
      {
        id: 'semantic.catalog.node_types_known',
        title: 'Node types known',
        enabled: true,
        severity: 'error',
        module: 'graph',
        conditionMode: 'all',
        conditions: [
          {
            id: 'c3',
            operator: 'node_types_known',
            list: ['trigger', 'simulation'],
          },
        ],
      },
      {
        id: 'semantic.catalog.node_ids_unique',
        title: 'Node IDs unique',
        enabled: true,
        severity: 'error',
        module: 'graph',
        conditionMode: 'all',
        conditions: [{ id: 'c4', operator: 'node_ids_unique' }],
      },
      {
        id: 'semantic.catalog.edge_ids_unique',
        title: 'Edge IDs unique',
        enabled: true,
        severity: 'error',
        module: 'graph',
        conditionMode: 'all',
        conditions: [{ id: 'c5', operator: 'edge_ids_unique' }],
      },
      {
        id: 'semantic.catalog.node_positions_finite',
        title: 'Node positions finite',
        enabled: true,
        severity: 'warning',
        module: 'graph',
        conditionMode: 'all',
        conditions: [{ id: 'c6', operator: 'node_positions_finite' }],
      },
    ],
  });

describe('semantic grammar validation operators', () => {
  it('passes when edge endpoints and ports are valid', () => {
    const nodes: AiNode[] = [
      buildNode('node-a', 'trigger', ['context'], ['trigger']),
      buildNode('node-b', 'simulation', ['trigger'], ['context']),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-a',
        to: 'node-b',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges,
      config: baseValidationConfig(),
    });
    expect(report.failedRules).toBe(0);
  });

  it('fails when an edge references missing endpoint node', () => {
    const nodes: AiNode[] = [
      buildNode('node-a', 'trigger', ['context'], ['trigger']),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-missing-target',
        from: 'node-a',
        to: 'node-missing',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges,
      config: baseValidationConfig(),
    });
    expect(report.failedRules).toBeGreaterThan(0);
    expect(report.findings.some((finding) => finding.ruleId.includes('edge_endpoints'))).toBe(
      true,
    );
  });

  it('fails when edge port is not declared on source/target node', () => {
    const nodes: AiNode[] = [
      buildNode('node-a', 'trigger', ['context'], ['trigger']),
      buildNode('node-b', 'simulation', ['trigger'], ['context']),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-invalid-port',
        from: 'node-a',
        to: 'node-b',
        fromPort: 'invalid_port',
        toPort: 'trigger',
      },
    ];

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges,
      config: baseValidationConfig(),
    });
    expect(report.failedRules).toBeGreaterThan(0);
    expect(report.findings.some((finding) => finding.ruleId.includes('edge_ports'))).toBe(true);
  });

  it('fails when node IDs are duplicated', () => {
    const nodes: AiNode[] = [
      buildNode('node-dup', 'trigger', ['context'], ['trigger']),
      buildNode('node-dup', 'simulation', ['trigger'], ['context']),
    ];

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges: [],
      config: baseValidationConfig(),
    });
    expect(report.findings.some((finding) => finding.ruleId === 'semantic.catalog.node_ids_unique')).toBe(true);
  });

  it('fails when edge IDs are duplicated', () => {
    const nodes: AiNode[] = [
      buildNode('node-a', 'trigger', ['context'], ['trigger']),
      buildNode('node-b', 'simulation', ['trigger'], ['context']),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-dup',
        from: 'node-a',
        to: 'node-b',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-dup',
        from: 'node-a',
        to: 'node-b',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges,
      config: baseValidationConfig(),
    });
    expect(report.findings.some((finding) => finding.ruleId === 'semantic.catalog.edge_ids_unique')).toBe(true);
  });

  it('fails when node positions are non-finite', () => {
    const nodes: AiNode[] = [
      {
        ...buildNode('node-a', 'trigger', ['context'], ['trigger']),
        position: { x: Number.NaN, y: 100 },
      } as AiNode,
      buildNode('node-b', 'simulation', ['trigger'], ['context']),
    ];

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges: [],
      config: baseValidationConfig(),
    });
    expect(
      report.findings.some(
        (finding) => finding.ruleId === 'semantic.catalog.node_positions_finite',
      ),
    ).toBe(true);
  });

  it('fails when graph contains node type outside allowed semantic catalog list', () => {
    const nodes: AiNode[] = [
      buildNode('node-a', 'trigger', ['context'], ['trigger']),
      buildNode('node-c', 'database', ['entityId'], ['result']),
    ];

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges: [],
      config: baseValidationConfig(),
    });
    expect(
      report.findings.some(
        (finding) => finding.ruleId === 'semantic.catalog.node_types_known',
      ),
    ).toBe(true);
  });

  it('treats wired_to checks as not applicable when target node type is absent', () => {
    const nodes: AiNode[] = [
      buildNode('node-a', 'trigger', ['context'], ['trigger']),
    ];
    const edges: Edge[] = [];
    const config = normalizeAiPathsValidationConfig({
      ...baseValidationConfig(),
      rules: [
        ...(baseValidationConfig().rules ?? []),
        {
          id: 'semantic.wiring.trigger_to_simulation',
          title: 'Trigger feeds simulation',
          enabled: true,
          severity: 'warning',
          module: 'trigger',
          appliesToNodeTypes: ['trigger'],
          conditionMode: 'all',
          conditions: [
            {
              id: 'wire-trigger',
              operator: 'wired_to',
              fromPort: 'trigger',
              toNodeType: 'simulation',
              toPort: 'trigger',
            },
          ],
        },
      ],
    });

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges,
      config,
    });
    expect(
      report.findings.some(
        (finding) => finding.ruleId === 'semantic.wiring.trigger_to_simulation',
      ),
    ).toBe(false);
  });

  it('fails wired_to checks when target node type exists but wiring is missing', () => {
    const nodes: AiNode[] = [
      buildNode('node-a', 'trigger', ['context'], ['trigger']),
      buildNode('node-b', 'simulation', ['trigger'], ['context']),
    ];
    const edges: Edge[] = [];
    const config = normalizeAiPathsValidationConfig({
      ...baseValidationConfig(),
      rules: [
        ...(baseValidationConfig().rules ?? []),
        {
          id: 'semantic.wiring.trigger_to_simulation',
          title: 'Trigger feeds simulation',
          enabled: true,
          severity: 'warning',
          module: 'trigger',
          appliesToNodeTypes: ['trigger'],
          conditionMode: 'all',
          conditions: [
            {
              id: 'wire-trigger',
              operator: 'wired_to',
              fromPort: 'trigger',
              toNodeType: 'simulation',
              toPort: 'trigger',
            },
          ],
        },
      ],
    });

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges,
      config,
    });
    expect(
      report.findings.some(
        (finding) => finding.ruleId === 'semantic.wiring.trigger_to_simulation',
      ),
    ).toBe(true);
  });
});

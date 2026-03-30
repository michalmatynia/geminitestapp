import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, AiPathsValidationConfig, Edge } from '@/shared/contracts/ai-paths';

const { logClientErrorMock } = vi.hoisted(() => ({
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

import {
  evaluateAiPathsValidationAtStage,
  evaluateAiPathsValidationPreflight,
} from '@/shared/lib/ai-paths/core/validation-engine/evaluator';

const buildNode = (args: {
  id: string;
  type: string;
  title?: string;
  inputs?: string[];
  outputs?: string[];
  config?: Record<string, unknown>;
}): AiNode =>
  ({
    id: args.id,
    type: args.type,
    title: args.title ?? args.id,
    description: '',
    inputs: args.inputs ?? [],
    outputs: args.outputs ?? [],
    config: args.config ?? {},
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('AI Paths validation evaluator behavior', () => {
  beforeEach(() => {
    logClientErrorMock.mockReset();
  });

  it('returns the disabled report shape without evaluating rules', () => {
    const report = evaluateAiPathsValidationPreflight({
      nodes: [buildNode({ id: 'trigger-1', type: 'trigger' })],
      edges: [] satisfies Edge[],
      config: { enabled: false } as AiPathsValidationConfig,
    });

    expect(report).toMatchObject({
      enabled: false,
      score: 100,
      blocked: false,
      shouldWarn: false,
      rulesEvaluated: 0,
      failedRules: 0,
      findings: [],
      recommendations: [],
      appliedRuleIds: [],
      skippedRuleIds: [],
    });
  });

  it('evaluates approved inferred rules and skips candidate or deprecated ones', () => {
    const report = evaluateAiPathsValidationPreflight({
      nodes: [
        buildNode({
          id: 'trigger-1',
          type: 'trigger',
          config: {
            trigger: {
              event: '',
            },
          },
        }),
      ],
      edges: [] satisfies Edge[],
      config: {
        enabled: true,
        policy: 'warn_below_threshold',
        baseScore: 90,
        warnThreshold: 80,
        blockThreshold: 50,
        rules: [
          {
            id: 'rule.candidate',
            title: 'Candidate rule',
            enabled: true,
            severity: 'error',
            module: 'custom',
            appliesToNodeTypes: ['trigger'],
            inference: {
              sourceType: 'central_docs',
              status: 'candidate',
            },
            conditions: [
              {
                id: 'candidate.exists',
                operator: 'exists',
                field: 'config.trigger.event',
              },
            ],
          },
          {
            id: 'rule.deprecated',
            title: 'Deprecated rule',
            enabled: true,
            severity: 'warning',
            module: 'custom',
            appliesToNodeTypes: ['trigger'],
            inference: {
              sourceType: 'manual',
              status: 'deprecated',
            },
            conditions: [
              {
                id: 'deprecated.exists',
                operator: 'exists',
                field: 'config.trigger.event',
              },
            ],
          },
          {
            id: 'rule.approved',
            title: 'Approved inferred rule',
            enabled: true,
            severity: 'error',
            module: 'custom',
            appliesToNodeTypes: ['trigger'],
            recommendation: 'Add a trigger event.',
            forceProbabilityIfFailed: 10,
            inference: {
              sourceType: 'central_docs',
              status: 'approved',
            },
            conditions: [
              {
                id: 'approved.non_empty',
                operator: 'non_empty',
                field: 'config.trigger.event',
              },
            ],
          },
        ],
      } as AiPathsValidationConfig,
    });

    expect(report.rulesEvaluated).toBe(1);
    expect(report.failedRules).toBe(1);
    expect(report.score).toBe(10);
    expect(report.blocked).toBe(false);
    expect(report.shouldWarn).toBe(true);
    expect(report.appliedRuleIds).toEqual(['rule.approved']);
    expect(report.skippedRuleIds).toEqual(
      expect.arrayContaining(['rule.candidate', 'rule.deprecated'])
    );
    expect(report.recommendations).toEqual([
      expect.objectContaining({
        ruleId: 'rule.approved',
        recommendation: 'Add a trigger event.',
      }),
    ]);
    expect(report.moduleImpact.custom).toMatchObject({
      rulesEvaluated: 1,
      failedRules: 1,
      scorePenalty: 25,
    });
  });

  it('covers operator branches for graph and node rules', () => {
    const triggerNode = buildNode({
      id: 'trigger-1',
      type: 'trigger',
      inputs: ['context'],
      outputs: ['trigger'],
      config: {
        trigger: {
          event: 'manual',
        },
      },
    });
    const databaseNode = buildNode({
      id: 'database-1',
      type: 'database',
      inputs: ['entityId'],
      outputs: ['result'],
      config: {
        database: {
          query: {
            collection: 'custom_collection',
          },
        },
      },
    });
    const simulationNode = buildNode({
      id: 'simulation-1',
      type: 'simulation',
      inputs: ['trigger'],
      outputs: ['context'],
      config: {
        simulation: {
          entityType: 'products',
          productId: 'prod-1',
        },
      },
    });
    const nodes = [triggerNode, databaseNode, simulationNode];
    const edges: Edge[] = [
      {
        id: 'edge-1',
        from: 'trigger-1',
        to: 'simulation-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-2',
        from: 'simulation-1',
        to: 'database-1',
        fromPort: 'context',
        toPort: 'entityId',
      },
    ];

    const report = evaluateAiPathsValidationPreflight({
      nodes,
      edges,
      config: {
        enabled: true,
        collectionMap: {
          product: 'products',
        },
        rules: [
          {
            id: 'rule.graph.jsonpath-numeric',
            title: 'Graph numeric threshold',
            enabled: true,
            severity: 'info',
            module: 'graph',
            conditions: [
              {
                id: 'graph.jsonpath',
                operator: 'jsonpath_equals',
                valuePath: 'counts.nodes',
                expected: 2,
              },
            ],
          },
          {
            id: 'rule.graph.non-empty',
            title: 'Graph count map exists',
            enabled: true,
            severity: 'info',
            module: 'graph',
            conditions: [
              {
                id: 'graph.non-empty',
                operator: 'non_empty',
                valuePath: 'counts.byType',
              },
            ],
          },
          {
            id: 'rule.trigger.any-negated-exists',
            title: 'Negated exists can satisfy any mode',
            enabled: true,
            severity: 'warning',
            module: 'custom',
            appliesToNodeTypes: ['trigger'],
            conditionMode: 'any',
            conditions: [
              {
                id: 'trigger.missing',
                operator: 'exists',
                field: 'config.trigger.missing',
              },
              {
                id: 'trigger.negated-missing',
                operator: 'exists',
                field: 'config.trigger.missing',
                negate: true,
              },
            ],
          },
          {
            id: 'rule.trigger.in-list',
            title: 'Trigger event is allowed',
            enabled: true,
            severity: 'warning',
            module: 'custom',
            appliesToNodeTypes: ['trigger'],
            conditions: [
              {
                id: 'trigger.in',
                operator: 'in',
                field: 'config.trigger.event',
                expected: ['manual', 'timer'],
              },
            ],
          },
          {
            id: 'rule.trigger.regex-invalid',
            title: 'Invalid regex branch',
            enabled: true,
            severity: 'warning',
            module: 'custom',
            appliesToNodeTypes: ['trigger'],
            conditions: [
              {
                id: 'trigger.regex',
                operator: 'matches_regex',
                field: 'config.trigger.event',
                expected: '[',
              },
            ],
          },
          {
            id: 'rule.trigger.wired-to-simulation',
            title: 'Trigger feeds simulation',
            enabled: true,
            severity: 'info',
            module: 'custom',
            appliesToNodeTypes: ['trigger'],
            conditions: [
              {
                id: 'trigger.wired-to',
                operator: 'wired_to',
                fromPort: 'trigger',
                toNodeType: 'simulation',
                toPort: 'trigger',
              },
            ],
          },
          {
            id: 'rule.database.collection',
            title: 'Database collection exists',
            enabled: true,
            severity: 'info',
            module: 'custom',
            appliesToNodeTypes: ['database'],
            conditions: [
              {
                id: 'database.collection',
                operator: 'collection_exists',
              },
            ],
          },
          {
            id: 'rule.database.wired-from-simulation',
            title: 'Database receives simulation context',
            enabled: true,
            severity: 'info',
            module: 'custom',
            appliesToNodeTypes: ['database'],
            conditions: [
              {
                id: 'database.wired-from',
                operator: 'wired_from',
                fromNodeType: 'simulation',
                fromPort: 'context',
                toPort: 'entityId',
              },
            ],
          },
          {
            id: 'rule.simulation.entity-collection',
            title: 'Simulation entity resolves to collection',
            enabled: true,
            severity: 'info',
            module: 'custom',
            appliesToNodeTypes: ['simulation'],
            conditions: [
              {
                id: 'simulation.entity-collection',
                operator: 'entity_collection_resolves',
              },
            ],
          },
        ],
      } as AiPathsValidationConfig,
    });

    expect(report.rulesEvaluated).toBe(9);
    expect(report.failedRules).toBe(1);
    expect(report.findings).toEqual([
      expect.objectContaining({
        ruleId: 'rule.trigger.regex-invalid',
        failedConditionIds: ['trigger.regex'],
      }),
    ]);
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);
  });

  it('treats missing simulation node types as wiring no-ops at node stage', () => {
    const triggerNode = buildNode({
      id: 'trigger-1',
      type: 'trigger',
      inputs: ['context'],
      outputs: ['trigger'],
    });
    const databaseNode = buildNode({
      id: 'database-1',
      type: 'database',
      inputs: ['entityId'],
      outputs: ['result'],
    });

    const report = evaluateAiPathsValidationAtStage({
      nodes: [triggerNode, databaseNode],
      edges: [] satisfies Edge[],
      stage: 'node_pre_execute',
      node: databaseNode,
      config: {
        enabled: true,
        rules: [
          {
            id: 'rule.database.wired-from-simulation-absent',
            title: 'Database receives simulation when simulation exists',
            enabled: true,
            severity: 'info',
            module: 'custom',
            appliesToNodeTypes: ['database'],
            appliesToStages: ['node_pre_execute'],
            conditions: [
              {
                id: 'database.wired-from-absent',
                operator: 'wired_from',
                fromNodeType: 'simulation',
                toPort: 'entityId',
              },
            ],
          },
        ],
      } as AiPathsValidationConfig,
    });

    expect(report.failedRules).toBe(0);
    expect(report.appliedRuleIds).toEqual(['rule.database.wired-from-simulation-absent']);
  });

  it('covers remaining graph integrity operators and the report-only warning branch', () => {
    const duplicateTrigger = {
      ...buildNode({
        id: 'duplicate-node',
        type: 'trigger',
        inputs: ['in'],
        outputs: ['out'],
      }),
      position: { x: Number.NaN, y: 1 },
    } as AiNode;
    const unknownDuplicate = {
      ...buildNode({
        id: 'duplicate-node',
        type: 'mystery-node',
        inputs: ['input-a'],
        outputs: ['output-a'],
      }),
      position: { x: 10, y: 20 },
    } as AiNode;
    const targetNode = buildNode({
      id: 'target-node',
      type: 'database',
      inputs: ['declared-input'],
      outputs: ['declared-output'],
    });
    const edges: Edge[] = [
      {
        id: 'edge-duplicate',
        from: 'duplicate-node',
        to: 'missing-target',
        fromPort: 'wrong-output',
        toPort: 'wrong-input',
      },
      {
        id: 'edge-duplicate',
        from: 'duplicate-node',
        to: 'target-node',
        fromPort: 'out',
        toPort: 'declared-input',
      },
    ];

    const report = evaluateAiPathsValidationPreflight({
      nodes: [duplicateTrigger, unknownDuplicate, targetNode],
      edges,
      config: {
        enabled: true,
        policy: 'report_only',
        rules: [
          {
            id: 'rule.graph.jsonpath-exists',
            title: 'Graph stats exist',
            enabled: true,
            severity: 'info',
            module: 'graph',
            conditions: [{ id: 'graph.jsonpath.exists', operator: 'jsonpath_exists', valuePath: 'counts.byType' }],
          },
          {
            id: 'rule.graph.edge-endpoints',
            title: 'Edge endpoints resolve',
            enabled: true,
            severity: 'warning',
            module: 'graph',
            conditions: [{ id: 'graph.edge-endpoints', operator: 'edge_endpoints_resolve' }],
          },
          {
            id: 'rule.graph.edge-ports',
            title: 'Edge ports are declared',
            enabled: true,
            severity: 'warning',
            module: 'graph',
            conditions: [{ id: 'graph.edge-ports', operator: 'edge_ports_declared' }],
          },
          {
            id: 'rule.graph.node-types-known',
            title: 'Node types are known',
            enabled: true,
            severity: 'warning',
            module: 'graph',
            conditions: [
              { id: 'graph.node-types-known', operator: 'node_types_known', list: ['trigger', 'database'] },
            ],
          },
          {
            id: 'rule.graph.node-ids-unique',
            title: 'Node ids are unique',
            enabled: true,
            severity: 'warning',
            module: 'graph',
            conditions: [{ id: 'graph.node-ids-unique', operator: 'node_ids_unique' }],
          },
          {
            id: 'rule.graph.edge-ids-unique',
            title: 'Edge ids are unique',
            enabled: true,
            severity: 'warning',
            module: 'graph',
            conditions: [{ id: 'graph.edge-ids-unique', operator: 'edge_ids_unique' }],
          },
          {
            id: 'rule.graph.node-positions-finite',
            title: 'Node positions are finite',
            enabled: true,
            severity: 'warning',
            module: 'graph',
            conditions: [{ id: 'graph.node-positions-finite', operator: 'node_positions_finite' }],
          },
          {
            id: 'rule.database.has-incoming-port',
            title: 'Database has incoming port',
            enabled: true,
            severity: 'info',
            module: 'custom',
            appliesToNodeTypes: ['database'],
            conditions: [{ id: 'database.has-incoming-port', operator: 'has_incoming_port', port: 'declared-input' }],
          },
          {
            id: 'rule.database.has-outgoing-port-negated',
            title: 'Database lacks outgoing execution port',
            enabled: true,
            severity: 'info',
            module: 'custom',
            appliesToNodeTypes: ['database'],
            conditions: [
              {
                id: 'database.has-outgoing-port-negated',
                operator: 'has_outgoing_port',
                port: 'missing-output',
                negate: true,
              },
            ],
          },
        ],
      } as AiPathsValidationConfig,
    });

    expect(report.rulesEvaluated).toBe(9);
    expect(report.failedRules).toBe(6);
    expect(report.blocked).toBe(false);
    expect(report.shouldWarn).toBe(true);
    expect(report.appliedRuleIds).toEqual(
      expect.arrayContaining([
        'rule.graph.jsonpath-exists',
        'rule.graph.edge-endpoints',
        'rule.graph.edge-ports',
        'rule.graph.node-types-known',
        'rule.graph.node-ids-unique',
        'rule.graph.edge-ids-unique',
        'rule.graph.node-positions-finite',
        'rule.database.has-incoming-port',
        'rule.database.has-outgoing-port-negated',
      ])
    );
    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      'rule.graph.edge-endpoints',
      'rule.graph.edge-ports',
      'rule.graph.node-types-known',
      'rule.graph.node-ids-unique',
      'rule.graph.edge-ids-unique',
      'rule.graph.node-positions-finite',
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  AI_PATHS_VALIDATION_SCHEMA_VERSION,
  evaluateAiPathsValidationPreflight,
  normalizeAiPathsValidationConfig,
} from '@/features/ai/ai-paths/lib';
import type { AiNode, Edge } from '@/shared/types/domain/ai-paths';

const createNode = (overrides: Partial<AiNode>): AiNode =>
  ({
    id: 'node-1',
    type: 'constant',
    title: 'Node',
    description: '',
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: ['value'],
    ...overrides,
  }) as AiNode;

describe('AI Paths validation engine', () => {
  it('normalizes validation schema version and sanitizes malformed rules', () => {
    const config = normalizeAiPathsValidationConfig({
      schemaVersion: 1,
      enabled: true,
      rules: [
        {
          id: '',
          title: '',
          enabled: true,
          severity: 'error',
          module: 'graph',
          conditions: [
            {
              id: 'invalid',
              operator: 'jsonpath_exists',
              valuePath: 'counts.nodes',
            },
          ],
        },
        {
          id: 'graph.has_trigger',
          title: 'Graph has trigger',
          enabled: true,
          severity: 'error',
          module: 'graph',
          conditions: [
            {
              id: 'trigger-count',
              operator: 'jsonpath_equals',
              valuePath: 'counts.byType.trigger',
              expected: 1,
            },
          ],
        },
      ],
    });

    expect(config.schemaVersion).toBe(AI_PATHS_VALIDATION_SCHEMA_VERSION);
    expect(config.rules).toHaveLength(1);
    expect(config.rules?.[0]?.id).toBe('graph.has_trigger');
  });

  it('skips node-scoped rules when matching node type is not present', () => {
    const nodes: AiNode[] = [createNode({ type: 'trigger' as AiNode['type'] })];
    const edges: Edge[] = [];
    const config = normalizeAiPathsValidationConfig({
      enabled: true,
      policy: 'block_below_threshold',
      baseScore: 100,
      blockThreshold: 50,
      rules: [
        {
          id: 'simulation.requires.id',
          title: 'Simulation needs ID',
          enabled: true,
          severity: 'error',
          module: 'simulation',
          appliesToNodeTypes: ['simulation'],
          conditionMode: 'all',
          conditions: [
            {
              id: 'simulation-entity-id',
              operator: 'non_empty',
              field: 'config.simulation.entityId',
            },
          ],
          weight: 40,
        },
      ],
    });

    const report = evaluateAiPathsValidationPreflight({ nodes, edges, config });
    expect(report.failedRules).toBe(0);
    expect(report.findings).toHaveLength(0);
    expect(report.score).toBe(100);
    expect(report.blocked).toBe(false);
  });

  it('blocks run when graph policy score drops below threshold', () => {
    const nodes: AiNode[] = [createNode({ type: 'constant' })];
    const edges: Edge[] = [];
    const config = normalizeAiPathsValidationConfig({
      enabled: true,
      policy: 'block_below_threshold',
      baseScore: 100,
      blockThreshold: 90,
      rules: [
        {
          id: 'graph.requires_trigger',
          title: 'Path has trigger',
          enabled: true,
          severity: 'error',
          module: 'graph',
          conditionMode: 'all',
          conditions: [
            {
              id: 'trigger-count',
              operator: 'jsonpath_equals',
              valuePath: 'counts.byType.trigger',
              expected: 1,
            },
          ],
          weight: 50,
        },
      ],
    });

    const report = evaluateAiPathsValidationPreflight({ nodes, edges, config });
    expect(report.failedRules).toBe(1);
    expect(report.score).toBe(50);
    expect(report.blocked).toBe(true);
  });

  it('emits warning signal when policy is warn_below_threshold', () => {
    const nodes: AiNode[] = [createNode({ type: 'constant' })];
    const edges: Edge[] = [];
    const config = normalizeAiPathsValidationConfig({
      enabled: true,
      policy: 'warn_below_threshold',
      baseScore: 100,
      warnThreshold: 95,
      rules: [
        {
          id: 'graph.requires_trigger',
          title: 'Path has trigger',
          enabled: true,
          severity: 'warning',
          module: 'graph',
          conditionMode: 'all',
          conditions: [
            {
              id: 'trigger-count',
              operator: 'jsonpath_equals',
              valuePath: 'counts.byType.trigger',
              expected: 1,
            },
          ],
          weight: 10,
        },
      ],
    });

    const report = evaluateAiPathsValidationPreflight({ nodes, edges, config });
    expect(report.blocked).toBe(false);
    expect(report.shouldWarn).toBe(true);
    expect(report.findings).toHaveLength(1);
  });

  it('tracks skipped rules and module impact in preflight report', () => {
    const nodes: AiNode[] = [createNode({ type: 'trigger' as AiNode['type'] })];
    const edges: Edge[] = [];
    const config = normalizeAiPathsValidationConfig({
      enabled: true,
      policy: 'block_below_threshold',
      baseScore: 100,
      rules: [
        {
          id: 'graph.requires_trigger_count_two',
          title: 'Path has two triggers',
          enabled: true,
          severity: 'error',
          module: 'graph',
          conditionMode: 'all',
          recommendation: 'Use at least two trigger nodes.',
          conditions: [
            {
              id: 'trigger-count',
              operator: 'jsonpath_equals',
              valuePath: 'counts.byType.trigger',
              expected: 2,
            },
          ],
          weight: 30,
        },
        {
          id: 'simulation.requires.id',
          title: 'Simulation needs ID',
          enabled: true,
          severity: 'error',
          module: 'simulation',
          appliesToNodeTypes: ['simulation'],
          conditions: [
            {
              id: 'simulation-entity-id',
              operator: 'non_empty',
              field: 'config.simulation.entityId',
            },
          ],
        },
      ],
    });

    const report = evaluateAiPathsValidationPreflight({ nodes, edges, config });
    expect(report.schemaVersion).toBe(AI_PATHS_VALIDATION_SCHEMA_VERSION);
    expect(report.appliedRuleIds).toContain('graph.requires_trigger_count_two');
    expect(report.skippedRuleIds).toContain('simulation.requires.id');
    expect(report.moduleImpact['graph']?.failedRules).toBe(1);
    expect(report.recommendations).toHaveLength(1);
  });
});

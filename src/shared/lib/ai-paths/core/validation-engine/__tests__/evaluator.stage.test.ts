import { describe, expect, it } from 'vitest';

import type { AiNode, AiPathsValidationConfig, Edge } from '@/shared/contracts/ai-paths';
import { evaluateAiPathsValidationAtStage } from '@/shared/lib/ai-paths/core/validation-engine/evaluator';

const buildNode = (args: {
  id: string;
  type: string;
  title: string;
  config?: Record<string, unknown>;
}): AiNode =>
  ({
    id: args.id,
    type: args.type,
    title: args.title,
    description: '',
    inputs: [],
    outputs: ['value'],
    config: args.config ?? {},
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('AI Paths validation evaluator stage behavior', () => {
  it('evaluates unstaged rules at graph_parse only', () => {
    const triggerNode = buildNode({
      id: 'trigger-1',
      type: 'trigger',
      title: 'Trigger',
      config: { trigger: { event: 'manual' } },
    });
    const config: AiPathsValidationConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule.graph.node-count',
          title: 'Graph should have two nodes',
          enabled: true,
          severity: 'error',
          module: 'graph',
          conditions: [
            {
              id: 'cond.graph.nodes.eq2',
              operator: 'jsonpath_equals',
              valuePath: 'counts.nodes',
              expected: 2,
            },
          ],
        },
      ],
    } as AiPathsValidationConfig;

    const parseReport = evaluateAiPathsValidationAtStage({
      nodes: [triggerNode],
      edges: [] satisfies Edge[],
      config,
      stage: 'graph_parse',
    });
    const bindReport = evaluateAiPathsValidationAtStage({
      nodes: [triggerNode],
      edges: [] satisfies Edge[],
      config,
      stage: 'graph_bind',
    });

    expect(parseReport.failedRules).toBe(1);
    expect(bindReport.failedRules).toBe(0);
    expect(bindReport.skippedRuleIds).toContain('rule.graph.node-count');
  });

  it('evaluates node-stage rules only for the active node context', () => {
    const triggerNode = buildNode({
      id: 'trigger-1',
      type: 'trigger',
      title: 'Trigger',
      config: { trigger: { event: 'manual' } },
    });
    const modelNode = buildNode({
      id: 'model-1',
      type: 'model',
      title: 'Model',
      config: {},
    });
    const config: AiPathsValidationConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule.trigger.requires_missing_field',
          title: 'Trigger requires missing field',
          enabled: true,
          severity: 'error',
          module: 'custom',
          appliesToNodeTypes: ['trigger'],
          appliesToStages: ['node_pre_execute'],
          conditions: [
            {
              id: 'cond.exists.missing',
              operator: 'exists',
              field: 'config.trigger.missing',
            },
          ],
        },
      ],
    } as AiPathsValidationConfig;

    const triggerReport = evaluateAiPathsValidationAtStage({
      nodes: [triggerNode, modelNode],
      edges: [] satisfies Edge[],
      config,
      stage: 'node_pre_execute',
      node: triggerNode,
    });
    const modelReport = evaluateAiPathsValidationAtStage({
      nodes: [triggerNode, modelNode],
      edges: [] satisfies Edge[],
      config,
      stage: 'node_pre_execute',
      node: modelNode,
    });

    expect(triggerReport.failedRules).toBe(1);
    expect(modelReport.failedRules).toBe(0);
    expect(modelReport.skippedRuleIds).toContain('rule.trigger.requires_missing_field');
  });

  it('skips graph-module rules during node execution stages', () => {
    const triggerNode = buildNode({
      id: 'trigger-1',
      type: 'trigger',
      title: 'Trigger',
      config: { trigger: { event: 'manual' } },
    });
    const config: AiPathsValidationConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule.graph.must-have-two-nodes-at-node-stage',
          title: 'Graph node count check',
          enabled: true,
          severity: 'error',
          module: 'graph',
          appliesToStages: ['node_pre_execute'],
          conditions: [
            {
              id: 'cond.graph.nodes.eq2',
              operator: 'jsonpath_equals',
              valuePath: 'counts.nodes',
              expected: 2,
            },
          ],
        },
      ],
    } as AiPathsValidationConfig;

    const report = evaluateAiPathsValidationAtStage({
      nodes: [triggerNode],
      edges: [] satisfies Edge[],
      config,
      stage: 'node_pre_execute',
      node: triggerNode,
    });

    expect(report.failedRules).toBe(0);
    expect(report.skippedRuleIds).toContain('rule.graph.must-have-two-nodes-at-node-stage');
  });
});

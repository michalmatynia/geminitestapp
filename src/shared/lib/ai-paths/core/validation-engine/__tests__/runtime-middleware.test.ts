import { describe, expect, it } from 'vitest';

import type { AiNode, AiPathsValidationConfig, Edge } from '@/shared/contracts/ai-paths';
import {
  createAiPathsRuntimeValidationMiddleware,
  resolveAiPathsRuntimeValidationMiddleware,
} from '@/shared/lib/ai-paths/core/validation-engine/runtime-middleware';

const buildTriggerNode = (): AiNode =>
  ({
    id: 'node-trigger',
    type: 'trigger',
    title: 'Trigger',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {
      trigger: {
        event: 'manual',
      },
    },
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('AI Paths runtime validation middleware', () => {
  it('blocks when an error rule fails at node_pre_execute stage', () => {
    const node = buildTriggerNode();
    const config: AiPathsValidationConfig = {
      enabled: true,
      policy: 'block_below_threshold',
      rules: [
        {
          id: 'rule.trigger.requires_missing_field',
          title: 'Trigger missing field',
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

    const middleware = createAiPathsRuntimeValidationMiddleware({
      config,
      nodes: [node],
      edges: [] satisfies Edge[],
    });

    const result = middleware?.({
      stage: 'node_pre_execute',
      runId: 'run-1',
      runStartedAt: new Date().toISOString(),
      iteration: 1,
      nodes: [node],
      edges: [] satisfies Edge[],
      node,
      nodeInputs: {},
    });

    expect(result).toMatchObject({
      decision: 'block',
    });
  });

  it('does not apply unstaged rules on node stages', () => {
    const node = buildTriggerNode();
    const config: AiPathsValidationConfig = {
      enabled: true,
      policy: 'block_below_threshold',
      rules: [
        {
          id: 'rule.graph.missing_trigger_count',
          title: 'Graph missing trigger count',
          enabled: true,
          severity: 'error',
          module: 'graph',
          conditions: [
            {
              id: 'cond.graph.trigger_missing',
              operator: 'jsonpath_exists',
              valuePath: 'counts.byType.trigger_missing',
            },
          ],
        },
      ],
    } as AiPathsValidationConfig;

    const middleware = createAiPathsRuntimeValidationMiddleware({
      config,
      nodes: [node],
      edges: [] satisfies Edge[],
    });

    const nodeStage = middleware?.({
      stage: 'node_pre_execute',
      runId: 'run-1',
      runStartedAt: new Date().toISOString(),
      iteration: 1,
      nodes: [node],
      edges: [] satisfies Edge[],
      node,
      nodeInputs: {},
    });
    const graphStage = middleware?.({
      stage: 'graph_parse',
      runId: 'run-1',
      runStartedAt: new Date().toISOString(),
      iteration: 0,
      nodes: [node],
      edges: [] satisfies Edge[],
      node: null,
    });

    expect(nodeStage).toBeNull();
    expect(graphStage).toMatchObject({
      decision: 'block',
    });
  });
});

describe('resolveAiPathsRuntimeValidationMiddleware', () => {
  it('uses explicit middleware override when provided', () => {
    const node = buildTriggerNode();
    const override = () => null;

    const resolved = resolveAiPathsRuntimeValidationMiddleware({
      validationMiddleware: override,
      runtimeValidationEnabled: false,
      runtimeValidationConfig: null,
      nodes: [node],
      edges: [] satisfies Edge[],
    });

    expect(resolved).toBe(override);
  });

  it('returns undefined when runtime validation is disabled and no override exists', () => {
    const node = buildTriggerNode();
    const resolved = resolveAiPathsRuntimeValidationMiddleware({
      runtimeValidationEnabled: false,
      runtimeValidationConfig: {
        enabled: true,
        rules: [],
      } as AiPathsValidationConfig,
      nodes: [node],
      edges: [] satisfies Edge[],
    });

    expect(resolved).toBeUndefined();
  });

  it('builds middleware from runtime config when enabled', () => {
    const node = buildTriggerNode();
    const config: AiPathsValidationConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule.trigger.requires_missing_field',
          title: 'Trigger missing field',
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

    const resolved = resolveAiPathsRuntimeValidationMiddleware({
      runtimeValidationEnabled: true,
      runtimeValidationConfig: config,
      nodes: [node],
      edges: [] satisfies Edge[],
    });

    expect(
      resolved?.({
        stage: 'node_pre_execute',
        runId: 'run-1',
        runStartedAt: new Date().toISOString(),
        iteration: 1,
        nodes: [node],
        edges: [] satisfies Edge[],
        node,
        nodeInputs: {},
      })
    ).toMatchObject({
      decision: 'block',
    });
  });
});

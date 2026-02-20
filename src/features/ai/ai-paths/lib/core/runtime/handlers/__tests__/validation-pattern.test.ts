import { describe, expect, it, vi } from 'vitest';

import { handleValidationPattern } from '@/features/ai/ai-paths/lib/core/runtime/handlers/transform';
import type {
  AiNode,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

const buildNode = (
  patch: Partial<AiNode> = {}
): AiNode =>
  ({
    id: 'node-validation-pattern',
    type: 'validation_pattern',
    title: 'Validation Pattern',
    description: 'Validation Pattern Node',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['value', 'prompt', 'result', 'context'],
    outputs: ['value', 'result', 'context', 'valid', 'errors', 'bundle'],
    config: {
      validationPattern: {
        source: 'path_local',
        stackId: '',
        scope: 'global',
        includeLearnedRules: true,
        runtimeMode: 'validate_only',
        failPolicy: 'block_on_error',
        inputPort: 'value',
        outputPort: 'value',
        maxAutofixPasses: 1,
        includeRuleIds: [],
        localListName: 'Path Local Validation List',
        localListDescription: '',
        rules: [],
        learnedRules: [],
      },
    },
    ...(patch as Record<string, unknown>),
  }) as AiNode;

const buildContext = (
  node: AiNode,
  nodeInputs: RuntimePortValues
): NodeHandlerContext =>
  ({
    node,
    nodeInputs,
    prevOutputs: {},
    edges: [],
    nodes: [node],
    runId: 'run-1',
    runStartedAt: new Date().toISOString(),
    activePathId: 'path-1',
    triggerNodeId: undefined,
    triggerEvent: undefined,
    triggerContext: undefined,
    deferPoll: false,
    skipAiJobs: false,
    now: new Date().toISOString(),
    allOutputs: {},
    allInputs: {},
    fetchEntityCached: async () => null,
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    simulationEntityType: null,
    simulationEntityId: null,
    resolvedEntity: null,
    fallbackEntityId: null,
    strictFlowMode: true,
    executed: {
      notification: new Set<string>(),
      updater: new Set<string>(),
      http: new Set<string>(),
      delay: new Set<string>(),
      poll: new Set<string>(),
      ai: new Set<string>(),
      schema: new Set<string>(),
      mapper: new Set<string>(),
    },
  }) as NodeHandlerContext;

describe('handleValidationPattern', () => {
  it('blocks when error-level issues are present', async () => {
    const node = buildNode({
      config: {
        validationPattern: {
          source: 'path_local',
          scope: 'global',
          includeLearnedRules: true,
          runtimeMode: 'validate_only',
          failPolicy: 'block_on_error',
          inputPort: 'value',
          outputPort: 'value',
          maxAutofixPasses: 1,
          includeRuleIds: [],
          stackId: '',
          localListName: 'Path Local Validation List',
          localListDescription: '',
          rules: [
            {
              kind: 'regex',
              id: 'must-have-hello',
              enabled: true,
              severity: 'error',
              title: 'Must contain hello',
              description: null,
              message: 'Missing "hello".',
              similar: [],
              pattern: 'hello',
              flags: 'i',
              appliesToScopes: ['global'],
              launchEnabled: false,
              launchOperator: 'contains',
              launchValue: null,
              launchFlags: null,
            },
          ],
          learnedRules: [],
        },
      },
    });

    const result = (await handleValidationPattern(buildContext(node, { value: 'world' }))) as Record<string, any>;
    expect(result['valid']).toBe(false);
    expect(result['errors']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Must contain hello'),
      ])
    );
    expect(result['value']).toBe('world');
    expect((result['bundle'] as Record<string, unknown>)['issueCount']).toBe(1);
  });

  it('can autofix input and clear issues', async () => {
    const node = buildNode({
      config: {
        validationPattern: {
          source: 'path_local',
          scope: 'global',
          includeLearnedRules: true,
          runtimeMode: 'validate_and_autofix',
          failPolicy: 'block_on_error',
          inputPort: 'value',
          outputPort: 'value',
          maxAutofixPasses: 2,
          includeRuleIds: [],
          stackId: '',
          localListName: 'Path Local Validation List',
          localListDescription: '',
          rules: [
            {
              kind: 'regex',
              id: 'must-have-bar',
              enabled: true,
              severity: 'error',
              title: 'Must contain bar',
              description: null,
              message: 'Missing "bar".',
              similar: [],
              pattern: 'bar',
              flags: 'i',
              appliesToScopes: ['global'],
              launchEnabled: false,
              launchOperator: 'contains',
              launchValue: null,
              launchFlags: null,
              autofix: {
                enabled: true,
                operations: [
                  {
                    kind: 'replace',
                    pattern: 'foo',
                    flags: 'gi',
                    replacement: 'bar',
                  },
                ],
              },
            },
          ],
          learnedRules: [],
        },
      },
    });

    const result = (await handleValidationPattern(buildContext(node, { value: 'foo text' }))) as Record<string, any>;
    expect(result['valid']).toBe(true);
    expect(result['value']).toContain('bar');
    expect(result['errors']).toEqual([]);
    expect(
      Array.isArray((result['bundle'] as Record<string, unknown>)['appliedFixes'])
    ).toBe(true);
  });

  it('supports report-only mode', async () => {
    const node = buildNode({
      config: {
        validationPattern: {
          source: 'path_local',
          scope: 'global',
          includeLearnedRules: true,
          runtimeMode: 'validate_only',
          failPolicy: 'report_only',
          inputPort: 'value',
          outputPort: 'value',
          maxAutofixPasses: 1,
          includeRuleIds: [],
          stackId: '',
          localListName: 'Path Local Validation List',
          localListDescription: '',
          rules: [
            {
              kind: 'regex',
              id: 'must-have-term',
              enabled: true,
              severity: 'error',
              title: 'Must contain term',
              description: null,
              message: 'Missing "term".',
              similar: [],
              pattern: 'term',
              flags: 'i',
              appliesToScopes: ['global'],
              launchEnabled: false,
              launchOperator: 'contains',
              launchValue: null,
              launchFlags: null,
            },
          ],
          learnedRules: [],
        },
      },
    });

    const result = (await handleValidationPattern(buildContext(node, { value: 'abc' }))) as Record<string, any>;
    expect(result['valid']).toBe(true);
    expect((result['errors'] as string[]).length).toBe(1);
  });

  it('passes through when no rules are configured', async () => {
    const node = buildNode();
    const result = (await handleValidationPattern(buildContext(node, { value: 'abc' }))) as Record<string, any>;
    expect(result['valid']).toBe(true);
    expect(result['errors']).toEqual([]);
    expect((result['bundle'] as Record<string, unknown>)['reason']).toBe(
      'no_rules_configured'
    );
  });
});

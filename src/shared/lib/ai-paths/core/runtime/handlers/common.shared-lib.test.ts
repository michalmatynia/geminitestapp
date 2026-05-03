import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import {
  handleBundle,
  handleCompare,
  handleConstant,
  handleDelay,
  handleGate,
  handleLogicalCondition,
  handleMath,
  handleRouter,
  handleViewer,
} from '@/shared/lib/ai-paths/core/runtime/handlers/common';

const { logClientErrorMock } = vi.hoisted(() => ({
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (error: unknown) => logClientErrorMock(error),
}));

const createMockContext = (
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext => ({
  node: {
    id: 'test-node',
    type: 'constant',
    title: 'Test Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    config: {},
  } as AiNode,
  nodeInputs: {},
  prevOutputs: {},
  edges: [],
  nodes: [],
  nodeById: new Map(),
  runId: 'test-run-id',
  runStartedAt: new Date().toISOString(),
  activePathId: 'test-path',
  triggerNodeId: undefined,
  triggerEvent: undefined,
  triggerContext: null,
  deferPoll: false,
  skipAiJobs: false,
  now: new Date().toISOString(),
  allOutputs: {},
  allInputs: {},
  fetchEntityCached: vi.fn().mockResolvedValue(null),
  reportAiPathsError: vi.fn(),
  toast: vi.fn(),
  simulationEntityType: null,
  simulationEntityId: null,
  resolvedEntity: null,
  fallbackEntityId: null,
  strictFlowMode: true,
  executed: {
    notification: new Set(),
    updater: new Set(),
    http: new Set(),
    delay: new Set(),
    poll: new Set(),
    ai: new Set(),
    schema: new Set(),
    mapper: new Set(),
  },
  ...overrides,
});

describe('common.shared-lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleConstant', () => {
    it('covers string, number, boolean, valid json, and invalid json constants', () => {
      expect(
        handleConstant(
          createMockContext({
            node: {
              id: 'n1',
              type: 'constant',
              config: { constant: { valueType: 'string', value: 'hello' } },
            } as any,
          })
        )
      ).toEqual({ value: 'hello' });

      expect(
        handleConstant(
          createMockContext({
            node: {
              id: 'n1',
              type: 'constant',
              config: { constant: { valueType: 'number', value: '42' } },
            } as any,
          })
        )
      ).toEqual({ value: 42 });

      expect(
        handleConstant(
          createMockContext({
            node: {
              id: 'n1',
              type: 'constant',
              config: { constant: { valueType: 'boolean', value: 'true' } },
            } as any,
          })
        )
      ).toEqual({ value: true });

      expect(
        handleConstant(
          createMockContext({
            node: {
              id: 'n1',
              type: 'constant',
              config: { constant: { valueType: 'json', value: '{"a":1}' } },
            } as any,
          })
        )
      ).toEqual({ value: { a: 1 } });

      expect(
        handleConstant(
          createMockContext({
            node: {
              id: 'n1',
              type: 'constant',
              config: { constant: { valueType: 'json', value: '{broken' } },
            } as any,
          })
        )
      ).toEqual({ value: null });
      expect(logClientErrorMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleMath', () => {
    it('covers all math operations and invalid-input fallbacks', () => {
      const cases = [
        [{ operation: 'add', operand: 5 }, 10, 15],
        [{ operation: 'subtract', operand: 3 }, 10, 7],
        [{ operation: 'multiply', operand: 4 }, 2, 8],
        [{ operation: 'divide', operand: 2 }, 10, 5],
        [{ operation: 'divide', operand: 0 }, 9, 9],
        [{ operation: 'round' }, 3.6, 4],
        [{ operation: 'ceil' }, 2.1, 3],
        [{ operation: 'floor' }, 2.9, 2],
        [{ operation: 'unknown' }, 7, 7],
      ] as const;

      for (const [math, value, expected] of cases) {
        expect(
          handleMath(
            createMockContext({
              node: { id: 'n1', type: 'math', config: { math } } as any,
              nodeInputs: { value },
            })
          )
        ).toEqual({ value: expected });
      }

      expect(
        handleMath(
          createMockContext({
            node: {
              id: 'n1',
              type: 'math',
              config: { math: { operation: 'add', operand: 5 } },
            } as any,
            nodeInputs: { value: 'not-a-number' },
          })
        )
      ).toEqual({ value: 'not-a-number' });
    });
  });

  describe('handleCompare', () => {
    it('covers equality, relational, string, emptiness, and unknown compare operators', async () => {
      const cases = [
        [{ operator: 'eq', compareTo: 'test' }, 'test', true],
        [{ operator: 'eq', compareTo: 'TEST', caseSensitive: false }, 'test', true],
        [{ operator: 'neq', compareTo: 'beta' }, 'alpha', true],
        [{ operator: 'gt', compareTo: '10' }, '12', true],
        [{ operator: 'gte', compareTo: '12' }, '12', true],
        [{ operator: 'lt', compareTo: '12' }, '11', true],
        [{ operator: 'lte', compareTo: '12' }, '12', true],
        [{ operator: 'contains', compareTo: 'cha' }, 'keychain', true],
        [{ operator: 'startsWith', compareTo: 'key' }, 'keychain', true],
        [{ operator: 'endsWith', compareTo: 'chain' }, 'keychain', true],
        [{ operator: 'isEmpty', message: 'empty only' }, '   ', true],
        [{ operator: 'notEmpty' }, 'filled', true],
      ] as const;

      for (const [compare, value, expected] of cases) {
        expect(
          (
            await handleCompare(
              createMockContext({
                node: { id: 'n1', type: 'compare', config: { compare } } as any,
                nodeInputs: { value },
              })
            )
          )['valid']
        ).toBe(expected);
      }

      expect(
        await handleCompare(
          createMockContext({
            node: {
              id: 'n1',
              type: 'compare',
              config: { compare: { operator: 'unknown', message: 'unsupported' } },
            } as any,
            nodeInputs: { value: 'filled' },
          })
        )
      ).toEqual({
        value: 'filled',
        valid: false,
        errors: ['unsupported'],
      });
    });
  });

  describe('handleLogicalCondition', () => {
    it('covers empty config, and/or combinators, field paths, and fallback port normalization', () => {
      expect(
        handleLogicalCondition(
          createMockContext({
            node: {
              id: 'n1',
              type: 'logicalCondition',
              config: { logicalCondition: { combinator: 'and', conditions: [] } },
            } as any,
            nodeInputs: { value: 'seed' },
          })
        )
      ).toEqual({ value: 'seed', valid: true, errors: [] });

      expect(
        handleLogicalCondition(
          createMockContext({
            node: {
              id: 'n1',
              type: 'logicalCondition',
              config: {
                logicalCondition: {
                  combinator: 'and',
                  conditions: [
                    {
                      id: 'cond-role',
                      inputPort: 'context',
                      fieldPath: 'user.role',
                      operator: 'equals',
                      compareTo: 'admin',
                    },
                    {
                      id: 'cond-stock',
                      inputPort: 'bundle',
                      fieldPath: 'stock',
                      operator: 'greaterThan',
                      compareTo: '10',
                    },
                  ],
                },
              },
            } as any,
            nodeInputs: {
              value: 'seed',
              context: { user: { role: 'admin' } },
              bundle: { stock: 5 },
            },
          })
        )
      ).toEqual({
        value: { user: { role: 'admin' } },
        valid: false,
        errors: ['Condition failed: [bundle] greaterThan'],
      });

      expect(
        handleLogicalCondition(
          createMockContext({
            node: {
              id: 'n1',
              type: 'logicalCondition',
              config: {
                logicalCondition: {
                  combinator: 'or',
                  conditions: [
                    {
                      id: 'cond-result',
                      inputPort: 'result',
                      operator: 'contains',
                      compareTo: 'missing',
                    },
                    {
                      id: 'cond-bundle',
                      inputPort: 'bundle',
                      fieldPath: 'status',
                      operator: 'startsWith',
                      compareTo: 'rea',
                    },
                  ],
                },
              },
            } as any,
            nodeInputs: {
              value: 'seed',
              result: 'done',
              bundle: { status: 'ready' },
            },
          })
        )
      ).toEqual({
        value: 'done',
        valid: true,
        errors: [],
      });

      expect(
        handleLogicalCondition(
          createMockContext({
            node: {
              id: 'n1',
              type: 'logicalCondition',
              config: {
                logicalCondition: {
                  combinator: 'and',
                  conditions: [
                    {
                      id: 'cond-note',
                      inputPort: 'context',
                      fieldPath: 'note',
                      operator: 'notContains',
                      compareTo: 'error',
                    },
                    {
                      id: 'cond-threshold',
                      inputPort: 'bundle',
                      fieldPath: 'count',
                      operator: 'greaterThanOrEqual',
                      compareTo: '3',
                    },
                    {
                      id: 'cond-label',
                      inputPort: 'value',
                      operator: 'notEmpty',
                    },
                    {
                      id: 'cond-limit',
                      inputPort: 'result',
                      operator: 'lessThanOrEqual',
                      compareTo: '9',
                    },
                    {
                      id: 'cond-fallback-port',
                      inputPort: 'unsupported',
                      operator: 'truthy',
                    },
                  ],
                },
              },
            } as any,
            nodeInputs: {
              value: 'ready',
              result: '8',
              context: { note: 'all clear' },
              bundle: { count: 3 },
            },
          })
        )
      ).toEqual({
        value: { note: 'all clear' },
        valid: true,
        errors: [],
      });

      expect(
        handleLogicalCondition(
          createMockContext({
            node: {
              id: 'n1',
              type: 'logicalCondition',
              config: {
                logicalCondition: {
                  combinator: 'or',
                  conditions: [
                    {
                      id: 'cond-falsy',
                      inputPort: 'context',
                      fieldPath: 'flag',
                      operator: 'falsy',
                    },
                    {
                      id: 'cond-empty',
                      inputPort: 'bundle',
                      fieldPath: 'details',
                      operator: 'isEmpty',
                    },
                  ],
                },
              },
            } as any,
            nodeInputs: {
              value: 'seed',
              context: { flag: true },
              bundle: { details: 'filled' },
            },
          })
        )
      ).toEqual({
        value: { flag: true },
        valid: false,
        errors: [
          'Condition did not match: [context] falsy',
          'Condition did not match: [bundle] isEmpty',
        ],
      });
    });
  });

  describe('handleRouter', () => {
    it('covers valid, falsy, equals, contains, and unknown match modes', async () => {
      expect(
        await handleRouter(
          createMockContext({
            node: {
              id: 'n1',
              type: 'router',
              config: { router: { mode: 'valid', matchMode: 'truthy' } },
            } as any,
            nodeInputs: { valid: true, value: 'some-value' },
          })
        )
      ).toEqual({
        valid: true,
        errors: [],
        value: 'some-value',
      });

      expect(
        await handleRouter(
          createMockContext({
            node: {
              id: 'n1',
              type: 'router',
              config: { router: { mode: 'valid', matchMode: 'truthy' } },
            } as any,
            nodeInputs: { valid: false },
          })
        )
      ).toEqual({
        valid: false,
        errors: ['Router blocked'],
      });

      expect(
        await handleRouter(
          createMockContext({
            node: {
              id: 'n1',
              type: 'router',
              config: { router: { mode: 'value', matchMode: 'equals', compareTo: 'ready' } },
            } as any,
            nodeInputs: { value: 'ready', bundle: { ok: true }, extra: 'ignored' },
          })
        )
      ).toEqual({
        valid: true,
        errors: [],
        value: 'ready',
        bundle: { ok: true },
      });

      expect(
        await handleRouter(
          createMockContext({
            node: {
              id: 'n1',
              type: 'router',
              config: { router: { mode: 'value', matchMode: 'contains', compareTo: 'chain' } },
            } as any,
            nodeInputs: { value: 'keychain' },
          })
        )
      ).toEqual({
        valid: true,
        errors: [],
        value: 'keychain',
      });

      expect(
        await handleRouter(
          createMockContext({
            node: {
              id: 'n1',
              type: 'router',
              config: { router: { mode: 'value', matchMode: 'falsy' } },
            } as any,
            nodeInputs: { value: '' },
          })
        )
      ).toEqual({
        valid: true,
        errors: [],
        value: '',
      });

      expect(
        await handleRouter(
          createMockContext({
            node: {
              id: 'n1',
              type: 'router',
              config: { router: { mode: 'value', matchMode: 'unrecognized' } },
            } as any,
            nodeInputs: { value: 0 },
          })
        )
      ).toEqual({
        valid: false,
        errors: ['Router blocked'],
      });
    });
  });

  describe('handleGate', () => {
    it('covers pass-through, block mode, existing error preservation, and truthy coercion', async () => {
      expect(
        await handleGate(
          createMockContext({
            node: {
              id: 'n1',
              type: 'gate',
              config: { gate: { mode: 'block' } },
            } as any,
            nodeInputs: { valid: true, context: { user: 'admin' } },
          })
        )
      ).toEqual({
        valid: true,
        context: { user: 'admin' },
        errors: [],
      });

      expect(
        await handleGate(
          createMockContext({
            node: {
              id: 'n1',
              type: 'gate',
              config: { gate: { mode: 'block', failMessage: 'Denied' } },
            } as any,
            nodeInputs: { valid: false },
          })
        )
      ).toEqual({
        valid: false,
        context: null,
        errors: ['Denied'],
      });

      expect(
        await handleGate(
          createMockContext({
            node: {
              id: 'n1',
              type: 'gate',
              config: { gate: { mode: 'block', failMessage: 'Denied' } },
            } as any,
            nodeInputs: { valid: false, errors: ['existing'] },
          })
        )
      ).toEqual({
        valid: false,
        context: null,
        errors: ['existing'],
      });

      expect(
        await handleGate(
          createMockContext({
            node: {
              id: 'n1',
              type: 'gate',
              config: { gate: { mode: 'pass' } },
            } as any,
            nodeInputs: { valid: 1, context: { user: 'guest' }, errors: ['kept'] },
          })
        )
      ).toEqual({
        valid: true,
        context: { user: 'guest' },
        errors: ['kept'],
      });
    });
  });

  describe('handleBundle', () => {
    it('covers explicit includePorts and node-input fallback bundling', async () => {
      expect(
        await handleBundle(
          createMockContext({
            node: {
              id: 'n1',
              type: 'bundle',
              config: { bundle: { includePorts: ['a', 'b'] } },
            } as any,
            nodeInputs: { a: 1, b: 2, c: 3 },
          })
        )
      ).toEqual({ bundle: { a: 1, b: 2 } });

      expect(
        await handleBundle(
          createMockContext({
            node: {
              id: 'n1',
              type: 'bundle',
              inputs: ['value', 'context'],
              config: { bundle: { includePorts: [] } },
            } as any,
            nodeInputs: { value: 1, context: { ok: true }, ignored: 'x' },
          })
        )
      ).toEqual({ bundle: { value: 1, context: { ok: true } } });
    });
  });

  describe('handleDelay', () => {
    it('covers normal delay execution, repeated execution, and both abort branches', async () => {
      vi.useFakeTimers();
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'delay',
          config: { delay: { ms: 1000 } },
        } as any,
        nodeInputs: { value: 'test' },
      });

      const promise = handleDelay(ctx);
      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toEqual({ value: 'test' });
      expect(ctx.executed.delay.has('n1')).toBe(true);

      await expect(handleDelay(ctx)).resolves.toEqual({ value: 'test' });

      const alreadyAborted = new AbortController();
      alreadyAborted.abort();
      await expect(
        handleDelay(
          createMockContext({
            node: { id: 'n2', type: 'delay', config: { delay: { ms: 1 } } } as any,
            abortSignal: alreadyAborted.signal,
          })
        )
      ).rejects.toMatchObject({ name: 'AbortError' });

      const controller = new AbortController();
      const abortPromise = handleDelay(
        createMockContext({
          node: { id: 'n3', type: 'delay', config: { delay: { ms: 1000 } } } as any,
          abortSignal: controller.signal,
        })
      );
      controller.abort();
      vi.runAllTimers();
      await expect(abortPromise).rejects.toMatchObject({ name: 'AbortError' });

      vi.useRealTimers();
    });
  });

  describe('handleViewer', () => {
    it('passes through nodeInputs so the viewer displays upstream data', () => {
      const nodeInputs = { result: 'normalized', confidence: 0.95 };
      const prevOutputs = { value: 'stale' };

      const result = handleViewer(
        createMockContext({
          node: { id: 'n1', type: 'viewer', outputs: [] } as any,
          nodeInputs,
          prevOutputs,
        })
      );

      expect(result).toEqual(nodeInputs);
    });

    it('returns empty object when nodeInputs is empty', () => {
      const result = handleViewer(
        createMockContext({
          node: { id: 'n2', type: 'viewer', outputs: ['value'] } as any,
          nodeInputs: {},
          prevOutputs: { value: 'stale' },
        })
      );

      expect(result).toEqual({});
    });
  });
});

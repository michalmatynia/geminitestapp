import { describe, expect, it, vi } from 'vitest';

import { handleRegex } from '@/features/ai/ai-paths/lib/core/runtime/handlers/transform';
import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

const buildRegexNode = (jsonIntegrityPolicy: 'repair' | 'strict'): AiNode =>
  ({
    id: `regex-${jsonIntegrityPolicy}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    type: 'regex',
    title: 'Regex Extract JSON',
    description: '',
    position: { x: 120, y: 80 },
    data: {},
    inputs: ['value'],
    outputs: ['grouped', 'matches', 'value'],
    config: {
      regex: {
        pattern: '(?<payload>\\{.*)',
        flags: '',
        mode: 'extract_json',
        matchMode: 'first',
        groupBy: 'payload',
        outputMode: 'object',
        includeUnmatched: false,
        unmatchedKey: '__unmatched__',
        splitLines: false,
        jsonIntegrityPolicy,
      },
    },
  }) as AiNode;

const buildContext = (
  node: AiNode,
  value: unknown
): NodeHandlerContext =>
  ({
    node,
    nodeInputs: { value },
    prevOutputs: {},
    edges: [],
    nodes: [],
    nodeById: new Map(),
    runId: 'run-regex',
    runStartedAt: '2026-01-01T00:00:00.000Z',
    activePathId: null,
    triggerNodeId: undefined,
    triggerEvent: undefined,
    triggerContext: null,
    deferPoll: false,
    skipAiJobs: false,
    now: '2026-01-01T00:00:00.000Z',
    abortSignal: undefined,
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
  }) as NodeHandlerContext;

describe('handleRegex json integrity policy', () => {
  const malformed =
    '{"parameters":[{"parameterId":"p1","value":"v1","valuesByLanguage":{"pl":"x"},{"parameterId":"p2","value":"v2","valuesByLanguage":{"pl":"y"}}]}';
  const truncated =
    '{"parameters":[{"parameterId":"p1","value":"v1"},{"parameterId":"p2","value":"v2"}';

  it('repairs malformed JSON payload in repair mode', async () => {
    const node = buildRegexNode('repair');
    const output = await handleRegex(buildContext(node, malformed));

    expect(output['value']).toEqual({
      parameters: [
        {
          parameterId: 'p1',
          value: 'v1',
          valuesByLanguage: { pl: 'x' },
        },
        {
          parameterId: 'p2',
          value: 'v2',
          valuesByLanguage: { pl: 'y' },
        },
      ],
    });
    expect(output['jsonIntegrity']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parseState: 'repaired',
          repairApplied: true,
        }),
      ])
    );
  });

  it('keeps malformed JSON unresolved in strict mode', async () => {
    const node = buildRegexNode('strict');
    const output = await handleRegex(buildContext(node, malformed));

    expect(output['value']).toBe(malformed);
    expect(output['jsonIntegrity']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parseState: 'unparseable',
          repairApplied: false,
        }),
      ])
    );
  });

  it('repairs truncated JSON payloads in repair mode', async () => {
    const node = buildRegexNode('repair');
    const output = await handleRegex(buildContext(node, truncated));

    expect(output['value']).toEqual({
      parameters: [
        {
          parameterId: 'p1',
          value: 'v1',
        },
        {
          parameterId: 'p2',
          value: 'v2',
        },
      ],
    });
    expect(output['jsonIntegrity']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parseState: 'repaired',
          truncationDetected: true,
          repairApplied: true,
        }),
      ])
    );
  });
});

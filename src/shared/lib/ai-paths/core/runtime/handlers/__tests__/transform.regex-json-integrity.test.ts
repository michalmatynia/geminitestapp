import { describe, expect, it, vi } from 'vitest';

import { handleRegex } from '@/shared/lib/ai-paths/core/runtime/handlers/transform';
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

const buildContext = (node: AiNode, value: unknown): NodeHandlerContext =>
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

  it('supports captures and named-group selectors after normalization', async () => {
    const node = {
      ...buildRegexNode('repair'),
      config: {
        regex: {
          pattern: '^(?<kind>[^:]+):(?<value>.+)$',
          flags: '',
          mode: 'extract',
          matchMode: 'first',
          groupBy: 'groups',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          jsonIntegrityPolicy: 'repair',
        },
      },
    } as AiNode;

    const output = await handleRegex(buildContext(node, 'tag:alpha'));
    const [record] = output['matches'] as Array<Record<string, unknown>>;

    expect(output['value']).toEqual({ kind: 'tag', value: 'alpha' });
    expect(record?.['groups']).toEqual({ kind: 'tag', value: 'alpha' });
    expect(record?.['captures']).toEqual(['tag', 'alpha']);
  });

  it('returns empty grouped output for blank patterns and emits ai prompts only when requested', async () => {
    const node = {
      ...buildRegexNode('repair'),
      config: {
        regex: {
          pattern: '   ',
          flags: '',
          mode: 'group',
          matchMode: 'first',
          groupBy: 'match',
          outputMode: 'array',
          includeUnmatched: true,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          aiPrompt: 'Review {{text}}',
          aiAutoRun: true,
          jsonIntegrityPolicy: 'repair',
        },
      },
    } as AiNode;

    const output = await handleRegex(buildContext(node, 'alpha'));

    expect(output).toEqual({
      grouped: [],
      matches: [],
      value: [],
      aiPrompt: 'Review alpha',
    });
  });

  it('uses first_overall unmatched records when no input matches and includeUnmatched is enabled', async () => {
    const node = {
      ...buildRegexNode('repair'),
      config: {
        regex: {
          pattern: '^z+$',
          flags: '',
          mode: 'group',
          matchMode: 'first_overall',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: true,
          unmatchedKey: 'fallback',
          splitLines: true,
          jsonIntegrityPolicy: 'repair',
        },
      },
    } as AiNode;

    const output = await handleRegex(buildContext(node, 'alpha\nbeta'));

    expect(output['grouped']).toEqual({
      fallback: [
        {
          input: 'alpha',
          match: null,
          index: null,
          captures: [],
          groups: null,
          key: 'fallback',
          extracted: null,
        },
      ],
    });
    expect(output['matches']).toHaveLength(1);
    expect(output['value']).toEqual(output['grouped']);
  });

  it('extracts arrays of parsed json captures and supports numeric group selectors in all mode', async () => {
    const extractJsonNode = {
      ...buildRegexNode('repair'),
      config: {
        regex: {
          pattern: '^(\\{[^}]+\\})(\\{[^}]+\\})$',
          flags: '',
          mode: 'extract_json',
          matchMode: 'first',
          groupBy: 'captures',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          jsonIntegrityPolicy: 'repair',
        },
      },
    } as AiNode;

    const extractJsonOutput = await handleRegex(
      buildContext(extractJsonNode, '{"a":1}{"b":2}')
    );
    expect(extractJsonOutput['value']).toEqual([{ a: 1 }, { b: 2 }]);
    expect(extractJsonOutput['jsonIntegrity']).toBeUndefined();

    const numericSelectorNode = {
      ...buildRegexNode('repair'),
      config: {
        regex: {
          pattern: '^(\\w+):(\\w+)$',
          flags: '',
          mode: 'extract',
          matchMode: 'all',
          groupBy: '1',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: true,
          jsonIntegrityPolicy: 'repair',
        },
      },
    } as AiNode;

    const numericSelectorOutput = await handleRegex(buildContext(numericSelectorNode, 'tag:alpha\nkind:beta'));
    expect(numericSelectorOutput['value']).toEqual(['tag', 'kind']);
  });

  it('returns empty output for invalid regex patterns and for misses when includeUnmatched is disabled', async () => {
    const invalidRegexNode = {
      ...buildRegexNode('repair'),
      config: {
        regex: {
          pattern: '[',
          flags: '',
          mode: 'group',
          matchMode: 'first',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: true,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          aiPrompt: '   ',
          aiAutoRun: true,
          jsonIntegrityPolicy: 'repair',
        },
      },
    } as AiNode;

    const invalidOutput = await handleRegex(buildContext(invalidRegexNode, 'alpha'));
    expect(invalidOutput).toEqual({
      grouped: {},
      matches: [],
      value: {},
    });

    const noMatchNode = {
      ...buildRegexNode('repair'),
      config: {
        regex: {
          pattern: '^z+$',
          flags: '',
          mode: 'group',
          matchMode: 'first',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          jsonIntegrityPolicy: 'repair',
        },
      },
    } as AiNode;

    const noMatchOutput = await handleRegex(buildContext(noMatchNode, 'alpha'));
    expect(noMatchOutput).toEqual({
      grouped: {},
      matches: [],
      value: {},
    });
  });

  it('stringifies non-string inputs and avoids infinite loops on zero-length all-mode matches', async () => {
    const stringifiedNode = {
      ...buildRegexNode('repair'),
      config: {
        regex: {
          pattern: '\\d+',
          flags: '',
          mode: 'extract',
          matchMode: 'first',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          jsonIntegrityPolicy: 'repair',
        },
      },
    } as AiNode;

    const stringifiedOutput = await handleRegex(buildContext(stringifiedNode, { total: 42 }));
    expect(stringifiedOutput['value']).toBe('42');
    expect((stringifiedOutput['matches'] as Array<Record<string, unknown>>)[0]?.['input']).toBe(
      '{"total":42}'
    );

    const zeroLengthNode = {
      ...buildRegexNode('repair'),
      config: {
        regex: {
          pattern: '^',
          flags: '',
          mode: 'extract',
          matchMode: 'all',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          jsonIntegrityPolicy: 'repair',
        },
      },
    } as AiNode;

    const zeroLengthOutput = await handleRegex(buildContext(zeroLengthNode, 'ab'));
    expect(zeroLengthOutput['matches']).toHaveLength(1);
    expect(zeroLengthOutput['value']).toBe('');
  });
});

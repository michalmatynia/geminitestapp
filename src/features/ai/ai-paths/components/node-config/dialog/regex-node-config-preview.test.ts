import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  logClientError: vi.fn(), logClientCatch: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

import {
  buildRegexItems,
  buildRegexPreview,
  extractCodeSnippets,
  extractRegexLiteral,
  normalizeRegexFlags,
  parseRegexCandidate,
} from './regex-node-config-preview';

const buildRegexConfig = (overrides: Record<string, unknown> = {}) =>
  ({
    pattern: 'SKU-(\\d+)',
    flags: 'g',
    mode: 'group',
    matchMode: 'first',
    groupBy: 'match',
    outputMode: 'object',
    includeUnmatched: true,
    unmatchedKey: '__unmatched__',
    splitLines: true,
    jsonIntegrityPolicy: 'repair',
    ...overrides,
  }) as Parameters<typeof buildRegexPreview>[0];

describe('regex-node-config-preview helpers', () => {
  beforeEach(() => {
    mockState.logClientError.mockReset();
  });

  it('extracts fenced code snippets and normalizes regex flags', () => {
    expect(
      extractCodeSnippets('Before```ts\nconst foo = 1;\n```After```json\n{"ok":true}\n```')
    ).toEqual(['const foo = 1;', '{"ok":true}']);
    expect(normalizeRegexFlags('ymgimzgd')).toBe('dgimy');
  });

  it('parses regex literals and candidate formats', () => {
    expect(extractRegexLiteral('/foo\\/bar/miq')).toEqual({
      pattern: 'foo\\/bar',
      flags: 'mi',
    });
    expect(extractRegexLiteral('foo/bar')).toBeNull();

    expect(
      parseRegexCandidate('{"pattern":"(?<sku>SKU-\\\\d+)","flags":"miggm","groupBy":"sku"}')
    ).toEqual({
      pattern: '(?<sku>SKU-\\d+)',
      flags: 'gim',
      groupBy: 'sku',
    });
    expect(parseRegexCandidate('{"regex":"/SKU-(\\\\d+)/im"}')).toEqual({
      pattern: 'SKU-(\\d+)',
      flags: 'im',
    });
    expect(parseRegexCandidate('pattern: /ID-(\\\\d+)/gm\nflags: mi\ngroupBy: 1')).toEqual({
      pattern: 'ID-(\\\\d+)',
      flags: 'im',
      groupBy: '1',
    });
    expect(parseRegexCandidate('plain-pattern')).toEqual({
      pattern: 'plain-pattern',
      flags: '',
    });
  });

  it('logs malformed json candidates and falls back to raw pattern text', () => {
    expect(parseRegexCandidate('{"pattern":')).toEqual({
      pattern: '{"pattern":',
      flags: '',
    });
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
  });

  it('builds regex items from strings, arrays, and structured values', () => {
    expect(buildRegexItems(['alpha\nbeta', '', null], true)).toEqual(['alpha', 'beta']);
    expect(buildRegexItems([{ id: 1 }], false)).toEqual(['{\n  "id": 1\n}']);
    expect(buildRegexItems(undefined, true)).toEqual([]);
  });
});

describe('buildRegexPreview', () => {
  beforeEach(() => {
    mockState.logClientError.mockReset();
  });

  it('returns empty preview when regex validation fails', () => {
    expect(
      buildRegexPreview(buildRegexConfig({ outputMode: 'array' }), { ok: false, regex: null }, [
        'SKU-42',
      ])
    ).toEqual({
      matches: [],
      grouped: [],
      extracted: null,
    });
  });

  it('captures first overall match and records unmatched fallback', () => {
    const found = buildRegexPreview(
      buildRegexConfig({ matchMode: 'first_overall', groupBy: '1' }),
      { ok: true, regex: /SKU-(\d+)/ },
      ['ignore', 'SKU-42', 'SKU-99']
    );

    expect(found.matches).toHaveLength(1);
    expect(found.matches[0]).toMatchObject({
      input: 'SKU-42',
      match: 'SKU-42',
      captures: ['42'],
      key: '42',
      extracted: '42',
    });
    expect(found.grouped).toEqual({
      '42': [expect.objectContaining({ match: 'SKU-42' })],
    });

    const unmatched = buildRegexPreview(
      buildRegexConfig({ matchMode: 'first_overall' }),
      { ok: true, regex: /SKU-(\d+)/ },
      ['ignore']
    );

    expect(unmatched.matches).toEqual([
      expect.objectContaining({
        input: 'ignore',
        match: null,
        key: '__unmatched__',
      }),
    ]);
  });

  it('supports all-match previews including zero-length matches', () => {
    const preview = buildRegexPreview(
      buildRegexConfig({ pattern: '^', matchMode: 'all', outputMode: 'array' }),
      { ok: true, regex: /^/g },
      ['alpha']
    );

    expect(preview.matches).toHaveLength(1);
    expect(preview.matches[0]).toMatchObject({
      input: 'alpha',
      match: '',
      index: 0,
      captures: [],
      key: '',
    });
    expect(preview.grouped).toEqual([
      {
        key: '',
        items: [expect.objectContaining({ input: 'alpha', match: '' })],
      },
    ]);
  });

  it('parses extracted json values in repair mode', () => {
    const preview = buildRegexPreview(
      buildRegexConfig({
        mode: 'extract_json',
        groupBy: '1',
      }),
      { ok: true, regex: /payload:\s*(\{.*\})/ },
      ['payload: {"id":1,}']
    );

    expect(preview.matches[0]).toMatchObject({
      match: 'payload: {"id":1,}',
      captures: ['{"id":1,}'],
      key: '{"id":1,}',
      extracted: { id: 1 },
    });
    expect(preview.extracted).toEqual({ id: 1 });
  });

  it('parses extracted capture arrays and groups named matches', () => {
    const extracted = buildRegexPreview(
      buildRegexConfig({
        pattern: '(?<kind>SKU):(\\{"id":1,\\})',
        mode: 'extract_json',
        groupBy: 'captures',
      }),
      { ok: true, regex: /(?<kind>SKU):(\{"id":1,\})/ },
      ['SKU:{"id":1,}']
    );

    expect(extracted.matches[0]).toMatchObject({
      groups: { kind: 'SKU' },
      key: '["SKU","{\\"id\\":1,}"]',
      extracted: ['SKU', { id: 1 }],
    });
    expect(extracted.extracted).toEqual(['SKU', { id: 1 }]);

    const grouped = buildRegexPreview(
      buildRegexConfig({
        pattern: '(?<kind>SKU)-(?<id>\\d+)',
        groupBy: 'groups',
        outputMode: 'array',
        includeUnmatched: false,
      }),
      { ok: true, regex: /(?<kind>SKU)-(?<id>\d+)/ },
      ['SKU-42']
    );

    expect(grouped.matches[0]).toMatchObject({
      captures: ['SKU', '42'],
      groups: { kind: 'SKU', id: '42' },
      key: '{"kind":"SKU","id":"42"}',
    });
    expect(grouped.grouped).toEqual([
      {
        key: '{"kind":"SKU","id":"42"}',
        items: [expect.objectContaining({ match: 'SKU-42' })],
      },
    ]);
    expect(grouped.extracted).toBeNull();
  });

  it('keeps invalid extracted json unresolved in strict mode', () => {
    const preview = buildRegexPreview(
      buildRegexConfig({
        mode: 'extract_json',
        groupBy: '1',
        jsonIntegrityPolicy: 'strict',
      }),
      { ok: true, regex: /payload:\s*(\{.*\})/ },
      ['payload: {"id":1,}']
    );

    expect(preview.matches[0]).toMatchObject({
      extracted: '{"id":1,}',
    });
    expect(preview.extracted).toBe('{"id":1,}');
  });
});

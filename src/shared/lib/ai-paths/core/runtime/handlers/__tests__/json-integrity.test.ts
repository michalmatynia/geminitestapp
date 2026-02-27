import { describe, expect, it } from 'vitest';

import {
  normalizeJsonLikeValue,
  repairMalformedJsonLikeString,
} from '@/shared/lib/ai-paths/core/runtime/handlers/json-integrity';

describe('json-integrity helper', () => {
  it('parses valid JSON-like strings', () => {
    const input = '{"parameters":[{"parameterId":"p1","value":"metal"}]}';
    const normalized = normalizeJsonLikeValue(input, 'repair');

    expect(normalized.state).toBe('parsed');
    expect(normalized.value).toEqual({
      parameters: [{ parameterId: 'p1', value: 'metal' }],
    });
  });

  it('repairs malformed object-boundary payloads when repair mode is enabled', () => {
    const malformed =
      '{"parameters":[{"parameterId":"p1","value":"v1","valuesByLanguage":{"pl":"x"},{"parameterId":"p2","value":"v2","valuesByLanguage":{"pl":"y"}}]}';

    const repairedText = repairMalformedJsonLikeString(malformed);
    expect(repairedText).not.toBe(malformed);

    const normalized = normalizeJsonLikeValue(malformed, 'repair');
    expect(normalized.state).toBe('repaired');
    expect(normalized.diagnostic.repairSteps).toEqual(
      expect.arrayContaining(['repair_object_boundaries'])
    );
    expect(normalized.value).toEqual({
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
  });

  it('repairs truncated JSON payloads by appending missing container closers', () => {
    const truncated =
      '{"parameters":[{"parameterId":"p1","value":"v1"},{"parameterId":"p2","value":"v2"}';

    const normalized = normalizeJsonLikeValue(truncated, 'repair');
    expect(normalized.state).toBe('repaired');
    expect(normalized.diagnostic.truncationDetected).toBe(true);
    expect(normalized.diagnostic.repairSteps).toEqual(
      expect.arrayContaining(['append_missing_container_closers'])
    );
    expect(normalized.value).toEqual({
      parameters: [
        { parameterId: 'p1', value: 'v1' },
        { parameterId: 'p2', value: 'v2' },
      ],
    });
  });

  it('repairs markdown fenced JSON payloads in repair mode', () => {
    const fenced = `\`\`\`json
{"parameters":[{"parameterId":"p1","value":"v1"}]}
\`\`\``;

    const normalized = normalizeJsonLikeValue(fenced, 'repair');
    expect(normalized.state).toBe('repaired');
    expect(normalized.diagnostic.repairSteps).toEqual(
      expect.arrayContaining(['strip_markdown_code_fences'])
    );
    expect(normalized.value).toEqual({
      parameters: [{ parameterId: 'p1', value: 'v1' }],
    });
  });

  it('keeps malformed payload unresolved in strict mode', () => {
    const malformed = '{"parameters":[{"parameterId":"p1"},{"parameterId":"p2"}';
    const normalized = normalizeJsonLikeValue(malformed, 'strict');

    expect(normalized.state).toBe('unparseable');
    expect(normalized.value).toBe(malformed);
    expect(normalized.diagnostic.parseState).toBe('unparseable');
    expect(normalized.diagnostic.repairApplied).toBe(false);
    expect(normalized.diagnostic.parseError).toBeDefined();
    expect(normalized.diagnostic.truncationDetected).toBe(true);
  });
});

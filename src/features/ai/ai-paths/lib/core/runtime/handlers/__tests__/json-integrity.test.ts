import { describe, expect, it } from 'vitest';

import {
  normalizeJsonLikeValue,
  repairMalformedJsonLikeString,
} from '@/features/ai/ai-paths/lib/core/runtime/handlers/json-integrity';

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

  it('keeps malformed payload unresolved in strict mode', () => {
    const malformed = '{"parameters":[{"parameterId":"p1"},{"parameterId":"p2"}';
    const normalized = normalizeJsonLikeValue(malformed, 'strict');

    expect(normalized.state).toBe('unparseable');
    expect(normalized.value).toBe(malformed);
    expect(normalized.diagnostic.parseState).toBe('unparseable');
    expect(normalized.diagnostic.repairApplied).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { getValueAtMappingPath } from '@/shared/lib/ai-paths/core/utils/json';

describe('getValueAtMappingPath', () => {
  it('resolves nested paths from JSON-string intermediate values', () => {
    const context = {
      result: '{"parameters":[{"parameterId":"param-1","value":"metal"}]}',
    };

    expect(getValueAtMappingPath(context, 'result.parameters[0].parameterId')).toBe('param-1');
    expect(getValueAtMappingPath(context, 'result.parameters[0].value')).toBe('metal');
  });

  it('does not coerce non-JSON strings', () => {
    const context = {
      result: 'plain-text',
    };

    expect(getValueAtMappingPath(context, 'result.parameters')).toBeUndefined();
  });

  it('resolves object paths from array inputs by selecting first matching entry', () => {
    const context = {
      result: ['not-json', '{"parameters":[{"parameterId":"param-2","value":"acrylic"}]}'],
    };

    expect(getValueAtMappingPath(context, 'result.parameters[0].parameterId')).toBe('param-2');
    expect(getValueAtMappingPath(context, 'result.parameters[0].value')).toBe('acrylic');
  });

  it('repairs common malformed nested-object JSON before path traversal', () => {
    const context = {
      result:
        '{"parameters":[{"parameterId":"p1","value":"v1","valuesByLanguage":{"pl":"x"},{"parameterId":"p2","value":"v2","valuesByLanguage":{"pl":"y"}}]}',
    };

    expect(getValueAtMappingPath(context, 'result.parameters[0].parameterId')).toBe('p1');
    expect(getValueAtMappingPath(context, 'result.parameters[1].value')).toBe('v2');
  });
});

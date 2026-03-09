import { describe, expect, it } from 'vitest';

import {
  decodeSimpleParameterStorageId,
  encodeSimpleParameterStorageId,
  mergeProductParameterValues,
  splitProductParameterValues,
} from './parameter-partition';

describe('parameter-partition', () => {
  it('splitProductParameterValues keeps localized sibling values and drops stale scalar fallback', () => {
    const result = splitProductParameterValues([
      {
        parameterId: 'condition',
        value: 'Used',
        valuesByLanguage: { pl: 'Uzywany' },
      },
    ]);

    expect(result).toEqual({
      customFieldValues: [
        {
          parameterId: 'condition',
          value: '',
          valuesByLanguage: { pl: 'Uzywany' },
        },
      ],
      simpleParameterValues: [],
    });
  });

  it('mergeProductParameterValues preserves locale separation for custom field values', () => {
    const result = mergeProductParameterValues({
      customFieldValues: [
        {
          parameterId: 'condition',
          value: 'Used',
          valuesByLanguage: { pl: 'Uzywany' },
        },
      ],
      simpleParameterValues: [],
    });

    expect(result).toEqual([
      {
        parameterId: 'condition',
        value: '',
        valuesByLanguage: { pl: 'Uzywany' },
      },
    ]);
  });

  it('mergeProductParameterValues still encodes simple parameter ids', () => {
    const result = mergeProductParameterValues({
      customFieldValues: [],
      simpleParameterValues: [
        {
          parameterId: 'size',
          value: 'L',
        },
      ],
    });

    expect(result).toEqual([
      {
        parameterId: encodeSimpleParameterStorageId('size'),
        value: 'L',
      },
    ]);
    expect(decodeSimpleParameterStorageId(result[0]?.parameterId ?? '')).toBe('size');
  });
});

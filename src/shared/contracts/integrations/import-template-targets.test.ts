import { describe, expect, it } from 'vitest';

import {
  buildProductCustomFieldOptionTargetValue,
  buildProductCustomFieldTargetValue,
  parseProductCustomFieldTarget,
} from './import-template-targets';

describe('import-template custom field targets', () => {
  it('builds and parses text custom field targets', () => {
    const target = buildProductCustomFieldTargetValue('notes');

    expect(target).toBe('custom_field:notes');
    expect(parseProductCustomFieldTarget(target)).toEqual({
      fieldId: 'notes',
      optionId: null,
    });
  });

  it('builds and parses checkbox-set option targets', () => {
    const target = buildProductCustomFieldOptionTargetValue('market-exclusion', 'tradera');

    expect(target).toBe('custom_field_option:market-exclusion:tradera');
    expect(parseProductCustomFieldTarget(target)).toEqual({
      fieldId: 'market-exclusion',
      optionId: 'tradera',
    });
  });

  it('preserves the full option payload when option ids contain colons', () => {
    expect(parseProductCustomFieldTarget('custom_field_option:flags:market:de')).toEqual({
      fieldId: 'flags',
      optionId: 'market:de',
    });
  });

  it('rejects invalid targets', () => {
    expect(parseProductCustomFieldTarget('')).toBeNull();
    expect(parseProductCustomFieldTarget('custom_field:')).toBeNull();
    expect(parseProductCustomFieldTarget('parameter:notes')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildProductCustomFieldTargetOptions,
  EXPORT_PARAMETER_DOCS,
  EXPORT_PARAMETER_KEYS,
} from './constants';

describe('export template field options', () => {
  it('exposes manufacturer_id as the canonical producer export field', () => {
    expect(EXPORT_PARAMETER_KEYS).toContain('manufacturer_id');
    expect(
      EXPORT_PARAMETER_DOCS.find((entry) => entry.key === 'manufacturer_id')?.description
    ).toContain('Canonical Base.com manufacturer identifier');
  });

  it('omits redundant producer compatibility aliases from the export template option list', () => {
    expect(EXPORT_PARAMETER_KEYS).not.toContain('producer');
    expect(EXPORT_PARAMETER_KEYS).not.toContain('producer_id');
    expect(EXPORT_PARAMETER_KEYS).not.toContain('producer_ids');

    expect(EXPORT_PARAMETER_DOCS.some((entry) => entry.key === 'producer')).toBe(false);
    expect(EXPORT_PARAMETER_DOCS.some((entry) => entry.key === 'producer_id')).toBe(false);
    expect(EXPORT_PARAMETER_DOCS.some((entry) => entry.key === 'producer_ids')).toBe(false);
  });
});

describe('buildProductCustomFieldTargetOptions', () => {
  it('builds text and checkbox-set import target options', () => {
    const result = buildProductCustomFieldTargetOptions([
      {
        id: 'notes',
        name: 'Internal Notes',
        type: 'text',
        options: [],
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'market-exclusion',
        name: 'Market Exclusion',
        type: 'checkbox_set',
        options: [
          { id: 'tradera', label: 'Tradera' },
          { id: 'vinted', label: 'Vinted' },
        ],
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
    ]);

    expect(result).toEqual([
      {
        value: 'custom_field:notes',
        label: 'Custom field: Internal Notes',
      },
      {
        value: 'custom_field_option:market-exclusion:tradera',
        label: 'Checkbox: Market Exclusion -> Tradera',
      },
      {
        value: 'custom_field_option:market-exclusion:vinted',
        label: 'Checkbox: Market Exclusion -> Vinted',
      },
    ]);
  });
});

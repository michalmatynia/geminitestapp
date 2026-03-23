import { describe, expect, it } from 'vitest';

import { EXPORT_PARAMETER_DOCS, EXPORT_PARAMETER_KEYS } from './constants';

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

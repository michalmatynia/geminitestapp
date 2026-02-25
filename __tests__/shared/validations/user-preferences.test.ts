import { describe, expect, it } from 'vitest';

import {
  normalizeUserPreferencesResponse,
  parseUserPreferencesUpdatePayload,
} from '@/shared/validations/user-preferences';

describe('user preferences validations', () => {
  it('normalizes applied advanced filter update fields', () => {
    const payload = parseUserPreferencesUpdatePayload({
      productListAppliedAdvancedFilter: '  {"type":"group"}  ',
      productListAppliedAdvancedFilterPresetId: ' preset-1 ',
    });

    expect(payload).toMatchObject({
      productListAppliedAdvancedFilter: '{"type":"group"}',
      productListAppliedAdvancedFilterPresetId: 'preset-1',
    });
  });

  it('normalizes empty applied advanced filter fields to null', () => {
    const payload = parseUserPreferencesUpdatePayload({
      productListAppliedAdvancedFilter: '   ',
      productListAppliedAdvancedFilterPresetId: '   ',
    });

    expect(payload).toMatchObject({
      productListAppliedAdvancedFilter: null,
      productListAppliedAdvancedFilterPresetId: null,
    });
  });

  it('accepts applied advanced filter fields in response payload', () => {
    const payload = normalizeUserPreferencesResponse({
      productListNameLocale: 'name_en',
      productListAppliedAdvancedFilter: '{"type":"group"}',
      productListAppliedAdvancedFilterPresetId: 'preset-1',
    });

    expect(payload).toMatchObject({
      productListAppliedAdvancedFilter: '{"type":"group"}',
      productListAppliedAdvancedFilterPresetId: 'preset-1',
    });
  });
});

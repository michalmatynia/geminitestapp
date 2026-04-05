import { describe, expect, it } from 'vitest';

import {
  buildManualProductSyncRunInput,
  requireProductSyncRunProfileId,
} from './handler.helpers';

describe('product-sync profile run handler helpers', () => {
  it('requires a trimmed profile id', () => {
    expect(requireProductSyncRunProfileId({ id: ' profile-1 ' })).toBe('profile-1');
    expect(() => requireProductSyncRunProfileId({ id: '' })).toThrow('Invalid route parameters');
  });

  it('builds the manual run starter input', () => {
    expect(buildManualProductSyncRunInput('profile-1')).toEqual({
      profileId: 'profile-1',
      trigger: 'manual',
    });
  });
});

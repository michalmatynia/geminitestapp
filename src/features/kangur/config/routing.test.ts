import { describe, expect, it } from 'vitest';

import { getKangurPageHref, resolveKangurPageKeyFromSlug } from '@/features/kangur/config/routing';

describe('kangur routing config', () => {
  it('maps learner profile to profile slug', () => {
    expect(getKangurPageHref('LearnerProfile')).toBe('/kangur/profile');
    expect(resolveKangurPageKeyFromSlug('profile')).toBe('LearnerProfile');
    expect(resolveKangurPageKeyFromSlug('PROFILE')).toBe('LearnerProfile');
  });
});

import { describe, expect, it } from 'vitest';

import { getAppEmbedOption } from '@/features/app-embeds/lib/constants';

describe('getAppEmbedOption invalid inputs', () => {
  it('returns null for missing app embed ids', () => {
    expect(getAppEmbedOption(undefined)).toBeNull();
    expect(getAppEmbedOption(null)).toBeNull();
    expect(getAppEmbedOption('')).toBeNull();
    expect(getAppEmbedOption('   ')).toBeNull();
  });

  it('returns null for unknown app embed ids', () => {
    expect(getAppEmbedOption('unknown-app')).toBeNull();
  });
});

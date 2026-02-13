import { describe, expect, it } from 'vitest';

import { readMeta } from '@/features/ai/image-studio/utils/metadata';

describe('readMeta', () => {
  it('returns empty object for null metadata', () => {
    expect(readMeta({ metadata: null })).toEqual({});
  });

  it('returns empty object for missing metadata property', () => {
    // With exactOptionalPropertyTypes, omitting the key is the correct way to test undefined
    const slot: { metadata?: Record<string, unknown> | null | undefined } = {};
    expect(readMeta(slot)).toEqual({});
  });

  it('returns empty object for non-object metadata', () => {
    // @ts-expect-error — testing invalid input
    expect(readMeta({ metadata: 'string' })).toEqual({});
  });

  it('returns metadata as-is for valid object', () => {
    const metadata = {
      role: 'generation',
      sourceSlotId: 'abc',
      generationParams: { prompt: 'test prompt', model: 'gpt-4o' },
    };
    expect(readMeta({ metadata })).toEqual(metadata);
  });

  it('returns empty object when metadata is missing', () => {
    expect(readMeta({})).toEqual({});
  });
});

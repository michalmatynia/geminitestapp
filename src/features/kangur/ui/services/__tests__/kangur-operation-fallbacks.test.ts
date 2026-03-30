import { describe, expect, it } from 'vitest';

import { resolveKangurOperationFallbackInfo } from '@/features/kangur/ui/services/kangur-operation-fallbacks';

describe('resolveKangurOperationFallbackInfo', () => {
  it('keeps comparatives and superlatives fallback labels aligned across locales', () => {
    expect(resolveKangurOperationFallbackInfo('english_comparatives_superlatives', 'pl')).toEqual({
      emoji: '👑',
      label: 'Stopniowanie przymiotników',
    });

    expect(resolveKangurOperationFallbackInfo('english_comparatives_superlatives', 'en')).toEqual({
      emoji: '👑',
      label: 'Comparatives & Superlatives',
    });

    expect(resolveKangurOperationFallbackInfo('english_comparatives_superlatives', 'de')).toEqual({
      emoji: '👑',
      label: 'Komparativ und Superlativ',
    });
  });
});

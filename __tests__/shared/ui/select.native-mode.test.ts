import { describe, expect, it } from 'vitest';

import { shouldUseNativeSelectMode } from '@/shared/ui/select';

describe('shouldUseNativeSelectMode', () => {
  it('enables native mode for image studio routes', () => {
    expect(shouldUseNativeSelectMode('/admin/image-studio')).toBe(true);
    expect(shouldUseNativeSelectMode('/admin/image-studio/settings')).toBe(true);
  });

  it('enables native mode for AI paths queue routes', () => {
    expect(shouldUseNativeSelectMode('/admin/ai-paths/queue')).toBe(true);
    expect(shouldUseNativeSelectMode('/admin/ai-paths/queue?tab=paths')).toBe(true);
  });

  it('keeps radix mode for other routes', () => {
    expect(shouldUseNativeSelectMode('/admin/products')).toBe(false);
    expect(shouldUseNativeSelectMode('/')).toBe(false);
    expect(shouldUseNativeSelectMode(undefined)).toBe(false);
  });
});


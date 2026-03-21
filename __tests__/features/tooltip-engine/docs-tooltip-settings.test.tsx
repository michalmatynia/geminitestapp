import { act, renderHook } from '@/__tests__/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readDocsTooltipsEnabled,
  useDocsTooltipsSetting,
} from '@/features/tooltip-engine/docs-tooltip-settings';

describe('docs-tooltip-settings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('falls back to default when localStorage read throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(readDocsTooltipsEnabled('docs-key', false)).toBe(false);
    expect(readDocsTooltipsEnabled('docs-key', true)).toBe(true);
  });

  it('updates local state even when localStorage write throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => useDocsTooltipsSetting('docs-key', false));

    expect(result.current.enabled).toBe(false);

    act(() => {
      result.current.setEnabled(true);
    });

    expect(result.current.enabled).toBe(true);
  });
});

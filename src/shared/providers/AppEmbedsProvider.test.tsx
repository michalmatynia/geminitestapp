// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastMock = vi.fn();
const useSettingsMapMock = vi.fn();
const mutateAsyncMock = vi.fn();

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => useSettingsMapMock(),
  useUpdateSetting: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
}));

import { APP_EMBED_SETTING_KEY } from '@/shared/lib/app-embeds';
import { AppEmbedsProvider, useAppEmbeds } from './AppEmbedsProvider';

describe('AppEmbedsProvider', () => {
  beforeEach(() => {
    toastMock.mockReset();
    mutateAsyncMock.mockReset();
    useSettingsMapMock.mockReturnValue({
      data: new Map<string, string>(),
      isLoading: false,
    });
  });

  it('throws when the hook is used outside the provider', () => {
    expect(() => renderHook(() => useAppEmbeds())).toThrow(
      'useAppEmbeds must be used within AppEmbedsProvider'
    );
  });

  it('exposes embed state and saves the updated selection', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppEmbedsProvider>{children}</AppEmbedsProvider>
    );

    const { result } = renderHook(() => useAppEmbeds(), { wrapper });

    expect(result.current.enabled.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSaving).toBe(false);

    act(() => {
      result.current.toggleOption('gallery', true);
    });

    expect(result.current.enabled.has('gallery')).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      key: APP_EMBED_SETTING_KEY,
      value: '["gallery"]',
    });
    expect(toastMock).toHaveBeenCalledWith('App embed settings saved.', {
      variant: 'success',
    });
  });
});

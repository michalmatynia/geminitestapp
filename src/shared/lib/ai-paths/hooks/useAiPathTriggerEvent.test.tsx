import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useQueryClientMock, toastMock } = vi.hoisted(() => ({
  useQueryClientMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query'
  );
  return {
    ...actual,
    useQueryClient: () => useQueryClientMock(),
  };
});

vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui')>('@/shared/ui');
  return {
    ...actual,
    useToast: () => ({
      toast: toastMock,
    }),
  };
});

import {
  resolveCurrentActivePathId,
  useAiPathTriggerEvent,
} from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';

describe('resolveCurrentActivePathId', () => {
  it('prefers the query-backed active path id when available', () => {
    expect(
      resolveCurrentActivePathId({
        preferredActivePathId: ' path-query ',
        uiState: { activePathId: 'path-ui' },
      })
    ).toBe('path-query');
  });

  it('falls back to AI Paths ui state when query-backed active path id is absent', () => {
    expect(
      resolveCurrentActivePathId({
        preferredActivePathId: null,
        uiState: { activePathId: ' path-ui ' },
      })
    ).toBe('path-ui');
  });

  it('returns null when neither source has an active path id', () => {
    expect(
      resolveCurrentActivePathId({
        preferredActivePathId: '   ',
        uiState: { activePathId: '   ' },
      })
    ).toBeNull();
  });
});

describe('useAiPathTriggerEvent', () => {
  it('shows an error toast and exits when the trigger id is empty', async () => {
    useQueryClientMock.mockReturnValue({
      getQueryData: vi.fn(),
    });

    const { result } = renderHook(() => useAiPathTriggerEvent());

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        triggerEventId: '   ',
      } as never);
    });

    expect(toastMock).toHaveBeenCalledWith('Missing trigger id.', { variant: 'error' });
  });
});

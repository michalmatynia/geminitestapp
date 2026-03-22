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

import { useAiPathTriggerEvent } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';

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

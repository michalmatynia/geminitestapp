/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKangurAiTutorGuestIntroFlow } from './KangurAiTutorWidget.entry';

import type { MutableRefObject } from 'react';

type GuestIntroFlowInput = Parameters<typeof useKangurAiTutorGuestIntroFlow>[0];

const createDeferred = <T,>() => {
  let resolve: ((value: T | PromiseLike<T>) => void) | null = null;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolve?.(value);
    },
  };
};

const createGuestIntroFlowInput = (
  overrides: Partial<GuestIntroFlowInput> = {}
): GuestIntroFlowInput => ({
  authState: {
    isAuthenticated: false,
    isLoadingAuth: false,
  },
  canonicalTutorModalVisible: false,
  enabled: true,
  guestIntroCheckStartedRef: { current: false } as MutableRefObject<boolean>,
  guestAuthFormVisible: false,
  guestIntroHelpVisible: false,
  guestIntroLocalSuppressionTrackedRef: { current: false } as MutableRefObject<boolean>,
  guestIntroRecord: null,
  guestIntroShownForCurrentEntryRef: { current: false } as MutableRefObject<boolean>,
  guestIntroVisible: false,
  contextualTutorMode: null,
  guidedTutorTarget: null,
  handleCloseChat: vi.fn(),
  handleOpenChat: vi.fn(),
  isOpen: false,
  isTutorHidden: false,
  mounted: true,
  selectionGuidanceHandoffText: null,
  selectionExplainTimeoutRef: { current: null } as MutableRefObject<number | null>,
  selectionResponsePending: null,
  setCanonicalTutorModalVisible: vi.fn(),
  setGuestAuthFormVisible: vi.fn(),
  setGuidedTutorTarget: vi.fn(),
  setGuestIntroHelpVisible: vi.fn(),
  setGuestIntroRecord: vi.fn(),
  setGuestIntroVisible: vi.fn(),
  setHasNewMessage: vi.fn(),
  shouldRepeatGuestIntroOnEntry: false,
  suppressAvatarClickRef: { current: false } as MutableRefObject<boolean>,
  ...overrides,
});

describe('useKangurAiTutorGuestIntroFlow', () => {
  it('clears stale guest intro flags once auth resolves as authenticated without clearing the explicit minimalist modal', async () => {
    const input = createGuestIntroFlowInput({
      authState: {
        isAuthenticated: true,
        isLoadingAuth: false,
      },
      canonicalTutorModalVisible: true,
      guestIntroVisible: true,
      guestIntroHelpVisible: true,
    });

    renderHook(() => useKangurAiTutorGuestIntroFlow(input));

    await waitFor(() => {
      expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
      expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
    });

    expect(input.setCanonicalTutorModalVisible).not.toHaveBeenCalled();
  });

  it('opens the chat and shows the inline auth fields after accepting the guest intro', () => {
    const input = createGuestIntroFlowInput();

    const { result } = renderHook(() => useKangurAiTutorGuestIntroFlow(input));

    result.current.handleGuestIntroAccept();

    expect(input.handleOpenChat).toHaveBeenCalledWith('toggle');
    expect(input.setGuestAuthFormVisible).toHaveBeenCalledWith(true);
    expect(input.setGuidedTutorTarget).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
  });

  it('ignores a late guest-intro response once selection guidance has taken over', async () => {
    const deferredPayload = createDeferred<{
      reason: string;
      shouldShow: boolean;
    }>();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockReturnValue(deferredPayload.promise),
    });
    vi.stubGlobal('fetch', fetchMock);

    const input = createGuestIntroFlowInput();
    const { rerender } = renderHook(
      ({ currentInput }: { currentInput: GuestIntroFlowInput }) =>
        useKangurAiTutorGuestIntroFlow(currentInput),
      {
        initialProps: { currentInput: input },
      }
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/guest-intro', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
    );

    rerender({
      currentInput: {
        ...input,
        contextualTutorMode: 'selection_explain',
        guidedTutorTarget: {
          mode: 'selection',
          kind: 'selection_excerpt',
          selectedText: '2 + 2',
        },
        selectionResponsePending: {
          selectedText: '2 + 2',
        },
      },
    });

    await act(async () => {
      deferredPayload.resolve({
        reason: 'first_visit',
        shouldShow: true,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroVisible).not.toHaveBeenCalledWith(true);
    expect(input.setGuestIntroRecord).not.toHaveBeenCalled();
  });
});

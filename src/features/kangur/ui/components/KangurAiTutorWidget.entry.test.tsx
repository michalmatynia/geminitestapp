/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@/__tests__/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { useKangurAiTutorGuestIntroFlow } from './KangurAiTutorWidget.entry';

import type { MutableRefObject } from 'react';

type GuestIntroFlowInput = Parameters<typeof useKangurAiTutorGuestIntroFlow>[0];

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

  it('opens the chat and closes the guest intro after accepting the guest intro', () => {
    const input = createGuestIntroFlowInput();

    const { result } = renderHook(() => useKangurAiTutorGuestIntroFlow(input));

    result.current.handleGuestIntroAccept();

    expect(input.handleOpenChat).toHaveBeenCalledWith('toggle');
    expect(input.setGuestAuthFormVisible).not.toHaveBeenCalled();
    expect(input.setGuidedTutorTarget).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
  });

  it('closes the chat when the guest intro is accepted silently while the panel is open', () => {
    const input = createGuestIntroFlowInput({ isOpen: true });

    const { result } = renderHook(() => useKangurAiTutorGuestIntroFlow(input));

    result.current.handleGuestIntroAcceptSilent();

    expect(input.handleCloseChat).toHaveBeenCalledWith('toggle');
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
  });

  it('does not request the guest intro on first visit when auto-open is disabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, shouldShow: true, reason: 'first_visit' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const input = createGuestIntroFlowInput();
    renderHook(() => useKangurAiTutorGuestIntroFlow(input));

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(input.setGuestIntroVisible).not.toHaveBeenCalledWith(true);
  });
});

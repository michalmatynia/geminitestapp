/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
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
  it('clears stale guest intro state once auth resolves as authenticated', async () => {
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
      expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(false);
      expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
      expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
    });
  });
});

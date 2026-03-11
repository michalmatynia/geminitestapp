/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MutableRefObject } from 'react';

type AvatarShellInput = Parameters<
  typeof import('./KangurAiTutorWidget.avatar-shell').useKangurAiTutorAvatarShellActions
>[0];

let useKangurAiTutorAvatarShellActions: typeof import('./KangurAiTutorWidget.avatar-shell').useKangurAiTutorAvatarShellActions;

const createAvatarShellInput = (
  overrides: Partial<AvatarShellInput> = {}
): AvatarShellInput => ({
  canonicalTutorModalVisible: false,
  closeChat: vi.fn(),
  guestIntroHelpVisible: false,
  guestIntroVisible: false,
  guidedMode: null,
  guidedTutorTarget: null,
  handleCloseChat: vi.fn(),
  handleCloseLauncherPrompt: vi.fn(),
  handleHomeOnboardingFinishEarly: vi.fn(),
  handleOpenChat: vi.fn(),
  homeOnboardingStepIndex: null,
  isAnonymousVisitor: true,
  isOpen: false,
  launcherPromptVisible: false,
  persistSelectionContext: vi.fn().mockReturnValue(null),
  selectionExplainTimeoutRef: { current: null } as MutableRefObject<number | null>,
  setCanonicalTutorModalVisible: vi.fn(),
  setContextualTutorMode: vi.fn(),
  setDraggedAvatarPoint: vi.fn() as AvatarShellInput['setDraggedAvatarPoint'],
  setGuestIntroHelpVisible: vi.fn(),
  setGuestIntroVisible: vi.fn(),
  setGuidedTutorTarget: vi.fn() as AvatarShellInput['setGuidedTutorTarget'],
  setHighlightedSection: vi.fn() as AvatarShellInput['setHighlightedSection'],
  setHoveredSectionAnchorId: vi.fn(),
  setSectionResponseComplete: vi.fn() as AvatarShellInput['setSectionResponseComplete'],
  setSectionResponsePending: vi.fn() as AvatarShellInput['setSectionResponsePending'],
  setSelectionResponseComplete: vi.fn() as AvatarShellInput['setSelectionResponseComplete'],
  setSelectionResponsePending: vi.fn() as AvatarShellInput['setSelectionResponsePending'],
  setSelectionGuidanceHandoffText: vi.fn(),
  startGuidedSelectionExplanation: vi.fn(),
  suppressAvatarClickRef: { current: false } as MutableRefObject<boolean>,
  ...overrides,
});

describe('useKangurAiTutorAvatarShellActions', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.resetModules();
    ({ useKangurAiTutorAvatarShellActions } = await import('./KangurAiTutorWidget.avatar-shell'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reopens the minimalist modal when the tutor is already open', () => {
    const input = createAvatarShellInput({
      canonicalTutorModalVisible: true,
      guestIntroHelpVisible: true,
      guestIntroVisible: true,
      isOpen: true,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.closeChat).toHaveBeenCalled();
    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(true);
    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
  });

  it('opens the minimalist modal for a closed tutor instead of reopening the regular panel', () => {
    const input = createAvatarShellInput({
      canonicalTutorModalVisible: true,
      guestIntroVisible: true,
      isOpen: false,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).not.toHaveBeenCalled();
    expect(input.setGuestIntroVisible).not.toHaveBeenCalled();
    expect(input.setGuestIntroHelpVisible).not.toHaveBeenCalled();
  });

  it('ignores avatar clicks while a minimalist modal is already visible', () => {
    const input = createAvatarShellInput({
      canonicalTutorModalVisible: true,
      guestIntroVisible: true,
      isOpen: false,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).not.toHaveBeenCalled();
    expect(input.setGuestIntroVisible).not.toHaveBeenCalled();
    expect(input.setGuestIntroHelpVisible).not.toHaveBeenCalled();
  });

  it('opens the regular tutor panel for an authenticated visitor when the avatar is docked', () => {
    const input = createAvatarShellInput({
      isAnonymousVisitor: false,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleOpenChat).toHaveBeenCalledWith('toggle');
    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).not.toHaveBeenCalled();
  });

  it('closes the regular tutor panel for an authenticated visitor when it is already open', () => {
    const input = createAvatarShellInput({
      isAnonymousVisitor: false,
      isOpen: true,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).toHaveBeenCalledWith('toggle');
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).not.toHaveBeenCalled();
  });
});

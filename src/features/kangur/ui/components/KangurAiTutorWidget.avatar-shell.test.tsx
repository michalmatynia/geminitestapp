/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MutableRefObject } from 'react';
import { useKangurAiTutorAvatarShellActions } from './KangurAiTutorWidget.avatar-shell';

type AvatarShellInput = Parameters<typeof useKangurAiTutorAvatarShellActions>[0];

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
  isAnonymousVisitor: false,
  isOpen: false,
  launcherPromptVisible: false,
  persistSelectionContext: vi.fn().mockReturnValue(null),
  selectionExplainTimeoutRef: { current: null } as MutableRefObject<number | null>,
  selectionGuidanceRevealTimeoutRef: { current: null } as MutableRefObject<number | null>,
  setCanonicalTutorModalVisible: vi.fn(),
  setContextualTutorMode: vi.fn(),
  setDraggedAvatarPoint: vi.fn() as AvatarShellInput['setDraggedAvatarPoint'],
  setGuestAuthFormVisible: vi.fn(),
  setGuestIntroHelpVisible: vi.fn(),
  setGuestIntroVisible: vi.fn(),
  setGuidedTutorTarget: vi.fn() as AvatarShellInput['setGuidedTutorTarget'],
  setHighlightedSection: vi.fn() as AvatarShellInput['setHighlightedSection'],
  setHoveredSectionAnchorId: vi.fn(),
  setSectionResponseComplete: vi.fn() as AvatarShellInput['setSectionResponseComplete'],
  setSectionResponsePending: vi.fn() as AvatarShellInput['setSectionResponsePending'],
  setSelectionGuidanceCalloutVisibleText: vi.fn(),
  setSelectionResponseComplete: vi.fn() as AvatarShellInput['setSelectionResponseComplete'],
  setSelectionResponsePending: vi.fn() as AvatarShellInput['setSelectionResponsePending'],
  setSelectionGuidanceHandoffText: vi.fn(),
  startGuidedSelectionExplanation: vi.fn(),
  suppressAvatarClickRef: { current: false } as MutableRefObject<boolean>,
  ...overrides,
});

describe('useKangurAiTutorAvatarShellActions', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('hides the minimalist modal when avatar is clicked while it is already open for an authenticated learner', () => {
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

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
  });

  it('opens the minimalist modal when authenticated avatar is clicked while it is closed', () => {
    const input = createAvatarShellInput({
      canonicalTutorModalVisible: false,
      isAnonymousVisitor: false,
      isOpen: false,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(true);
  });

  it('hides the anonymous onboarding modal when the avatar is clicked again', () => {
    const input = createAvatarShellInput({
      canonicalTutorModalVisible: true,
      guestIntroVisible: true,
      isAnonymousVisitor: true,
      isOpen: false,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
  });

  it('hides the visible anonymous onboarding modal instead of reopening any other surface', () => {
    const input = createAvatarShellInput({
      canonicalTutorModalVisible: true,
      guestIntroVisible: true,
      isAnonymousVisitor: true,
      isOpen: false,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
  });

  it('opens the minimalist modal for authenticated avatar clicks', () => {
    const input = createAvatarShellInput({
      canonicalTutorModalVisible: false,
      guestIntroHelpVisible: false,
      guestIntroVisible: false,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(true);
  });

  it('opens canonical onboarding for anonymous avatar clicks', () => {
    const input = createAvatarShellInput({
      isAnonymousVisitor: true,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(true);
  });

  it('finishes home onboarding and opens the minimalist modal for authenticated avatar clicks', () => {
    const input = createAvatarShellInput({
      homeOnboardingStepIndex: 0,
      isAnonymousVisitor: false,
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleHomeOnboardingFinishEarly).toHaveBeenCalled();
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(true);
  });

  it('cancels selection guided mode and opens the minimalist modal on avatar click', () => {
    const input = createAvatarShellInput({
      guidedTutorTarget: {
        mode: 'selection',
        kind: 'selection_excerpt',
        selectedText: '2 + 2',
      },
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setGuidedTutorTarget).toHaveBeenCalledWith(null);
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(true);
    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
  });

  it('cancels section guided mode and opens the minimalist modal on avatar click', () => {
    const input = createAvatarShellInput({
      guidedTutorTarget: {
        mode: 'section',
        anchorId: 'intro',
        kind: 'lesson_header',
        label: 'Introduction',
        surface: 'lesson',
      },
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAvatarClick();
    });

    expect(input.handleCloseChat).not.toHaveBeenCalled();
    expect(input.handleOpenChat).not.toHaveBeenCalled();
    expect(input.setGuidedTutorTarget).toHaveBeenCalledWith(null);
    expect(input.setCanonicalTutorModalVisible).toHaveBeenCalledWith(true);
    expect(input.setGuestIntroVisible).toHaveBeenCalledWith(false);
    expect(input.setGuestIntroHelpVisible).toHaveBeenCalledWith(false);
  });

  it('closes the currently open tutor surface before starting Zapytaj o to guidance', () => {
    const input = createAvatarShellInput({
      isOpen: true,
      persistSelectionContext: vi.fn().mockReturnValue('2 + 2'),
    });

    const { result } = renderHook(() => useKangurAiTutorAvatarShellActions(input));

    act(() => {
      result.current.handleAskAbout();
    });

    expect(input.closeChat).toHaveBeenCalledTimes(1);
    expect(input.startGuidedSelectionExplanation).toHaveBeenCalledWith('2 + 2');
  });
});

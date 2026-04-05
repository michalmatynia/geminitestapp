/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

import {
  KangurAiTutorPanelBodyProvider,
  type KangurAiTutorPanelBodyContextValue,
} from './KangurAiTutorPanelBody.context';
import { KangurAiTutorGuestIntroPanel } from './KangurAiTutorGuestIntroPanel';
import {
  KangurAiTutorWidgetStateProvider,
} from './ai-tutor-widget/KangurAiTutorWidget.state';

import type { KangurAiTutorWidgetState } from './ai-tutor-widget/KangurAiTutorWidget.state';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => DEFAULT_KANGUR_AI_TUTOR_CONTENT,
}));

function createWidgetState(): KangurAiTutorWidgetState {
  return {
    askModalDockStyle: null,
    askModalVisible: false,
    canonicalTutorModalVisible: false,
    contextualTutorMode: null,
    draggedAvatarPoint: null,
    guestAuthFormVisible: false,
    guestIntroCheckStartedRef: createRef() as React.MutableRefObject<boolean>,
    guestIntroHelpVisible: false,
    guestIntroLocalSuppressionTrackedRef: createRef() as React.MutableRefObject<boolean>,
    guestIntroRecord: null,
    guestIntroShownForCurrentEntryRef: createRef() as React.MutableRefObject<boolean>,
    guestIntroVisible: false,
    guidedTutorTarget: null,
    hasNewMessage: false,
    highlightedSection: null,
    homeOnboardingShownForCurrentEntryRef: createRef() as React.MutableRefObject<boolean>,
    homeOnboardingStepIndex: null,
    hoveredSectionAnchorId: null,
    inputRef: createRef() as React.RefObject<HTMLInputElement | null>,
    inputValue: '',
    isAvatarDragging: false,
    isTutorHidden: false,
    launcherPromptVisible: false,
    mounted: true,
    panelAnchorMode: 'dock',
    panelMotionState: 'idle',
    panelPositionMode: null,
    panelShellMode: 'default',
    sectionResponseComplete: null,
    sectionResponsePending: null,
    selectionConversationContext: null,
    selectionExplainTimeoutRef: createRef() as React.MutableRefObject<number | null>,
    selectionGuidanceCalloutVisibleText: null,
    selectionGuidanceHandoffText: null,
    selectionGuidanceRevealTimeoutRef: createRef() as React.MutableRefObject<number | null>,
    selectionResponseComplete: null,
    selectionResponsePending: null,
    setAskModalDockStyle: vi.fn(),
    setAskModalVisible: vi.fn(),
    setCanonicalTutorModalVisible: vi.fn(),
    setContextualTutorMode: vi.fn(),
    setDraggedAvatarPoint: vi.fn(),
    setGuestAuthFormVisible: vi.fn(),
    setGuestIntroHelpVisible: vi.fn(),
    setGuestIntroRecord: vi.fn(),
    setGuestIntroVisible: vi.fn(),
    setGuidedTutorTarget: vi.fn(),
    setHasNewMessage: vi.fn(),
    setHighlightedSection: vi.fn(),
    setHomeOnboardingStepIndex: vi.fn(),
    setHoveredSectionAnchorId: vi.fn(),
    setInputValue: vi.fn(),
    setIsAvatarDragging: vi.fn(),
    setIsTutorHidden: vi.fn(),
    setLauncherPromptVisible: vi.fn(),
    setMounted: vi.fn(),
    setPanelAnchorMode: vi.fn(),
    setPanelMotionState: vi.fn(),
    setPanelPositionMode: vi.fn(),
    setPanelShellMode: vi.fn(),
    setSectionResponseComplete: vi.fn(),
    setSectionResponsePending: vi.fn(),
    setSelectionConversationContext: vi.fn(),
    setSelectionGuidanceCalloutVisibleText: vi.fn(),
    setSelectionGuidanceHandoffText: vi.fn(),
    setSelectionResponseComplete: vi.fn(),
    setSelectionResponsePending: vi.fn(),
  } as unknown as KangurAiTutorWidgetState;
}

const createPanelBodyContextValue = (
  overrides: Partial<KangurAiTutorPanelBodyContextValue> = {}
): KangurAiTutorPanelBodyContextValue => ({
  activeFocus: null,
  activeSectionRect: null,
  activeSelectedText: null,
  activeSelectionPageRect: null,
  askModalHelperText: '',
  basePath: '/',
  bridgeQuickActionId: null,
  bridgeSummaryChipLabel: null,
  canNarrateTutorText: false,
  canSendMessages: true,
  canStartHomeOnboardingManually: false,
  drawingImageData: null,
  drawingMode: false,
  drawingPanelOpen: false,
  drawingPanelAvailable: false,
  guestAuthFormVisible: false,
  emptyStateMessage: '',
  focusChipLabel: null,
  handleClearDrawing: vi.fn(),
  handleCloseDrawingPanel: vi.fn(),
  handleDetachHighlightedSection: vi.fn(),
  handleDetachSelectedFragment: vi.fn(),
  handleDrawingComplete: vi.fn(),
  handleOpenDrawingPanel: vi.fn(),
  handleFocusHighlightedSection: vi.fn(),
  handleFocusSelectedFragment: vi.fn(),
  handleFollowUpClick: vi.fn(),
  handleKeyDown: vi.fn(),
  handleMessageFeedback: vi.fn(),
  handleWebsiteHelpTargetClick: vi.fn(),
  handleQuickAction: vi.fn(),
  handleSend: vi.fn(),
  handleStartHomeOnboarding: vi.fn(),
  handleToggleDrawing: vi.fn(),
  homeOnboardingReplayLabel: '',
  inputPlaceholder: '',
  isAskModalMode: false,
  isLoading: false,
  isMinimalPanelMode: false,
  isSectionExplainPendingMode: false,
  isSelectionExplainPendingMode: false,
  isUsageLoading: false,
  lastInteractionIntent: null,
  lastPromptMode: null,
  messages: [],
  narratorSettings: { voice: 'default', autoPlay: false, volume: 1, speed: 1 },
  panelEmptyStateMessage: '',
  remainingMessages: null,
  selectedTextPreview: null,
  sessionSurface: null,
  showToolboxLayout: false,
  shouldRenderAuxiliaryPanelControls: false,
  showSectionExplainCompleteState: false,
  showSelectionExplainCompleteState: false,
  showSources: false,
  tutorNarrationScript: null,
  tutorNarratorContextRegistry: null,
  tutorSessionKey: null,
  usageSummary: null,
  visibleProactiveNudge: null,
  visibleQuickActions: [],
  ...overrides,
} as KangurAiTutorPanelBodyContextValue);

function renderPanel(overrides?: Partial<React.ComponentProps<typeof KangurAiTutorGuestIntroPanel>>) {
  const defaults = {
    guestIntroDescription: 'Desc',
    guestIntroHeadline: 'Headline',
    guestTutorLabel: 'Janek',
    isAnonymousVisitor: false,
    onAccept: vi.fn(),
    onClose: vi.fn(),
    onDismiss: vi.fn(),
    onStartChat: vi.fn(),
    panelStyle: {},
    prefersReducedMotion: true,
  };
  const props = { ...defaults, ...overrides };

  return {
    ...render(
      <KangurAiTutorWidgetStateProvider value={createWidgetState()}>
        <KangurAiTutorPanelBodyProvider value={createPanelBodyContextValue()}>
          <KangurAiTutorGuestIntroPanel {...props} />
        </KangurAiTutorPanelBodyProvider>
      </KangurAiTutorWidgetStateProvider>
    ),
    props,
  };
}

describe('KangurAiTutorGuestIntroPanel', () => {
  it('renders a simple onboarding prompt with Tak and Nie buttons for anonymous visitors', () => {
    renderPanel({ isAnonymousVisitor: true });

    expect(screen.getByText('Janek')).toBeInTheDocument();
    expect(screen.getByText(/Cześć,/)).toBeInTheDocument();
    expect(screen.getByText(/Jestem Janek\./)).toBeInTheDocument();
    expect(
      screen.getByText(/Jak chcesz, mogę pokazać Ci, jak odnaleźć się na Stronie\./)
    ).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-onboarding-accept')).toHaveTextContent('Tak');
    expect(screen.getByTestId('kangur-ai-tutor-onboarding-accept')).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByTestId('kangur-ai-tutor-onboarding-dismiss')).toHaveTextContent('Nie');
    expect(screen.getByTestId('kangur-ai-tutor-onboarding-dismiss')).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });

  it('skips the onboarding prompt for authenticated users', () => {
    renderPanel();

    expect(screen.getByTestId('kangur-ai-tutor-minimal-prompt')).toHaveTextContent('W czym mogę ci pomóc?');
    expect(screen.getByLabelText('Wpisz pytanie')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-ai-tutor-onboarding-accept')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-ai-tutor-onboarding-dismiss')).not.toBeInTheDocument();
  });

  it('calls onStartChat when Tak is clicked for anonymous users', () => {
    const onStartChat = vi.fn();
    renderPanel({ isAnonymousVisitor: true, onStartChat });

    fireEvent.click(screen.getByTestId('kangur-ai-tutor-onboarding-accept'));
    expect(onStartChat).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss and shows chat interface when Nie is clicked', () => {
    const onDismiss = vi.fn();
    renderPanel({ isAnonymousVisitor: true, onDismiss });

    fireEvent.click(screen.getByTestId('kangur-ai-tutor-onboarding-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('kangur-ai-tutor-minimal-prompt')).toHaveTextContent('W czym mogę ci pomóc?');
    expect(screen.getByLabelText('Wpisz pytanie')).toBeInTheDocument();
    expect(screen.queryByText('Cześć,')).not.toBeInTheDocument();
    expect(screen.queryByText('Jestem Janek.')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Jak chcesz, mogę pokazać Ci, jak odnaleźć się na Stronie.')
    ).not.toBeInTheDocument();
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    renderPanel({ onClose });

    const backdrop = screen.getByTestId('kangur-ai-tutor-guest-intro-backdrop');
    expect(backdrop.className).toContain('bg-transparent');
    expect(backdrop).toHaveClass('touch-manipulation', 'active:opacity-95');

    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

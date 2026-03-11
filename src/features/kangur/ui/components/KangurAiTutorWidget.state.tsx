'use client';

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import { internalError } from '@/shared/errors/app-error';

import {
  loadPersistedGuestIntroRecord,
  loadPersistedHomeOnboardingRecord,
  loadPersistedTutorAvatarPosition,
  loadPersistedTutorSessionKey,
  loadPersistedTutorVisibilityHidden,
  type KangurAiTutorGuestIntroRecord,
  type KangurAiTutorHomeOnboardingRecord,
} from './KangurAiTutorWidget.storage';

import type {
  GuidedTutorTarget,
  PendingSelectionResponse,
  SelectionConversationContext,
  SectionExplainContext,
  TutorAskEntrySource,
  TutorAvatarDragState,
  TutorMessageFeedback,
  TutorPanelShellMode,
  TutorPoint,
} from './KangurAiTutorWidget.types';

const getInitialTutorHiddenState = (): boolean => loadPersistedTutorVisibilityHidden();

const getInitialDraggedAvatarPoint = (): TutorPoint | null => {
  if (loadPersistedTutorVisibilityHidden()) {
    return null;
  }

  const persisted = loadPersistedTutorAvatarPosition();
  if (!persisted) {
    return null;
  }

  return {
    x: persisted.left,
    y: persisted.top,
  };
};

export function useKangurAiTutorWidgetState() {
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isTutorHidden, setIsTutorHidden] = useState(getInitialTutorHiddenState);
  const [launcherPromptVisible, setLauncherPromptVisible] = useState(false);
  const [canonicalTutorModalVisible, setCanonicalTutorModalVisible] = useState(false);
  const [guestIntroVisible, setGuestIntroVisible] = useState(false);
  const [guestIntroHelpVisible, setGuestIntroHelpVisible] = useState(false);
  const [contextualTutorMode, setContextualTutorMode] = useState<
    'selection_explain' | 'section_explain' | null
  >(null);
  const [guidedTutorTarget, setGuidedTutorTarget] = useState<GuidedTutorTarget | null>(null);
  const [homeOnboardingStepIndex, setHomeOnboardingStepIndex] = useState<number | null>(null);
  const [askModalVisible, setAskModalVisible] = useState(false);
  const [askEntrySource, setAskEntrySource] = useState<TutorAskEntrySource>('guest_intro');
  const [askModalDockStyle, setAskModalDockStyle] = useState<{
    left?: number | string;
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
  } | null>(null);
  const [draggedAvatarPoint, setDraggedAvatarPoint] =
    useState<TutorPoint | null>(getInitialDraggedAvatarPoint);
  const [isAvatarDragging, setIsAvatarDragging] = useState(false);
  const [messageFeedbackByKey, setMessageFeedbackByKey] = useState<
    Record<string, TutorMessageFeedback>
  >({});
  const [panelMotionState, setPanelMotionState] = useState<'animating' | 'settled'>('settled');
  const [panelMeasuredHeight, setPanelMeasuredHeight] = useState<number | null>(null);
  const [panelAnchorMode, setPanelAnchorMode] = useState<'contextual' | 'dock'>('contextual');
  const [panelShellMode, setPanelShellMode] = useState<TutorPanelShellMode>('default');
  const [persistedSelectionRect, setPersistedSelectionRect] = useState<DOMRect | null>(null);
  const [persistedSelectionPageRect, setPersistedSelectionPageRect] = useState<DOMRect | null>(
    null
  );
  const [persistedSelectionContainerRect, setPersistedSelectionContainerRect] =
    useState<DOMRect | null>(null);
  const [dismissedSelectedText, setDismissedSelectedText] = useState<string | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<SectionExplainContext | null>(null);
  const [hoveredSectionAnchorId, setHoveredSectionAnchorId] = useState<string | null>(null);
  const [selectionContextSpotlightTick, setSelectionContextSpotlightTick] = useState(0);
  const [selectionConversationContext, setSelectionConversationContext] =
    useState<SelectionConversationContext | null>(null);
  const [selectionGuidanceHandoffText, setSelectionGuidanceHandoffText] = useState<string | null>(
    null
  );
  const [selectionResponsePending, setSelectionResponsePending] =
    useState<PendingSelectionResponse | null>(null);
  const [selectionResponseComplete, setSelectionResponseComplete] =
    useState<PendingSelectionResponse | null>(null);
  const [sectionResponsePending, setSectionResponsePending] =
    useState<SectionExplainContext | null>(null);
  const [sectionResponseComplete, setSectionResponseComplete] =
    useState<SectionExplainContext | null>(null);
  const [contextSwitchNotice, setContextSwitchNotice] = useState<{
    title: string;
    target: string;
    detail: string | null;
  } | null>(null);
  const [viewportTick, setViewportTick] = useState(0);
  const [tutorNarrationObservedText, setTutorNarrationObservedText] = useState('');
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingImageData, setDrawingImageData] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tutorNarrationRootRef = useRef<HTMLDivElement | null>(null);
  const persistedSessionKey = useMemo(() => loadPersistedTutorSessionKey(), []);
  const [guestIntroRecord, setGuestIntroRecord] = useState<KangurAiTutorGuestIntroRecord | null>(
    () => loadPersistedGuestIntroRecord()
  );
  const [homeOnboardingRecord, setHomeOnboardingRecord] =
    useState<KangurAiTutorHomeOnboardingRecord | null>(() => loadPersistedHomeOnboardingRecord());
  const previousSessionKeyRef = useRef<string | null>(persistedSessionKey);
  const lastTrackedFocusKeyRef = useRef<string | null>(null);
  const lastTrackedProactiveNudgeKeyRef = useRef<string | null>(null);
  const lastTrackedQuotaKeyRef = useRef<string | null>(null);
  const guestIntroCheckStartedRef = useRef(false);
  const guestIntroLocalSuppressionTrackedRef = useRef(false);
  const motionTimeoutRef = useRef<number | null>(null);
  const selectionExplainTimeoutRef = useRef<number | null>(null);
  const selectionResponseCompleteTimeoutRef = useRef<number | null>(null);
  const sectionResponseCompleteTimeoutRef = useRef<number | null>(null);
  const guestIntroShownForCurrentEntryRef = useRef(false);
  const homeOnboardingShownForCurrentEntryRef = useRef(false);
  const avatarDragStateRef = useRef<TutorAvatarDragState | null>(null);
  const suppressAvatarClickRef = useRef(false);
  const askModalReturnStateRef = useRef<{
    wasOpen: boolean;
    launcherPromptVisible: boolean;
    guestIntroVisible: boolean;
    guestIntroHelpVisible: boolean;
    guidedTutorTarget: GuidedTutorTarget | null;
  } | null>(null);

  return {
    askEntrySource,
    askModalDockStyle,
    askModalReturnStateRef,
    askModalVisible,
    avatarDragStateRef,
    canonicalTutorModalVisible,
    contextualTutorMode,
    contextSwitchNotice,
    dismissedSelectedText,
    draggedAvatarPoint,
    drawingImageData,
    drawingMode,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    guidedTutorTarget,
    hasNewMessage,
    highlightedSection,
    homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStepIndex,
    hoveredSectionAnchorId,
    inputRef,
    inputValue,
    isAvatarDragging,
    isTutorHidden,
    lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    launcherPromptVisible,
    messageFeedbackByKey,
    messagesEndRef,
    mounted,
    motionTimeoutRef,
    panelMeasuredHeight,
    panelMotionState,
    panelAnchorMode,
    panelShellMode,
    panelRef,
    persistedSelectionContainerRect,
    persistedSelectionPageRect,
    persistedSelectionRect,
    persistedSessionKey,
    previousSessionKeyRef,
    sectionResponseComplete,
    sectionResponseCompleteTimeoutRef,
    sectionResponsePending,
    selectionConversationContext,
    selectionContextSpotlightTick,
    selectionExplainTimeoutRef,
    selectionGuidanceHandoffText,
    selectionResponseComplete,
    selectionResponseCompleteTimeoutRef,
    selectionResponsePending,
    setAskEntrySource,
    setAskModalDockStyle,
    setAskModalVisible,
    setCanonicalTutorModalVisible,
    setContextualTutorMode,
    setContextSwitchNotice,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
    setDrawingImageData,
    setDrawingMode,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setInputValue,
    setIsAvatarDragging,
    setIsTutorHidden,
    setLauncherPromptVisible,
    setMessageFeedbackByKey,
    setMounted,
    setPanelMeasuredHeight,
    setPanelMotionState,
    setPanelAnchorMode,
    setPanelShellMode,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionConversationContext,
    setSelectionContextSpotlightTick,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setTutorNarrationObservedText,
    setViewportTick,
    suppressAvatarClickRef,
    tutorNarrationObservedText,
    tutorNarrationRootRef,
    viewportTick,
  };
}

export type KangurAiTutorWidgetState = ReturnType<typeof useKangurAiTutorWidgetState>;

const KangurAiTutorWidgetStateContext = createContext<KangurAiTutorWidgetState | null>(null);

type KangurAiTutorWidgetStateProviderProps = {
  children: ReactNode;
  value: KangurAiTutorWidgetState;
};

export function KangurAiTutorWidgetStateProvider({
  children,
  value,
}: KangurAiTutorWidgetStateProviderProps): JSX.Element {
  return (
    <KangurAiTutorWidgetStateContext.Provider value={value}>
      {children}
    </KangurAiTutorWidgetStateContext.Provider>
  );
}

export function useKangurAiTutorWidgetStateContext(): KangurAiTutorWidgetState {
  const ctx = useContext(KangurAiTutorWidgetStateContext);
  if (!ctx) {
    throw internalError(
      'useKangurAiTutorWidgetStateContext must be used within a KangurAiTutorWidgetStateProvider'
    );
  }

  return ctx;
}

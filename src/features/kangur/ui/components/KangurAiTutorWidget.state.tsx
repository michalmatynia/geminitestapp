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
  loadPersistedTutorPanelPosition,
  loadPersistedTutorSessionKey,
  loadPersistedTutorVisibilityHidden,
} from './KangurAiTutorWidget.storage';

import type {
  KangurAiTutorGuestIntroStatus,
  KangurAiTutorHomeOnboardingStatus,
  KangurAiTutorOnboardingRecord,
} from '@/shared/contracts/kangur-ai-tutor';
import type {
  GuidedTutorTarget,
  PendingSelectionResponse,
  SelectionConversationContext,
  SectionExplainContext,
  TutorAskEntrySource,
  TutorAvatarDragState,
  TutorMessageFeedback,
  TutorPanelDragState,
  TutorPanelShellMode,
  TutorPoint,
} from './KangurAiTutorWidget.types';
import type {
  TutorPanelPositionMode,
  TutorPanelSnapState,
} from './KangurAiTutorWidget.shared';

type KangurAiTutorGuestIntroRecord = KangurAiTutorOnboardingRecord<KangurAiTutorGuestIntroStatus>;
type KangurAiTutorHomeOnboardingRecord =
  KangurAiTutorOnboardingRecord<KangurAiTutorHomeOnboardingStatus>;

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

const getInitialTutorPanelPoint = (): TutorPoint | null => {
  if (loadPersistedTutorVisibilityHidden()) {
    return null;
  }

  const persisted = loadPersistedTutorPanelPosition();
  if (!persisted) {
    return null;
  }

  return {
    x: persisted.left,
    y: persisted.top,
  };
};

const getInitialTutorPanelSnapPreference = (): TutorPanelSnapState => {
  if (loadPersistedTutorVisibilityHidden()) {
    return 'free';
  }

  return loadPersistedTutorPanelPosition()?.snap ?? 'free';
};

const getInitialTutorPanelPositionMode = (): TutorPanelPositionMode => {
  if (loadPersistedTutorVisibilityHidden()) {
    return 'manual';
  }

  return loadPersistedTutorPanelPosition()?.mode ?? 'manual';
};

// ---------------------------------------------------------------------------
// Sub-hooks — internal, grouped by concern
// ---------------------------------------------------------------------------

function useWidgetPositionState() {
  const [draggedAvatarPoint, setDraggedAvatarPoint] =
    useState<TutorPoint | null>(getInitialDraggedAvatarPoint);
  const [isAvatarDragging, setIsAvatarDragging] = useState(false);
  const [panelPosition, setPanelPosition] = useState<TutorPoint | null>(getInitialTutorPanelPoint);
  const [panelPositionMode, setPanelPositionMode] = useState<TutorPanelPositionMode>(
    getInitialTutorPanelPositionMode
  );
  const [panelSnapPreference, setPanelSnapPreference] = useState<TutorPanelSnapState>(
    getInitialTutorPanelSnapPreference
  );
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const avatarDragStateRef = useRef<TutorAvatarDragState | null>(null);
  const panelDragStateRef = useRef<TutorPanelDragState | null>(null);
  const suppressAvatarClickRef = useRef(false);

  return {
    draggedAvatarPoint,
    isAvatarDragging,
    isPanelDragging,
    panelPosition,
    panelPositionMode,
    panelSnapPreference,
    avatarDragStateRef,
    panelDragStateRef,
    suppressAvatarClickRef,
    setDraggedAvatarPoint,
    setIsAvatarDragging,
    setIsPanelDragging,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
  };
}

function useWidgetSelectionState() {
  const [contextualTutorMode, setContextualTutorMode] = useState<
    'selection_explain' | 'section_explain' | null
  >(null);
  const [persistedSelectionRect, setPersistedSelectionRect] = useState<DOMRect | null>(null);
  const [persistedSelectionPageRect, setPersistedSelectionPageRect] = useState<DOMRect | null>(
    null
  );
  const [persistedSelectionPageRects, setPersistedSelectionPageRects] = useState<DOMRect[]>([]);
  const [persistedSelectionContainerRect, setPersistedSelectionContainerRect] =
    useState<DOMRect | null>(null);
  const [dismissedSelectedText, setDismissedSelectedText] = useState<string | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<SectionExplainContext | null>(null);
  const [hoveredSectionAnchorId, setHoveredSectionAnchorId] = useState<string | null>(null);
  const [selectionContextSpotlightTick, setSelectionContextSpotlightTick] = useState(0);
  const [selectionConversationContext, setSelectionConversationContext] =
    useState<SelectionConversationContext | null>(null);
  const [selectionGuidanceCalloutVisibleText, setSelectionGuidanceCalloutVisibleText] =
    useState<string | null>(null);
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
  const selectionExplainTimeoutRef = useRef<number | null>(null);
  const selectionGuidanceRevealTimeoutRef = useRef<number | null>(null);
  const selectionResponseCompleteTimeoutRef = useRef<number | null>(null);
  const sectionResponseCompleteTimeoutRef = useRef<number | null>(null);

  return {
    contextualTutorMode,
    dismissedSelectedText,
    highlightedSection,
    hoveredSectionAnchorId,
    persistedSelectionContainerRect,
    persistedSelectionPageRect,
    persistedSelectionPageRects,
    persistedSelectionRect,
    sectionResponseComplete,
    sectionResponsePending,
    selectionContextSpotlightTick,
    selectionConversationContext,
    selectionGuidanceCalloutVisibleText,
    selectionGuidanceHandoffText,
    selectionResponseComplete,
    selectionResponsePending,
    sectionResponseCompleteTimeoutRef,
    selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef,
    selectionResponseCompleteTimeoutRef,
    setContextualTutorMode,
    setDismissedSelectedText,
    setHighlightedSection,
    setHoveredSectionAnchorId,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionContextSpotlightTick,
    setSelectionConversationContext,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
  };
}

function useWidgetOnboardingState() {
  const [guestIntroVisible, setGuestIntroVisible] = useState(false);
  const [guestIntroHelpVisible, setGuestIntroHelpVisible] = useState(false);
  const [guestAuthFormVisible, setGuestAuthFormVisible] = useState(false);
  const [guidedTutorTarget, setGuidedTutorTarget] = useState<GuidedTutorTarget | null>(null);
  const [homeOnboardingStepIndex, setHomeOnboardingStepIndex] = useState<number | null>(null);
  const [guestIntroRecord, setGuestIntroRecord] = useState<KangurAiTutorGuestIntroRecord | null>(
    () => loadPersistedGuestIntroRecord()
  );
  const [homeOnboardingRecord, setHomeOnboardingRecord] =
    useState<KangurAiTutorHomeOnboardingRecord | null>(() => loadPersistedHomeOnboardingRecord());
  const guestIntroCheckStartedRef = useRef(false);
  const guestIntroLocalSuppressionTrackedRef = useRef(false);
  const guestIntroShownForCurrentEntryRef = useRef(false);
  const homeOnboardingShownForCurrentEntryRef = useRef(false);

  return {
    guestIntroCheckStartedRef,
    guestAuthFormVisible,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    guidedTutorTarget,
    homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStepIndex,
    setGuestAuthFormVisible,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
  };
}

function useWidgetInputState() {
  const [inputValue, setInputValue] = useState('');
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingImageData, setDrawingImageData] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return {
    drawingImageData,
    drawingMode,
    inputRef,
    inputValue,
    setDrawingImageData,
    setDrawingMode,
    setInputValue,
  };
}

// ---------------------------------------------------------------------------
// Main hook — composes sub-hooks + remaining widget-level state
// ---------------------------------------------------------------------------

export function useKangurAiTutorWidgetState() {
  const position = useWidgetPositionState();
  const selection = useWidgetSelectionState();
  const onboarding = useWidgetOnboardingState();
  const input = useWidgetInputState();

  const [mounted, setMounted] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isTutorHidden, setIsTutorHidden] = useState(getInitialTutorHiddenState);
  const [launcherPromptVisible, setLauncherPromptVisible] = useState(false);
  const [canonicalTutorModalVisible, setCanonicalTutorModalVisible] = useState(false);
  const [askModalVisible, setAskModalVisible] = useState(false);
  const [askEntrySource, setAskEntrySource] = useState<TutorAskEntrySource>('guest_intro');
  const [askModalDockStyle, setAskModalDockStyle] = useState<{
    left?: number | string;
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
  } | null>(null);
  const [messageFeedbackByKey, setMessageFeedbackByKey] = useState<
    Record<string, TutorMessageFeedback>
  >({});
  const [panelMotionState, setPanelMotionState] = useState<'animating' | 'settled'>('settled');
  const [panelMeasuredHeight, setPanelMeasuredHeight] = useState<number | null>(null);
  const [panelAnchorMode, setPanelAnchorMode] = useState<'contextual' | 'dock'>('contextual');
  const [panelShellMode, setPanelShellMode] = useState<TutorPanelShellMode>('default');
  const [contextSwitchNotice, setContextSwitchNotice] = useState<{
    title: string;
    target: string;
    detail: string | null;
  } | null>(null);
  const [viewportTick, setViewportTick] = useState(0);
  const [tutorNarrationObservedText, setTutorNarrationObservedText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tutorNarrationRootRef = useRef<HTMLDivElement | null>(null);
  const guestIntroNarrationRootRef = useRef<HTMLDivElement | null>(null);
  const persistedSessionKey = useMemo(() => loadPersistedTutorSessionKey(), []);
  const previousSessionKeyRef = useRef<string | null>(persistedSessionKey);
  const lastTrackedFocusKeyRef = useRef<string | null>(null);
  const lastTrackedProactiveNudgeKeyRef = useRef<string | null>(null);
  const lastTrackedQuotaKeyRef = useRef<string | null>(null);
  const motionTimeoutRef = useRef<number | null>(null);
  const askModalReturnStateRef = useRef<{
    wasOpen: boolean;
    launcherPromptVisible: boolean;
    guestIntroVisible: boolean;
    guestIntroHelpVisible: boolean;
    guidedTutorTarget: GuidedTutorTarget | null;
  } | null>(null);

  return {
    ...position,
    ...selection,
    ...onboarding,
    ...input,
    askEntrySource,
    askModalDockStyle,
    askModalReturnStateRef,
    askModalVisible,
    canonicalTutorModalVisible,
    contextSwitchNotice,
    guestIntroNarrationRootRef,
    hasNewMessage,
    isTutorHidden,
    lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    launcherPromptVisible,
    messageFeedbackByKey,
    messagesEndRef,
    mounted,
    motionTimeoutRef,
    panelAnchorMode,
    panelMeasuredHeight,
    panelMotionState,
    panelRef,
    panelShellMode,
    persistedSessionKey,
    previousSessionKeyRef,
    tutorNarrationObservedText,
    tutorNarrationRootRef,
    viewportTick,
    setAskEntrySource,
    setAskModalDockStyle,
    setAskModalVisible,
    setCanonicalTutorModalVisible,
    setContextSwitchNotice,
    setHasNewMessage,
    setIsTutorHidden,
    setLauncherPromptVisible,
    setMessageFeedbackByKey,
    setMounted,
    setPanelAnchorMode,
    setPanelMeasuredHeight,
    setPanelMotionState,
    setPanelShellMode,
    setTutorNarrationObservedText,
    setViewportTick,
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

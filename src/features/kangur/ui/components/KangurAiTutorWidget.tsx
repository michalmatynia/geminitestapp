'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, BrainCircuit } from 'lucide-react';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import {
  buildKangurRecommendationHref,
  getKangurRecommendationButtonVariant,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  selectBestTutorAnchor,
  useOptionalKangurTutorAnchors,
} from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import type { KangurTutorAnchorKind } from '@/features/kangur/ui/context/kangur-tutor-types';
import {
  KangurButton,
  KangurGlassPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurTextHighlight } from '@/features/kangur/ui/hooks/useKangurTextHighlight';
import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';
import type {
  KangurAiTutorFollowUpAction,
  KangurAiTutorPromptMode,
} from '@/shared/contracts/kangur-ai-tutor';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import { cn, sanitizeSvg } from '@/shared/utils';

const EDGE_GAP = 16;
const AVATAR_SIZE = 56;
const CTA_WIDTH = 124;
const CTA_HEIGHT = 40;
const DESKTOP_BUBBLE_WIDTH = 384;
const MOBILE_BUBBLE_WIDTH = 320;
const KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY = 'kangur-ai-tutor-widget-v1';

type TutorMotionPosition = {
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
};

type ActiveTutorFocus = {
  rect: DOMRect | null;
  kind: KangurTutorAnchorKind | 'selection' | null;
  id: string | null;
  label: string | null;
  assignmentId: string | null;
};

type TutorQuickAction = {
  id: string;
  label: string;
  prompt: string;
  promptMode: KangurAiTutorPromptMode;
  interactionIntent?: 'hint' | 'explain' | 'review' | 'next_step';
};

type TutorMotionPresetKind = 'default' | 'desktop' | 'tablet' | 'mobile';

type TutorMotionProfile = {
  kind: TutorMotionPresetKind;
  sheetBreakpoint: number;
  avatarTransition: {
    type: 'spring';
    stiffness: number;
    damping: number;
  };
  bubbleTransition: {
    type: 'spring';
    stiffness: number;
    damping: number;
  };
  hoverScale: number;
  tapScale: number;
  motionCompletedDelayMs: number;
  desktopBubbleWidth: number;
  mobileBubbleWidth: number;
};

type TutorMoodAvatarProps = {
  svgContent?: string | null;
  label: string;
  className?: string;
  svgClassName?: string;
  fallbackIconClassName?: string;
  'data-testid'?: string;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const TutorMoodAvatar = ({
  svgContent,
  label,
  className,
  svgClassName,
  fallbackIconClassName,
  'data-testid': dataTestId,
}: TutorMoodAvatarProps): React.JSX.Element => {
  const hasSvg = typeof svgContent === 'string' && svgContent.trim().length > 0;

  return (
    <div
      aria-label={label}
      className={cn('flex items-center justify-center overflow-hidden rounded-full', className)}
      data-testid={dataTestId}
      role='img'
    >
      {hasSvg ? (
        <div
          className={cn(
            'h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:overflow-visible',
            svgClassName
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent, { viewBox: '0 0 100 100' }) }}
        />
      ) : (
        <BrainCircuit
          aria-hidden='true'
          className={cn('h-1/2 w-1/2 text-white', fallbackIconClassName)}
        />
      )}
    </div>
  );
};

const cloneRect = (rect: DOMRect | null | undefined): DOMRect | null => {
  if (!rect) {
    return null;
  }

  if (typeof DOMRect === 'function') {
    return new DOMRect(rect.x, rect.y, rect.width, rect.height);
  }

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    toJSON: () => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    }),
  } as DOMRect;
};

const getViewport = (): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const getDockAvatarStyle = (): TutorMotionPosition => ({
  left: `calc(100vw - ${EDGE_GAP + AVATAR_SIZE}px)`,
  top: `calc(100vh - ${EDGE_GAP + AVATAR_SIZE}px)`,
});

const loadPersistedTutorSessionKey = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { lastSessionKey?: unknown } | null;
    return typeof parsed?.lastSessionKey === 'string' ? parsed.lastSessionKey : null;
  } catch {
    return null;
  }
};

const persistTutorSessionKey = (sessionKey: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
      JSON.stringify({ lastSessionKey: sessionKey })
    );
  } catch {
    // Ignore storage write failures so the widget remains functional without storage.
  }
};

const getAnchorAvatarStyle = (rect: DOMRect): TutorMotionPosition => {
  const viewport = getViewport();
  const left = clamp(
    rect.left + rect.width / 2 - AVATAR_SIZE / 2,
    EDGE_GAP,
    viewport.width - EDGE_GAP - AVATAR_SIZE
  );
  const preferredTop = rect.top - AVATAR_SIZE - 12;
  const fallbackTop = rect.bottom + 12;
  const top = preferredTop >= EDGE_GAP
    ? preferredTop
    : clamp(fallbackTop, EDGE_GAP, viewport.height - EDGE_GAP - AVATAR_SIZE);

  return {
    left,
    top,
  };
};

const getSelectionActionStyle = (rect: DOMRect): CSSProperties => {
  const viewport = getViewport();
  const left = clamp(
    rect.left + rect.width / 2 - CTA_WIDTH / 2,
    EDGE_GAP,
    viewport.width - EDGE_GAP - CTA_WIDTH
  );
  const preferredTop = rect.top - CTA_HEIGHT - 12;
  const fallbackTop = rect.bottom + 10;
  const top = preferredTop >= EDGE_GAP
    ? preferredTop
    : clamp(fallbackTop, EDGE_GAP, viewport.height - EDGE_GAP - CTA_HEIGHT);

  return {
    position: 'fixed',
    left,
    top,
  };
};

const getBubblePlacement = (
  rect: DOMRect | null,
  viewport: { width: number; height: number },
  mode: 'bubble' | 'sheet',
  widthConfig: {
    desktop: number;
    mobile: number;
  }
): {
  style: TutorMotionPosition;
  tailPlacement: 'top' | 'bottom' | 'dock';
  width?: number;
  mode: 'bubble' | 'sheet';
} => {
  if (mode === 'sheet') {
    return {
      mode,
      tailPlacement: 'dock',
      style: {
        left: EDGE_GAP,
        right: EDGE_GAP,
        bottom: EDGE_GAP,
      },
    };
  }

  const width = Math.min(
    viewport.width - EDGE_GAP * 2,
    viewport.width < 640 ? widthConfig.mobile : widthConfig.desktop
  );

  if (!rect) {
    return {
      mode,
      width,
      tailPlacement: 'dock',
      style: {
        left: viewport.width - EDGE_GAP - width,
        top: clamp(viewport.height - 440, EDGE_GAP, viewport.height - EDGE_GAP - 220),
      },
    };
  }

  const left = clamp(
    rect.left + rect.width / 2 - width / 2,
    EDGE_GAP,
    viewport.width - EDGE_GAP - width
  );
  const belowTop = rect.bottom + AVATAR_SIZE + 18;
  const aboveTop = rect.top - Math.min(viewport.height * 0.6, 420);
  const shouldPlaceAbove = belowTop > viewport.height - 280 && aboveTop >= EDGE_GAP;

  return {
    mode,
    width,
    tailPlacement: shouldPlaceAbove ? 'bottom' : 'top',
    style: {
      left,
      top: shouldPlaceAbove
        ? clamp(aboveTop, EDGE_GAP, viewport.height - EDGE_GAP - 220)
        : clamp(belowTop, EDGE_GAP, viewport.height - EDGE_GAP - 220),
    },
  };
};

const getAnchorKindsForSurface = (
  surface: 'lesson' | 'test' | null | undefined,
  answerRevealed: boolean | undefined
): KangurTutorAnchorKind[] => {
  if (surface === 'lesson') {
    return ['assignment', 'lesson_header', 'document'];
  }

  if (surface === 'test') {
    return answerRevealed ? ['review', 'summary', 'question'] : ['question', 'review', 'summary'];
  }

  return [];
};

const getFocusChipLabel = (
  focus: ActiveTutorFocus,
  selectedText: string | null
): string | null => {
  if (focus.kind === 'selection') {
    return selectedText ? 'Fragment lekcji' : 'Zaznaczony fragment';
  }

  switch (focus.kind) {
    case 'assignment':
      return 'Zadanie od rodzica';
    case 'lesson_header':
      return 'Temat lekcji';
    case 'document':
      return 'Treść lekcji';
    case 'question':
      return 'Aktualne pytanie';
    case 'review':
      return 'Omówienie pytania';
    case 'summary':
      return 'Podsumowanie testu';
    default:
      return null;
  }
};

const getInteractionIntent = (
  promptMode: KangurAiTutorPromptMode,
  focusKind: ActiveTutorFocus['kind'],
  answerRevealed: boolean | undefined
): 'hint' | 'explain' | 'review' | 'next_step' => {
  if (promptMode === 'hint') {
    return 'hint';
  }

  if (promptMode === 'explain' || promptMode === 'selected_text') {
    return answerRevealed && focusKind === 'review' ? 'review' : 'explain';
  }

  return 'next_step';
};

const buildQuickActions = (input: {
  surface: 'lesson' | 'test' | null | undefined;
  answerRevealed: boolean | undefined;
  hasSelectedText: boolean;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  focusKind: ActiveTutorFocus['kind'];
}): TutorQuickAction[] => {
  const actions: TutorQuickAction[] = [];

  if (input.surface === 'test' && input.answerRevealed) {
    actions.push({
      id: 'review',
      label: input.hasCurrentQuestion ? 'Omow odpowiedz' : 'Omow wynik',
      prompt: input.hasCurrentQuestion
        ? 'Omów to pytanie: co poszło dobrze, gdzie był błąd i co sprawdzić następnym razem.'
        : 'Omów mój wynik testu: co poszło dobrze i co warto poprawić następnym razem.',
      promptMode: 'explain',
      interactionIntent: 'review',
    });
    actions.push({
      id: 'next-step',
      label: input.hasCurrentQuestion ? 'Co poprawic?' : 'Co cwiczyc?',
      prompt: input.hasCurrentQuestion
        ? 'Powiedz, co ćwiczyć dalej po tym pytaniu.'
        : 'Powiedz, jaki powinien być mój następny krok po tym teście.',
      promptMode: 'chat',
      interactionIntent: 'next_step',
    });
  } else if (input.surface === 'test') {
    actions.push({
      id: 'hint',
      label: 'Podpowiedz',
      prompt: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
      promptMode: 'hint',
      interactionIntent: 'hint',
    });
    actions.push({
      id: 'how-think',
      label: 'Jak myslec?',
      prompt: 'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.',
      promptMode: 'explain',
      interactionIntent: 'explain',
    });
  } else {
    actions.push({
      id: 'hint',
      label: 'Podpowiedz',
      prompt: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
      promptMode: 'hint',
      interactionIntent: 'hint',
    });
    actions.push({
      id: 'explain',
      label:
        input.focusKind === 'assignment' || input.hasAssignmentSummary ? 'Wyjasnij temat' : 'Wyjasnij',
      prompt: input.hasSelectedText
        ? 'Wyjaśnij ten fragment prostymi słowami.'
        : 'Wyjaśnij mi to prostymi słowami.',
      promptMode: 'explain',
      interactionIntent: 'explain',
    });
    actions.push({
      id: 'next-step',
      label: input.focusKind === 'assignment' || input.hasAssignmentSummary ? 'Plan zadania' : 'Co dalej?',
      prompt:
        input.focusKind === 'assignment' || input.hasAssignmentSummary
          ? 'Powiedz, jaki ma być mój następny krok w tym zadaniu i w tej lekcji.'
          : 'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.',
      promptMode: 'chat',
      interactionIntent: 'next_step',
    });
  }

  if (input.hasSelectedText) {
    actions.push({
      id: 'selected-text',
      label: 'Ten fragment',
      prompt: 'Wytłumacz ten zaznaczony fragment prostymi słowami.',
      promptMode: 'selected_text',
      interactionIntent: 'explain',
    });
  }

  return actions;
};

const getEmptyStateMessage = (input: {
  surface: 'lesson' | 'test' | null | undefined;
  answerRevealed: boolean | undefined;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  hasSelectedText: boolean;
}): string => {
  if (input.hasSelectedText) {
    return 'Masz zaznaczony fragment. Poproś o wyjaśnienie albo kolejny krok.';
  }

  if (input.surface === 'test' && !input.answerRevealed) {
    return 'Poproś o wskazówkę do tego pytania. Tutor nie poda gotowej odpowiedzi.';
  }

  if (input.surface === 'test' && input.answerRevealed) {
    return input.hasCurrentQuestion
      ? 'Poproś o omówienie odpowiedzi albo o kolejny krok do ćwiczenia.'
      : 'Poproś o omówienie wyniku albo plan następnych ćwiczeń.';
  }

  if (input.hasAssignmentSummary) {
    return 'Poproś o plan wykonania zadania albo krótkie wyjaśnienie tematu.';
  }

  return 'Masz pytanie dotyczące lekcji? Poproś o wyjaśnienie albo następny krok.';
};

const getInputPlaceholder = (input: {
  canSendMessages: boolean;
  surface: 'lesson' | 'test' | null | undefined;
  answerRevealed: boolean | undefined;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  hasSelectedText: boolean;
}): string => {
  if (!input.canSendMessages) {
    return 'Dzienny limit wiadomosci wykorzystany';
  }

  if (input.hasSelectedText) {
    return 'Zapytaj o zaznaczony fragment';
  }

  if (input.surface === 'test' && !input.answerRevealed) {
    return 'Popros o wskazowke do pytania';
  }

  if (input.surface === 'test' && input.answerRevealed) {
    return input.hasCurrentQuestion
      ? 'Popros o omowienie odpowiedzi'
      : 'Zapytaj o wynik lub nastepny krok';
  }

  if (input.hasAssignmentSummary) {
    return 'Zapytaj o zadanie lub kolejny krok';
  }

  return 'Pytaj…';
};

const toFollowUpHref = (
  basePath: string,
  action: KangurAiTutorFollowUpAction
): string =>
  buildKangurRecommendationHref(basePath, {
    label: action.label,
    page: action.page,
    query: action.query,
  });

const getTutorSessionKey = (
  sessionContext:
    | {
        surface: 'lesson' | 'test';
        contentId?: string;
        title?: string;
      }
    | null
    | undefined
): string | null => {
  if (!sessionContext) {
    return null;
  }

  return `${sessionContext.surface}:${sessionContext.contentId ?? sessionContext.title ?? 'none'}`;
};

const getContextSwitchNotice = (input: {
  surface: 'lesson' | 'test' | null | undefined;
  title: string | null | undefined;
  questionProgressLabel: string | null | undefined;
  assignmentSummary: string | null | undefined;
}): {
  title: string;
  target: string;
  detail: string | null;
} | null => {
  if (!input.surface) {
    return null;
  }

  const targetLabel = input.title?.trim()
    ? `${input.surface === 'test' ? 'Test' : 'Lekcja'}: ${input.title.trim()}`
    : input.surface === 'test'
      ? 'Nowe pytanie testowe'
      : 'Nowy fragment lekcji';
  const detail = input.questionProgressLabel?.trim()
    ? input.questionProgressLabel.trim()
    : input.assignmentSummary?.trim()
      ? 'Tutor ustawia się pod aktywne zadanie.'
      : null;

  return {
    title: 'Nowe miejsce pomocy',
    target: targetLabel,
    detail,
  };
};

const getMotionPresetKind = (
  motionPreset: PlaywrightPersona | null | undefined
): TutorMotionPresetKind => {
  if (!motionPreset) {
    return 'default';
  }

  const deviceName = motionPreset.settings.deviceName?.trim().toLowerCase() ?? '';
  const isTablet =
    deviceName.includes('ipad') ||
    deviceName.includes('tablet') ||
    deviceName.includes('galaxy tab');
  const isMobile =
    deviceName.includes('iphone') ||
    deviceName.includes('pixel') ||
    deviceName.includes('android') ||
    deviceName.includes('phone');

  if (isMobile) {
    return 'mobile';
  }

  if (isTablet) {
    return 'tablet';
  }

  return motionPreset.settings.emulateDevice ? 'tablet' : 'desktop';
};

const getTutorMotionProfile = (
  motionPreset: PlaywrightPersona | null | undefined
): TutorMotionProfile => {
  switch (getMotionPresetKind(motionPreset)) {
    case 'mobile':
      return {
        kind: 'mobile',
        sheetBreakpoint: 840,
        avatarTransition: { type: 'spring', stiffness: 250, damping: 30 },
        bubbleTransition: { type: 'spring', stiffness: 235, damping: 30 },
        hoverScale: 1.03,
        tapScale: 0.97,
        motionCompletedDelayMs: 420,
        desktopBubbleWidth: 360,
        mobileBubbleWidth: 320,
      };
    case 'tablet':
      return {
        kind: 'tablet',
        sheetBreakpoint: 960,
        avatarTransition: { type: 'spring', stiffness: 280, damping: 30 },
        bubbleTransition: { type: 'spring', stiffness: 250, damping: 30 },
        hoverScale: 1.04,
        tapScale: 0.96,
        motionCompletedDelayMs: 400,
        desktopBubbleWidth: 408,
        mobileBubbleWidth: 336,
      };
    case 'desktop':
      return {
        kind: 'desktop',
        sheetBreakpoint: 680,
        avatarTransition: { type: 'spring', stiffness: 320, damping: 28 },
        bubbleTransition: { type: 'spring', stiffness: 300, damping: 28 },
        hoverScale: 1.06,
        tapScale: 0.94,
        motionCompletedDelayMs: 360,
        desktopBubbleWidth: 392,
        mobileBubbleWidth: 320,
      };
    default:
      return {
        kind: 'default',
        sheetBreakpoint: 640,
        avatarTransition: { type: 'spring', stiffness: 320, damping: 28 },
        bubbleTransition: { type: 'spring', stiffness: 300, damping: 28 },
        hoverScale: 1.06,
        tapScale: 0.94,
        motionCompletedDelayMs: 360,
        desktopBubbleWidth: DESKTOP_BUBBLE_WIDTH,
        mobileBubbleWidth: MOBILE_BUBBLE_WIDTH,
      };
  }
};

const getSelectionTelemetryKey = (
  text: string | null,
  rect: DOMRect | null
): string | null => {
  if (!text || !rect) {
    return null;
  }

  return [
    text.trim(),
    Math.round(rect.left),
    Math.round(rect.top),
    Math.round(rect.width),
    Math.round(rect.height),
  ].join(':');
};

const getFocusTelemetryKey = (
  sessionKey: string | null,
  focus: ActiveTutorFocus
): string | null => {
  if (!sessionKey || !focus.kind) {
    return null;
  }

  return `${sessionKey}:${focus.kind}:${focus.id ?? 'none'}`;
};

export function KangurAiTutorWidget(): React.JSX.Element | null {
  const {
    enabled,
    tutorSettings,
    sessionContext,
    isOpen,
    messages,
    isLoading,
    isUsageLoading,
    tutorName,
    tutorMoodId,
    tutorAvatarSvg,
    highlightedText,
    usageSummary,
    openChat,
    closeChat,
    sendMessage,
    setHighlightedText,
  } = useKangurAiTutor();
  const { selectedText, selectionRect, clearSelection } = useKangurTextHighlight();
  const tutorAnchorContext = useOptionalKangurTutorAnchors();
  const routing = useOptionalKangurRouting();
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [persistedSelectionRect, setPersistedSelectionRect] = useState<DOMRect | null>(null);
  const [contextSwitchNotice, setContextSwitchNotice] = useState<{
    title: string;
    target: string;
    detail: string | null;
  } | null>(null);
  const [viewportTick, setViewportTick] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const persistedSessionKey = useMemo(() => loadPersistedTutorSessionKey(), []);
  const previousSessionKeyRef = useRef<string | null>(persistedSessionKey);
  const lastShownSelectionKeyRef = useRef<string | null>(null);
  const lastTrackedFocusKeyRef = useRef<string | null>(null);
  const motionTimeoutRef = useRef<number | null>(null);
  const allowSelectedTextSupport = tutorSettings?.allowSelectedTextSupport ?? true;
  const showSources = tutorSettings?.showSources ?? true;
  const { data: motionPresets = [] } = usePlaywrightPersonas();
  const activeSelectedText = allowSelectedTextSupport
    ? (selectedText ?? highlightedText)?.trim() || null
    : null;
  const activeSelectionRect = activeSelectedText ? selectionRect ?? persistedSelectionRect : null;
  const remainingMessages = usageSummary?.remainingMessages ?? null;
  const canSendMessages = remainingMessages !== 0;
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const telemetryContext = {
    surface: sessionContext?.surface ?? null,
    contentId: sessionContext?.contentId ?? null,
    title: sessionContext?.title ?? null,
  };
  const tutorSessionKey = useMemo(
    () => getTutorSessionKey(sessionContext ?? null),
    [sessionContext]
  );
  const viewport = useMemo(() => getViewport(), [mounted, viewportTick]);
  const selectedMotionPreset = useMemo(
    () =>
      tutorSettings?.motionPresetId
        ? motionPresets.find((preset) => preset.id === tutorSettings.motionPresetId) ?? null
        : null,
    [motionPresets, tutorSettings?.motionPresetId]
  );
  const motionProfile = useMemo(
    () => getTutorMotionProfile(selectedMotionPreset),
    [selectedMotionPreset]
  );
  const selectionTelemetryKey = useMemo(
    () =>
      getSelectionTelemetryKey(
        allowSelectedTextSupport && !isOpen ? selectedText : null,
        allowSelectedTextSupport && !isOpen ? selectionRect : null
      ),
    [allowSelectedTextSupport, isOpen, selectedText, selectionRect]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let rafId = 0;
    const handleViewportChange = (): void => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setViewportTick((current) => current + 1);
      });
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [mounted]);

  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!isOpen && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    setHighlightedText(allowSelectedTextSupport ? selectedText : null);
  }, [allowSelectedTextSupport, selectedText, setHighlightedText]);

  useEffect(() => {
    if (!isOpen) {
      setPersistedSelectionRect(null);
      setContextSwitchNotice(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!tutorSessionKey) {
      return;
    }

    const previousSessionKey = previousSessionKeyRef.current;
    if (previousSessionKey && previousSessionKey !== tutorSessionKey) {
      setInputValue('');
      setPersistedSelectionRect(null);
      setContextSwitchNotice(
        isOpen
          ? getContextSwitchNotice({
            surface: sessionContext?.surface,
            title: sessionContext?.title ?? null,
            questionProgressLabel: sessionContext?.questionProgressLabel ?? null,
            assignmentSummary: sessionContext?.assignmentSummary ?? null,
          })
          : null
      );
    }

    previousSessionKeyRef.current = tutorSessionKey;
    persistTutorSessionKey(tutorSessionKey);
  }, [
    isOpen,
    sessionContext?.assignmentSummary,
    sessionContext?.questionProgressLabel,
    sessionContext?.surface,
    sessionContext?.title,
    tutorSessionKey,
  ]);

  useEffect(() => {
    if (!contextSwitchNotice || !isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setContextSwitchNotice(null);
    }, 4_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [contextSwitchNotice, isOpen]);

  useEffect(() => {
    if (!selectionTelemetryKey) {
      lastShownSelectionKeyRef.current = null;
      return;
    }

    if (lastShownSelectionKeyRef.current === selectionTelemetryKey) {
      return;
    }

    lastShownSelectionKeyRef.current = selectionTelemetryKey;
    trackKangurClientEvent('kangur_ai_tutor_selection_cta_shown', {
      surface: sessionContext?.surface ?? null,
      contentId: sessionContext?.contentId ?? null,
      title: sessionContext?.title ?? null,
      selectionLength: selectedText?.trim().length ?? 0,
    });
  }, [
    selectionTelemetryKey,
    selectedText,
    sessionContext?.contentId,
    sessionContext?.surface,
    sessionContext?.title,
  ]);

  const anchorKinds = useMemo(
    () => getAnchorKindsForSurface(sessionContext?.surface, sessionContext?.answerRevealed),
    [sessionContext?.answerRevealed, sessionContext?.surface]
  );
  const anchorKindsKey = anchorKinds.join(':');

  const registeredAnchor = useMemo(() => {
    if (!isOpen || !tutorAnchorContext) {
      return null;
    }

    return selectBestTutorAnchor({
      anchors: tutorAnchorContext.anchors,
      surface: sessionContext?.surface,
      contentId: sessionContext?.contentId ?? null,
      kinds: anchorKinds,
    });
  }, [
    anchorKinds,
    anchorKindsKey,
    isOpen,
    sessionContext?.contentId,
    sessionContext?.surface,
    tutorAnchorContext,
    viewportTick,
  ]);

  const activeFocus = useMemo<ActiveTutorFocus>(() => {
    if (activeSelectionRect) {
      return {
        rect: activeSelectionRect,
        kind: 'selection',
        id: 'selection',
        label: activeSelectedText,
        assignmentId: null,
      };
    }

    if (registeredAnchor) {
      return {
        rect: registeredAnchor.getRect(),
        kind: registeredAnchor.kind,
        id: registeredAnchor.id,
        label: registeredAnchor.metadata?.label ?? null,
        assignmentId: registeredAnchor.metadata?.assignmentId ?? null,
      };
    }

    return {
      rect: null,
      kind: null,
      id: null,
      label: null,
      assignmentId: null,
    };
  }, [activeSelectedText, activeSelectionRect, registeredAnchor, viewportTick]);

  const focusChipLabel = getFocusChipLabel(activeFocus, activeSelectedText);
  const selectionActionStyle = selectionRect ? getSelectionActionStyle(selectionRect) : null;
  const avatarStyle =
    isOpen && activeFocus.rect ? getAnchorAvatarStyle(activeFocus.rect) : getDockAvatarStyle();
  const isMobileSheet = viewport.width < motionProfile.sheetBreakpoint;
  const bubblePlacement = getBubblePlacement(
    isOpen && !isMobileSheet ? activeFocus.rect : null,
    viewport,
    isMobileSheet ? 'sheet' : 'bubble',
    {
      desktop: motionProfile.desktopBubbleWidth,
      mobile: motionProfile.mobileBubbleWidth,
    }
  );
  const focusTelemetryKey = useMemo(
    () => (isOpen ? getFocusTelemetryKey(tutorSessionKey, activeFocus) : null),
    [activeFocus, isOpen, tutorSessionKey]
  );
  const selectedTextPreview = activeSelectedText?.slice(0, 140) ?? null;
  const hasCurrentQuestion = Boolean(sessionContext?.currentQuestion?.trim());
  const hasAssignmentSummary = Boolean(sessionContext?.assignmentSummary?.trim());
  const quickActions = buildQuickActions({
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasSelectedText: Boolean(activeSelectedText),
    hasCurrentQuestion,
    hasAssignmentSummary,
    focusKind: activeFocus.kind,
  });
  const emptyStateMessage = getEmptyStateMessage({
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasCurrentQuestion,
    hasAssignmentSummary,
    hasSelectedText: Boolean(activeSelectedText),
  });
  const inputPlaceholder = getInputPlaceholder({
    canSendMessages,
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasCurrentQuestion,
    hasAssignmentSummary,
    hasSelectedText: Boolean(activeSelectedText),
  });

  useEffect(() => {
    if (!isOpen || !focusTelemetryKey || !activeFocus.kind) {
      lastTrackedFocusKeyRef.current = focusTelemetryKey;
      if (motionTimeoutRef.current !== null) {
        window.clearTimeout(motionTimeoutRef.current);
        motionTimeoutRef.current = null;
      }
      return;
    }

    if (lastTrackedFocusKeyRef.current === focusTelemetryKey) {
      return;
    }

    lastTrackedFocusKeyRef.current = focusTelemetryKey;
    trackKangurClientEvent('kangur_ai_tutor_anchor_changed', {
      surface: sessionContext?.surface ?? null,
      contentId: sessionContext?.contentId ?? null,
      title: sessionContext?.title ?? null,
      anchorKind: activeFocus.kind,
      anchorId: activeFocus.id,
      layoutMode: bubblePlacement.mode,
      hasSelectedText: Boolean(activeSelectedText),
    });

    if (motionTimeoutRef.current !== null) {
      window.clearTimeout(motionTimeoutRef.current);
    }
    motionTimeoutRef.current = window.setTimeout(() => {
      trackKangurClientEvent('kangur_ai_tutor_motion_completed', {
        surface: sessionContext?.surface ?? null,
        contentId: sessionContext?.contentId ?? null,
        title: sessionContext?.title ?? null,
        anchorKind: activeFocus.kind,
        anchorId: activeFocus.id,
        layoutMode: bubblePlacement.mode,
        hasSelectedText: Boolean(activeSelectedText),
      });
      motionTimeoutRef.current = null;
    }, motionProfile.motionCompletedDelayMs);

    return () => {
      if (motionTimeoutRef.current !== null) {
        window.clearTimeout(motionTimeoutRef.current);
        motionTimeoutRef.current = null;
      }
    };
  }, [
    activeFocus.id,
    activeFocus.kind,
    activeSelectedText,
    bubblePlacement.mode,
    focusTelemetryKey,
    isOpen,
    motionProfile.motionCompletedDelayMs,
    sessionContext?.contentId,
    sessionContext?.surface,
    sessionContext?.title,
  ]);

  if (!enabled || !mounted) return null;

  const handleOpenChat = (reason: 'toggle' | 'selection'): void => {
    trackKangurClientEvent('kangur_ai_tutor_opened', {
      ...telemetryContext,
      reason,
      hasSelectedText: Boolean(activeSelectedText),
      messageCount: messages.length,
    });
    openChat();
  };

  const handleCloseChat = (reason: 'toggle' | 'header'): void => {
    trackKangurClientEvent('kangur_ai_tutor_closed', {
      ...telemetryContext,
      reason,
      messageCount: messages.length,
    });
    closeChat();
  };

  const handleAskAbout = (): void => {
    if (!allowSelectedTextSupport || !selectedText) return;
    trackKangurClientEvent('kangur_ai_tutor_selection_cta_clicked', {
      surface: sessionContext?.surface ?? null,
      contentId: sessionContext?.contentId ?? null,
      title: sessionContext?.title ?? null,
      selectionLength: selectedText.trim().length,
    });
    const quoted = `"${selectedText}"\n\n`;
    setInputValue(quoted);
    setHighlightedText(selectedText);
    setPersistedSelectionRect(cloneRect(selectionRect));
    handleOpenChat('selection');
  };

  const handleSelectionActionMouseDown = (
    event: React.MouseEvent<HTMLButtonElement>
  ): void => {
    // Keep the browser selection alive long enough for the CTA click to open the tutor
    // against the current highlighted fragment.
    event.preventDefault();
  };

  const handleSend = async (): Promise<void> => {
    const text = inputValue.trim();
    if (!text || isLoading || !canSendMessages) return;
    setInputValue('');
    if (activeSelectedText && selectionRect) {
      setPersistedSelectionRect(cloneRect(selectionRect));
    }
    await sendMessage(text, {
      promptMode: activeSelectedText ? 'selected_text' : 'chat',
      selectedText: activeSelectedText,
      focusKind: activeFocus.kind === 'selection' ? 'selection' : activeFocus.kind ?? undefined,
      focusId: activeFocus.id,
      focusLabel: activeFocus.label,
      assignmentId: activeFocus.assignmentId,
      interactionIntent:
        activeSelectedText || activeFocus.kind === 'review'
          ? activeFocus.kind === 'review'
            ? 'review'
            : 'explain'
          : undefined,
    });
    if (activeSelectedText) {
      clearSelection();
      setHighlightedText(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleQuickAction = async (action: TutorQuickAction): Promise<void> => {
    if (isLoading || !canSendMessages) return;
    if (activeSelectedText && selectionRect) {
      setPersistedSelectionRect(cloneRect(selectionRect));
    }
    trackKangurClientEvent('kangur_ai_tutor_quick_action_clicked', {
      ...telemetryContext,
      action: action.id,
      promptMode: action.promptMode,
      hasSelectedText: Boolean(activeSelectedText),
      focusKind: activeFocus.kind ?? null,
    });
    await sendMessage(action.prompt, {
      promptMode: action.promptMode,
      selectedText: activeSelectedText,
      focusKind: activeFocus.kind === 'selection' ? 'selection' : activeFocus.kind ?? undefined,
      focusId: activeFocus.id,
      focusLabel: activeFocus.label,
      assignmentId: activeFocus.assignmentId,
      interactionIntent:
        action.interactionIntent ??
        getInteractionIntent(action.promptMode, activeFocus.kind, sessionContext?.answerRevealed),
    });
    if (activeSelectedText) {
      clearSelection();
      setHighlightedText(null);
    }
  };

  const handleFollowUpClick = (
    action: KangurAiTutorFollowUpAction,
    messageIndex: number
  ): void => {
    trackKangurClientEvent('kangur_ai_tutor_follow_up_clicked', {
      ...telemetryContext,
      actionId: action.id,
      actionPage: action.page,
      messageIndex,
      hasQuery: Boolean(action.query && Object.keys(action.query).length > 0),
    });
  };

  return createPortal(
    <>
      <AnimatePresence>
        {allowSelectedTextSupport && selectedText && selectionRect && !isOpen && selectionActionStyle ? (
          <motion.div
            key='highlight-tooltip'
            data-testid='kangur-ai-tutor-selection-action'
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            style={selectionActionStyle}
            className='z-[70]'
          >
            <KangurButton
              size='sm'
              variant='primary'
              type='button'
              onMouseDown={handleSelectionActionMouseDown}
              onClick={handleAskAbout}
              className='border-2 border-slate-900 shadow-[4px_4px_0_rgba(15,23,42,0.18)]'
            >
              <BrainCircuit className='h-3.5 w-3.5' />
              Zapytaj o to
            </KangurButton>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        data-testid='kangur-ai-tutor-avatar'
        data-anchor-kind={isOpen ? activeFocus.kind ?? 'dock' : 'dock'}
        data-motion-preset={motionProfile.kind}
        type='button'
        onClick={(): void => (isOpen ? handleCloseChat('toggle') : handleOpenChat('toggle'))}
        initial={false}
        animate={avatarStyle}
        transition={motionProfile.avatarTransition}
        whileHover={{ scale: motionProfile.hoverScale }}
        whileTap={{ scale: motionProfile.tapScale }}
        className={cn(
          'fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full',
          'border-2 border-slate-900 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-400',
          'shadow-[6px_6px_0_rgba(15,23,42,0.18)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2'
        )}
        aria-label={isOpen ? 'Zamknij pomocnika' : 'Otwórz pomocnika AI'}
      >
        <TutorMoodAvatar
          svgContent={tutorAvatarSvg}
          label={`${tutorName} avatar (${tutorMoodId})`}
          className='h-12 w-12 border border-white/25 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
          svgClassName='[&_svg]:drop-shadow-[0_1px_1px_rgba(15,23,42,0.1)]'
          data-testid='kangur-ai-tutor-avatar-image'
        />
        {hasNewMessage && !isOpen && (
          <span className='absolute top-1 right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse' />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {bubblePlacement.mode === 'sheet' ? (
              <motion.button
                key='chat-backdrop'
                type='button'
                aria-label='Zamknij pomocnika'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className='fixed inset-0 z-[62] bg-slate-900/18'
                onClick={(): void => handleCloseChat('toggle')}
              />
            ) : null}
            <motion.div
              key='chat-panel'
              data-testid='kangur-ai-tutor-panel'
              data-layout={bubblePlacement.mode}
              data-motion-preset={motionProfile.kind}
              initial={
                bubblePlacement.mode === 'sheet'
                  ? { opacity: 0, y: 28 }
                  : { opacity: 0, y: 16, scale: 0.97 }
              }
              animate={{
                ...bubblePlacement.style,
                opacity: 1,
                y: 0,
                ...(bubblePlacement.mode === 'sheet' ? {} : { scale: 1 }),
              }}
              exit={
                bubblePlacement.mode === 'sheet'
                  ? { opacity: 0, y: 28 }
                  : { opacity: 0, y: 16, scale: 0.97 }
              }
              transition={motionProfile.bubbleTransition}
              className='fixed z-[65]'
              style={bubblePlacement.width ? { width: bubblePlacement.width } : undefined}
            >
              <KangurGlassPanel
                surface='solid'
                variant='soft'
                className={cn(
                  'relative flex flex-col overflow-hidden border-2 border-slate-900 bg-[#fffdf4]/95 shadow-[8px_8px_0_rgba(15,23,42,0.18)]',
                  bubblePlacement.mode === 'sheet'
                    ? 'rounded-[28px] rounded-b-[24px]'
                    : 'rounded-[28px]'
                )}
                style={{ maxHeight: bubblePlacement.mode === 'sheet' ? 'min(76vh, 680px)' : '70vh' }}
              >
                {bubblePlacement.tailPlacement !== 'dock' ? (
                  <div
                    aria-hidden='true'
                    className={cn(
                      'absolute left-8 h-4 w-4 rotate-45 border-2 border-slate-900 bg-[#fffdf4]',
                      bubblePlacement.tailPlacement === 'top'
                        ? '-top-2 border-b-0 border-r-0'
                        : '-bottom-2 border-t-0 border-l-0'
                    )}
                  />
                ) : null}

                {bubblePlacement.mode === 'sheet' ? (
                  <div className='flex justify-center bg-[#fffdf4]/98 px-3 pt-3'>
                    <div aria-hidden='true' className='h-1.5 w-14 rounded-full bg-slate-300' />
                  </div>
                ) : null}

                <div className='flex items-center justify-between bg-[linear-gradient(135deg,#2f4df6_0%,#e84694_55%,#fbbf24_100%)] px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <TutorMoodAvatar
                      svgContent={tutorAvatarSvg}
                      label={`${tutorName} header avatar (${tutorMoodId})`}
                      className='h-9 w-9 border border-white/20 bg-white/14'
                      svgClassName='[&_svg]:drop-shadow-[0_1px_1px_rgba(15,23,42,0.08)]'
                      data-testid='kangur-ai-tutor-header-avatar-image'
                    />
                    <div className='flex flex-col'>
                      <span className='text-sm font-black uppercase tracking-[0.08em] text-white'>
                        {tutorName}
                      </span>
                      {sessionContext?.title ? (
                        <span className='text-[11px] text-white/85'>
                          {sessionContext.surface === 'test' ? 'Test' : 'Lekcja'}: {sessionContext.title}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={(): void => handleCloseChat('header')}
                    className='text-white/80 hover:text-white transition-colors'
                    aria-label='Zamknij'
                  >
                    <X className='h-4 w-4' />
                  </button>
                </div>

                <div className='border-b border-slate-900/10 bg-[#fff7cf]/80 px-3 py-3'>
                  {contextSwitchNotice ? (
                    <div
                      data-testid='kangur-ai-tutor-context-switch'
                      className='mb-3 rounded-[20px] border-2 border-slate-900 bg-white px-3 py-2 shadow-[4px_4px_0_rgba(15,23,42,0.12)]'
                    >
                      <div className='text-[10px] font-black uppercase tracking-[0.16em] text-rose-600'>
                        {contextSwitchNotice.title}
                      </div>
                      <div className='mt-1 text-sm font-semibold text-slate-900'>
                        {contextSwitchNotice.target}
                      </div>
                      {contextSwitchNotice.detail ? (
                        <div className='mt-1 text-[11px] leading-relaxed text-slate-600'>
                          {contextSwitchNotice.detail}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className='flex flex-wrap items-start gap-2'>
                    {focusChipLabel ? (
                      <span
                        data-testid='kangur-ai-tutor-focus-chip'
                        className='rounded-full border border-slate-900 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-900'
                      >
                        {focusChipLabel}
                      </span>
                    ) : null}
                    {activeFocus.label && activeFocus.kind !== 'selection' ? (
                      <span className='rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700'>
                        {activeFocus.label}
                      </span>
                    ) : null}
                  </div>
                  {activeSelectedText ? (
                    <div className='mt-2 rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-xs italic leading-relaxed text-slate-700'>
                    "{selectedTextPreview}"
                      {activeSelectedText.length > (selectedTextPreview?.length ?? 0) ? '…' : ''}
                    </div>
                  ) : null}
                </div>

                <div className='flex flex-wrap gap-2 border-b border-slate-100 px-3 py-3'>
                  {usageSummary && usageSummary.dailyMessageLimit !== null ? (
                    <div className='w-full rounded-2xl border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-[11px] text-indigo-900'>
                      <div className='flex items-center justify-between gap-3'>
                        <span className='font-semibold'>
                        Limit dzisiaj: {usageSummary.messageCount}/{usageSummary.dailyMessageLimit}
                        </span>
                        <span className='text-indigo-700'>
                          {isUsageLoading
                            ? 'Aktualizuję…'
                            : remainingMessages === 0
                              ? 'Limit wyczerpany'
                              : `Pozostało ${remainingMessages}`}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  {quickActions.map((action) => (
                    <KangurButton
                      key={action.id}
                      data-testid={`kangur-ai-tutor-quick-action-${action.id}`}
                      type='button'
                      size='sm'
                      variant='surface'
                      className='h-9 px-3 text-xs'
                      disabled={isLoading || !canSendMessages}
                      onClick={() => void handleQuickAction(action)}
                    >
                      {action.label}
                    </KangurButton>
                  ))}
                </div>

                <div className='flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3'>
                  {messages.length === 0 ? (
                    <p className='text-center text-xs text-slate-500 py-4'>
                      {emptyStateMessage}
                    </p>
                  ) : (
                    messages.map((msg, index) =>
                      msg.role === 'user' ? (
                        <div key={index} className='flex justify-end'>
                          <div className='max-w-[80%] rounded-[22px] border border-indigo-500 bg-indigo-500 px-3 py-2 text-sm leading-relaxed text-white shadow-sm'>
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div key={index} className='flex justify-start'>
                          <div className='w-full max-w-[90%] space-y-2'>
                            <div className='rounded-[22px] border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm'>
                              {msg.content}
                            </div>
                            {msg.followUpActions?.length ? (
                              <div className='space-y-2'>
                                <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
                                Kolejny krok
                                </div>
                                <div className='grid gap-2 sm:grid-cols-2'>
                                  {msg.followUpActions.map((action) => (
                                    <div
                                      key={action.id}
                                      className='rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-3'
                                    >
                                      {action.reason ? (
                                        <div className='text-xs font-medium leading-relaxed text-slate-700'>
                                          {action.reason}
                                        </div>
                                      ) : null}
                                      <KangurButton
                                        asChild
                                        size='sm'
                                        variant={getKangurRecommendationButtonVariant(action.page)}
                                        className={cn('mt-2 w-full', action.reason ? '' : 'mt-0')}
                                      >
                                        <Link
                                          href={toFollowUpHref(basePath, action)}
                                          onClick={() => handleFollowUpClick(action, index)}
                                        >
                                          {action.label}
                                        </Link>
                                      </KangurButton>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {showSources && msg.sources?.length ? (
                              <div className='space-y-2'>
                                <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
                                Zrodla
                                </div>
                                {msg.sources.slice(0, 3).map((source) => (
                                  <div
                                    key={`${source.collectionId}-${source.documentId}`}
                                    className='rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-left shadow-sm'
                                  >
                                    <div className='text-[11px] font-semibold text-slate-700'>
                                      {source.metadata?.title?.trim() || `[doc:${source.documentId}]`}
                                    </div>
                                    <div className='mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400'>
                                      {source.collectionId} · score {source.score.toFixed(3)}
                                    </div>
                                    {source.text?.trim() ? (
                                      <div className='mt-1 text-xs leading-relaxed text-slate-600'>
                                        {source.text.trim().slice(0, 180)}
                                        {source.text.trim().length > 180 ? '…' : ''}
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    )
                  )}
                  {isLoading && (
                    <div className='flex justify-start'>
                      <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2'>
                        <span className='text-slate-400 text-xs animate-pulse'>Myślę…</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className='border-t border-slate-100 px-3 py-3 flex gap-2 items-center'>
                  <KangurTextField
                    ref={inputRef}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    accent='indigo'
                    size='sm'
                    className='flex-1'
                    disabled={isLoading || !canSendMessages}
                    placeholder={inputPlaceholder}
                    aria-label='Wpisz pytanie'
                  />
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='primary'
                    onClick={() => void handleSend()}
                    disabled={!inputValue.trim() || isLoading || !canSendMessages}
                    aria-label='Wyślij'
                  >
                    <Send className='h-3.5 w-3.5' />
                  </KangurButton>
                </div>
              </KangurGlassPanel>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}

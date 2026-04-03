'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { resolveKangurPageContentFragment } from '@/features/kangur/ai-tutor/page-content-fragments';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton, KangurPanelRow } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { KANGUR_PAGE_CONTENT_COLLECTION } from '@/features/kangur/shared/contracts/kangur-page-content';
import { cn } from '@/features/kangur/shared/utils';
import type { KangurAiTutorRuntimeMessage } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorWarmInsetCard,
  KangurAiTutorWarmOverlayPanel,
} from './KangurAiTutorChrome';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { useKangurAiTutorPortalContext } from './KangurAiTutorPortal.context';
import { useKangurAiTutorWidgetStateContext } from './ai-tutor-widget/KangurAiTutorWidget.state';

import type { GuidedTutorTarget } from './ai-tutor-widget/KangurAiTutorWidget.types';
import type { ComponentProps, JSX } from 'react';

const GUIDED_CALLOUT_ENTRY_OFFSET_PX = 72;

type GuidedCalloutState = ReturnType<typeof useKangurAiTutorPortalContext>['guidedCallout'];
type GuidedCalloutContent = ReturnType<typeof useKangurAiTutorContent>;
type GuidedCalloutPanelBodyState = ReturnType<typeof useKangurAiTutorPanelBodyContext>;
type GuidedCalloutWidgetState = ReturnType<typeof useKangurAiTutorWidgetStateContext>;
type GuidedCalloutKnowledgeReference = Parameters<
  typeof resolveKangurPageContentFragment
>[0]['knowledgeReference'];
type GuidedCalloutKnowledgeEntry = Parameters<typeof resolveKangurPageContentFragment>[0]['entry'];
type GuidedCalloutKnowledgeFragment = ReturnType<typeof resolveKangurPageContentFragment>;
type GuidedCalloutQuickAction = GuidedCalloutPanelBodyState['visibleQuickActions'][number];
type GuidedCalloutMotionProps = Pick<
  ComponentProps<typeof motion.div>,
  'animate' | 'exit' | 'initial' | 'transition'
>;

const isSelectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'selection' }> => value?.mode === 'selection';

const isSectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'section' }> => value?.mode === 'section';

const getLatestAssistantMessage = (
  messages: KangurAiTutorRuntimeMessage[]
): KangurAiTutorRuntimeMessage | null =>
  [...messages].reverse().find((message) => message.role === 'assistant') ?? null;

type GuidedCalloutFallbackCopy = {
  knowledgeFragmentBadge: string;
  pageContentBadge: string;
  savedPageContentBadge: string;
  selectionDetailFromPageContent: string;
  selectionDetailReady: string;
  selectionSketchCtaLabel: string;
  selectionSketchHint: string;
};

const GUIDED_CALLOUT_FALLBACK_COPY_BY_LOCALE: Record<string, GuidedCalloutFallbackCopy> = {
  uk: {
    knowledgeFragmentBadge: 'Фрагмент з бази знань',
    pageContentBadge: 'Вміст сторінки',
    savedPageContentBadge: 'Збережений вміст сторінки',
    selectionDetailFromPageContent:
      'Пояснення використовує збережений вміст сторінки для цього виділення.',
    selectionDetailReady: 'Пояснення вже готове для вибраного фрагмента.',
    selectionSketchCtaLabel: 'Намалюй це для мене',
    selectionSketchHint:
      'Відкриваю дошку для малювання. Спробуй намалювати поділи та порівняти фігури після повороту або віддзеркалення.',
  },
  de: {
    knowledgeFragmentBadge: 'Wissensbasis-Ausschnitt',
    pageContentBadge: 'Seiteninhalt',
    savedPageContentBadge: 'Gespeicherter Seiteninhalt',
    selectionDetailFromPageContent:
      'Die Erklarung nutzt den gespeicherten Seiteninhalt fur diese Auswahl.',
    selectionDetailReady: 'Die Erklarung fur den ausgewahlten Ausschnitt ist bereits fertig.',
    selectionSketchCtaLabel: 'Zeig es mir als Skizze',
    selectionSketchHint:
      'Ich offne das Zeichenfeld. Skizziere die Aufteilung und vergleiche die Formen nach Drehung oder Spiegelung.',
  },
  en: {
    knowledgeFragmentBadge: 'Knowledge base fragment',
    pageContentBadge: 'Page content',
    savedPageContentBadge: 'Saved page content',
    selectionDetailFromPageContent:
      'The explanation uses the saved page content for this selection.',
    selectionDetailReady: 'The explanation for the selected fragment is already ready.',
    selectionSketchCtaLabel: 'Sketch it out for me',
    selectionSketchHint:
      'I am opening the drawing board. Try sketching the partitions and comparing the shapes after a rotation or reflection.',
  },
  pl: {
    knowledgeFragmentBadge: 'Fragment z bazy wiedzy',
    pageContentBadge: 'Treść strony',
    savedPageContentBadge: 'Zapisana treść strony',
    selectionDetailFromPageContent:
      'Wyjaśnienie korzysta z zapisanej treści strony dla tego zaznaczenia.',
    selectionDetailReady: 'Wyjaśnienie jest już gotowe dla zaznaczonego fragmentu.',
    selectionSketchCtaLabel: 'Rozrysuj mi to, proszę',
    selectionSketchHint:
      'Otwieram planszę do rysowania. Spróbuj rozrysować podziały i porównać kształty po obrocie lub odbiciu.',
  },
};

const getGuidedCalloutFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): GuidedCalloutFallbackCopy =>
  GUIDED_CALLOUT_FALLBACK_COPY_BY_LOCALE[locale] ??
  GUIDED_CALLOUT_FALLBACK_COPY_BY_LOCALE['pl']!;

const resolveTutorGuidedFallback = (
  value: string | null | undefined,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  return value;
};

const resolveSelectedText = ({
  activeSelectedText,
  guidedTutorTarget,
  selectionConversationContext,
  selectionGuidanceHandoffText,
  selectionResponsePending,
}: {
  activeSelectedText: string | null;
  guidedTutorTarget: GuidedCalloutWidgetState['guidedTutorTarget'];
  selectionConversationContext: GuidedCalloutWidgetState['selectionConversationContext'];
  selectionGuidanceHandoffText: GuidedCalloutWidgetState['selectionGuidanceHandoffText'];
  selectionResponsePending: GuidedCalloutWidgetState['selectionResponsePending'];
}): string | null =>
  selectionConversationContext?.selectedText ??
  selectionResponsePending?.selectedText ??
  selectionGuidanceHandoffText ??
  activeSelectedText ??
  (isSelectionGuidedTutorTarget(guidedTutorTarget) ? guidedTutorTarget.selectedText : null) ??
  null;

const resolveSectionLabel = ({
  guidedTutorTarget,
  sectionGuidanceLabel,
  sectionResponsePendingKind,
}: {
  guidedTutorTarget: GuidedCalloutWidgetState['guidedTutorTarget'];
  sectionGuidanceLabel: string | null;
  sectionResponsePendingKind: string | null;
}): string | null =>
  sectionGuidanceLabel ??
  (isSectionGuidedTutorTarget(guidedTutorTarget) ? guidedTutorTarget.kind : sectionResponsePendingKind);

const resolveHintQuickAction = (
  visibleQuickActions: GuidedCalloutPanelBodyState['visibleQuickActions'],
  tutorContent: GuidedCalloutContent
): GuidedCalloutQuickAction =>
  visibleQuickActions.find((candidate) => candidate.id === 'hint') ?? {
    id: 'hint',
    label: tutorContent.quickActions.hint.defaultLabel,
    prompt: tutorContent.quickActions.hint.defaultPrompt,
    promptMode: 'hint' as const,
    interactionIntent: 'hint' as const,
  };

const resolvePageContentEntryId = (
  knowledgeReference: GuidedCalloutKnowledgeReference
): string | null =>
  knowledgeReference?.sourceCollection === KANGUR_PAGE_CONTENT_COLLECTION
    ? knowledgeReference.sourceRecordId
    : null;

function useGuidedCalloutSelectionState({
  activeFocus,
  activeSelectedText,
  guidedTutorTarget,
  messages,
  mode,
  selectionConversationContext,
  selectionGuidanceHandoffText,
  selectionResponsePending,
  tutorContent,
  visibleQuickActions,
}: {
  activeFocus: GuidedCalloutPanelBodyState['activeFocus'];
  activeSelectedText: string | null;
  guidedTutorTarget: GuidedCalloutWidgetState['guidedTutorTarget'];
  messages: GuidedCalloutPanelBodyState['messages'];
  mode: GuidedCalloutState['mode'];
  selectionConversationContext: GuidedCalloutWidgetState['selectionConversationContext'];
  selectionGuidanceHandoffText: GuidedCalloutWidgetState['selectionGuidanceHandoffText'];
  selectionResponsePending: GuidedCalloutWidgetState['selectionResponsePending'];
  tutorContent: GuidedCalloutContent;
  visibleQuickActions: GuidedCalloutPanelBodyState['visibleQuickActions'];
}) {
  const resolvedSelectedText = resolveSelectedText({
    activeSelectedText,
    guidedTutorTarget,
    selectionConversationContext,
    selectionGuidanceHandoffText,
    selectionResponsePending,
  });
  const resolvedSelectedKnowledgeReference =
    selectionConversationContext?.knowledgeReference ??
    activeFocus.conversationFocus.knowledgeReference ??
    null;
  const resolvedSelectedKnowledgeLabel =
    selectionConversationContext?.focusLabel ?? activeFocus.conversationFocus.label ?? null;
  const { entry: selectedKnowledgeEntry } = useKangurPageContentEntry(
    resolvePageContentEntryId(resolvedSelectedKnowledgeReference)
  );
  const selectedKnowledgeFragment = useMemo(
    () =>
      selectedKnowledgeEntry
        ? resolveKangurPageContentFragment({
            entry: selectedKnowledgeEntry,
            knowledgeReference: resolvedSelectedKnowledgeReference,
            selectedText: resolvedSelectedText,
          })
        : null,
    [resolvedSelectedKnowledgeReference, resolvedSelectedText, selectedKnowledgeEntry]
  );
  const resolvedSelectionAssistantMessage = useMemo(
    () => (mode === 'selection' ? getLatestAssistantMessage(messages) : null),
    [messages, mode]
  );
  const hintQuickAction = useMemo(
    () => resolveHintQuickAction(visibleQuickActions, tutorContent),
    [
      tutorContent.quickActions.hint.defaultLabel,
      tutorContent.quickActions.hint.defaultPrompt,
      visibleQuickActions,
    ]
  );

  return {
    hintQuickAction,
    resolvedSelectedKnowledgeLabel,
    resolvedSelectedKnowledgeReference,
    resolvedSelectedText,
    resolvedSelectionAssistantMessage,
    selectedKnowledgeEntry,
    selectedKnowledgeFragment,
  };
}

const resolveGuidedSelectionDisplayState = ({
  detail,
  fallbackCopy,
  isLoading,
  isSelectionExplainPendingMode,
  isTestSurface,
  lastInteractionIntent,
  lastPromptMode,
  mode,
  resolvedSelectedKnowledgeLabel,
  resolvedSelectedKnowledgeReference,
  resolvedSelectionAssistantMessage,
  selectedKnowledgeEntry,
  selectedKnowledgeFragment,
  showSelectionGuidanceCallout,
}: {
  detail: string | null | undefined;
  fallbackCopy: GuidedCalloutFallbackCopy;
  isLoading: boolean;
  isSelectionExplainPendingMode: boolean;
  isTestSurface: boolean;
  lastInteractionIntent: GuidedCalloutPanelBodyState['lastInteractionIntent'];
  lastPromptMode: GuidedCalloutPanelBodyState['lastPromptMode'];
  mode: GuidedCalloutState['mode'];
  resolvedSelectedKnowledgeLabel: string | null;
  resolvedSelectedKnowledgeReference: GuidedCalloutKnowledgeReference;
  resolvedSelectionAssistantMessage: KangurAiTutorRuntimeMessage | null;
  selectedKnowledgeEntry: GuidedCalloutKnowledgeEntry | null;
  selectedKnowledgeFragment: GuidedCalloutKnowledgeFragment;
  showSelectionGuidanceCallout: boolean;
}) => {
  const isResolvedSelectionCallout =
    mode === 'selection' &&
    showSelectionGuidanceCallout &&
    !isSelectionExplainPendingMode &&
    !isLoading &&
    resolvedSelectionAssistantMessage !== null;
  const hasKnowledgeBackedSelectionAnswer =
    resolvedSelectionAssistantMessage?.answerResolutionMode === 'page_content';
  const shouldHideResolvedSelectionAnswer =
    isResolvedSelectionCallout && isTestSurface && !hasKnowledgeBackedSelectionAnswer;
  const isHintResponseCandidate =
    resolvedSelectionAssistantMessage?.coachingFrame?.mode === 'hint_ladder' ||
    lastPromptMode === 'hint' ||
    lastInteractionIntent === 'hint';
  const shouldShowSelectedKnowledgeReference =
    mode === 'selection' &&
    showSelectionGuidanceCallout &&
    !isTestSurface &&
    (
      resolvedSelectedKnowledgeReference?.sourceCollection === KANGUR_PAGE_CONTENT_COLLECTION ||
      hasKnowledgeBackedSelectionAnswer
    );
  const selectedKnowledgeTitle = resolvedSelectedKnowledgeLabel ?? selectedKnowledgeEntry?.title ?? null;
  const selectedKnowledgeSummary =
    selectedKnowledgeFragment?.explanation ?? selectedKnowledgeEntry?.summary ?? null;
  const resolvedSelectionDetail = hasKnowledgeBackedSelectionAnswer
    ? fallbackCopy.selectionDetailFromPageContent
    : isResolvedSelectionCallout
      ? fallbackCopy.selectionDetailReady
      : detail;

  return {
    hasKnowledgeBackedSelectionAnswer,
    isResolvedSelectionCallout,
    selectedKnowledgeSummary,
    selectedKnowledgeTitle,
    shouldHideResolvedSelectionAnswer,
    shouldShowHintFollowUp:
      isResolvedSelectionCallout &&
      (isHintResponseCandidate || shouldHideResolvedSelectionAnswer),
    shouldShowSelectedKnowledgeReference,
    shouldShowSelectionDetail: Boolean(resolvedSelectionDetail),
    shouldShowSelectionIntro: !(mode === 'selection' && isResolvedSelectionCallout),
    shouldShowSelectionPageContentBadge:
      hasKnowledgeBackedSelectionAnswer && !shouldHideResolvedSelectionAnswer,
    shouldShowSelectionPreparingBadge:
      mode === 'selection' && !isResolvedSelectionCallout && !shouldShowSelectedKnowledgeReference,
    resolvedSelectionDetail,
  };
};

const resolveGuidedCalloutLayoutState = ({
  avatarPlacement,
  headerLabel,
  isCoarsePointer,
  mode,
  resolvedSelectionDetail,
  showSelectionGuidanceCallout,
  stepLabel,
  style,
  title,
}: {
  avatarPlacement: GuidedCalloutState['avatarPlacement'];
  headerLabel: string;
  isCoarsePointer: boolean;
  mode: GuidedCalloutState['mode'];
  resolvedSelectionDetail: string | null | undefined;
  showSelectionGuidanceCallout: boolean;
  stepLabel: string | null;
  style: GuidedCalloutState['style'];
  title: string | null | undefined;
}) => ({
  accessibleCalloutDescription: [stepLabel, resolvedSelectionDetail]
    .filter((value): value is string => Boolean(value))
    .join(' '),
  accessibleCalloutTitle: title ?? headerLabel,
  compactActionClassName: isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto',
  isMobileHomeOnboardingSheet:
    mode === 'home_onboarding' && style?.bottom !== undefined && style?.top === undefined,
  selectionKeepoutClassName: cn(
    showSelectionGuidanceCallout && avatarPlacement === 'bottom' && 'pb-2',
    showSelectionGuidanceCallout && avatarPlacement === 'top' && 'pt-2'
  ),
  selectionPreparingBadgeInsetClassName: cn(
    avatarPlacement === 'bottom' && 'mb-2',
    avatarPlacement === 'top' && 'mt-1',
    avatarPlacement === 'left' && 'ml-4',
    avatarPlacement === 'right' && 'mr-4'
  ),
  shouldAnnounceCallout: mode === 'selection' || mode === 'section' || mode === 'auth',
});

function useGuidedCalloutSketchState({
  calloutKey,
  drawingPanelAvailable,
  drawingPanelOpen,
  handleOpenDrawingPanel,
  handleToggleDrawing,
  shouldShowSketchCta,
}: {
  calloutKey: string;
  drawingPanelAvailable: GuidedCalloutPanelBodyState['drawingPanelAvailable'];
  drawingPanelOpen: boolean;
  handleOpenDrawingPanel: GuidedCalloutPanelBodyState['handleOpenDrawingPanel'];
  handleToggleDrawing: GuidedCalloutPanelBodyState['handleToggleDrawing'];
  shouldShowSketchCta: boolean;
}) {
  const [showSketchHint, setShowSketchHint] = useState(false);
  const canOpenDrawingPanel = Boolean(drawingPanelAvailable);

  useEffect(() => {
    setShowSketchHint(false);
  }, [calloutKey]);

  useEffect(() => {
    if (!shouldShowSketchCta) {
      setShowSketchHint(false);
    }
  }, [shouldShowSketchCta]);

  return {
    canOpenDrawingPanel,
    handleSketchRequest: (): void => {
      setShowSketchHint(true);
      if (canOpenDrawingPanel) {
        handleOpenDrawingPanel();
        return;
      }
      handleToggleDrawing();
    },
    shouldShowSketchHint: showSketchHint || drawingPanelOpen,
  };
}

const resolveGuidedCalloutMotionProps = ({
  entryDirection,
  prefersReducedMotion,
  reducedMotionTransitions,
  transitionDuration,
  transitionEase,
  usesDirectionalEntry,
}: {
  entryDirection: GuidedCalloutState['entryDirection'];
  prefersReducedMotion: boolean;
  reducedMotionTransitions: GuidedCalloutState['reducedMotionTransitions'];
  transitionDuration: number;
  transitionEase: GuidedCalloutState['transitionEase'];
  usesDirectionalEntry: boolean;
}): GuidedCalloutMotionProps => ({
  animate: { ...reducedMotionTransitions.stableState, x: 0 },
  exit: prefersReducedMotion ? { ...reducedMotionTransitions.stableState, x: 0 } : { opacity: 0 },
  initial: prefersReducedMotion
    ? { ...reducedMotionTransitions.stableState, x: 0 }
    : usesDirectionalEntry
      ? {
          ...reducedMotionTransitions.stableState,
          opacity: 0,
          x:
            entryDirection === 'left'
              ? -GUIDED_CALLOUT_ENTRY_OFFSET_PX
              : GUIDED_CALLOUT_ENTRY_OFFSET_PX,
          scale: 0.98,
        }
      : {
          ...reducedMotionTransitions.stableState,
          opacity: 0,
          x: 0,
        },
  transition: prefersReducedMotion
    ? reducedMotionTransitions.instant
    : {
        duration: transitionDuration,
        ease: transitionEase,
      },
});

function KangurAiTutorGuidedCalloutShell({
  accessibleCalloutDescription,
  accessibleCalloutTitle,
  calloutDescriptionId,
  calloutKey,
  calloutLabelId,
  calloutTestId,
  children,
  entryDirection,
  isResolvedSelectionCallout,
  isMobileHomeOnboardingSheet,
  placement,
  prefersReducedMotion,
  reducedMotionTransitions,
  shouldAnnounceCallout,
  style,
  transitionDuration,
  transitionEase,
  usesDirectionalEntry,
}: {
  accessibleCalloutDescription: string;
  accessibleCalloutTitle: string;
  calloutDescriptionId: string;
  calloutKey: string;
  calloutLabelId: string;
  calloutTestId: string;
  children: JSX.Element;
  entryDirection: GuidedCalloutState['entryDirection'];
  isResolvedSelectionCallout: boolean;
  isMobileHomeOnboardingSheet: boolean;
  placement: GuidedCalloutState['placement'];
  prefersReducedMotion: boolean;
  reducedMotionTransitions: GuidedCalloutState['reducedMotionTransitions'];
  shouldAnnounceCallout: boolean;
  style: NonNullable<GuidedCalloutState['style']>;
  transitionDuration: number;
  transitionEase: GuidedCalloutState['transitionEase'];
  usesDirectionalEntry: boolean;
}): JSX.Element {
  const motionProps = resolveGuidedCalloutMotionProps({
    entryDirection,
    prefersReducedMotion,
    reducedMotionTransitions,
    transitionDuration,
    transitionEase,
    usesDirectionalEntry,
  });

  return (
    <motion.div
      data-kangur-ai-tutor-root='true'
      key={calloutKey}
      data-testid={calloutTestId}
      data-entry-direction={entryDirection}
      data-entry-animation={usesDirectionalEntry ? 'directional' : 'fade'}
      data-guidance-motion='gentle'
      data-guidance-placement={placement}
      role='region'
      aria-live={shouldAnnounceCallout ? 'polite' : undefined}
      aria-atomic={shouldAnnounceCallout ? 'true' : undefined}
      aria-labelledby={calloutLabelId}
      aria-describedby={accessibleCalloutDescription ? calloutDescriptionId : undefined}
      style={style}
      className='z-[73]'
      {...motionProps}
    >
      <h2 id={calloutLabelId} className='sr-only'>
        {accessibleCalloutTitle}
      </h2>
      {accessibleCalloutDescription ? (
        <p id={calloutDescriptionId} className='sr-only'>
          {accessibleCalloutDescription}
        </p>
      ) : null}
      <KangurAiTutorWarmOverlayPanel
        padding='md'
        className={cn(
          isMobileHomeOnboardingSheet &&
            '!p-3 shadow-[0_16px_40px_-28px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5)]',
          isResolvedSelectionCallout && 'max-h-[min(72vh,560px)] overflow-y-auto'
        )}
      >
        {children}
      </KangurAiTutorWarmOverlayPanel>
    </motion.div>
  );
}

function KangurAiTutorGuidedCalloutHeader({
  closeAriaLabel,
  headerLabel,
  onClose,
  showCloseButton,
}: {
  closeAriaLabel: string;
  headerLabel: string;
  onClose: () => void;
  showCloseButton: boolean;
}): JSX.Element {
  return (
    <KangurPanelRow className='items-start sm:justify-between'>
      <KangurAiTutorChromeKicker>{headerLabel}</KangurAiTutorChromeKicker>
      {showCloseButton ? (
        <KangurAiTutorChromeCloseButton
          data-testid='kangur-ai-tutor-guided-callout-close'
          onClick={onClose}
          aria-label={closeAriaLabel}
          className='self-start sm:self-auto'
        />
      ) : null}
    </KangurPanelRow>
  );
}

function KangurAiTutorGuidedCalloutStepLabel({
  isMobileHomeOnboardingSheet,
  stepLabel,
}: {
  isMobileHomeOnboardingSheet: boolean;
  stepLabel: string | null;
}): JSX.Element | null {
  if (!stepLabel) {
    return null;
  }

  return (
    <div
      className={cn(
        'mt-1 text-[10px] font-semibold tracking-[0.16em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
        isMobileHomeOnboardingSheet && 'mt-0.5'
      )}
    >
      {stepLabel}
    </div>
  );
}

function KangurAiTutorGuidedCalloutIntro({
  detail,
  isMobileHomeOnboardingSheet,
  shouldShowDetail,
  shouldShowIntro,
  title,
}: {
  detail: string | null | undefined;
  isMobileHomeOnboardingSheet: boolean;
  shouldShowDetail: boolean;
  shouldShowIntro: boolean;
  title: string | null | undefined;
}): JSX.Element | null {
  if (!shouldShowIntro) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'mt-1 text-sm font-semibold leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
          isMobileHomeOnboardingSheet && 'text-[13px] leading-6'
        )}
      >
        {title}
      </div>
      {shouldShowDetail ? (
        <div
          className={cn(
            'mt-2 text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
            isMobileHomeOnboardingSheet && 'mt-1.5 line-clamp-3 text-[11px] leading-5'
          )}
        >
          {detail}
        </div>
      ) : null}
    </>
  );
}

function KangurAiTutorGuidedCalloutSectionCard({
  label,
  prefix,
  shouldShow,
}: {
  label: string | null;
  prefix: string;
  shouldShow: boolean;
}): JSX.Element | null {
  if (!shouldShow) {
    return null;
  }

  return (
    <KangurAiTutorWarmInsetCard tone='guide' className='mt-3 px-3 py-2 text-xs leading-relaxed'>
      {prefix}: {label}
    </KangurAiTutorWarmInsetCard>
  );
}

function KangurAiTutorGuidedSelectionSourceCard({
  fallbackCopy,
  selectedKnowledgeFragment,
  selectedKnowledgeSummary,
  selectedKnowledgeTitle,
  shouldShow,
}: {
  fallbackCopy: GuidedCalloutFallbackCopy;
  selectedKnowledgeFragment: GuidedCalloutKnowledgeFragment;
  selectedKnowledgeSummary: string | null;
  selectedKnowledgeTitle: string | null;
  shouldShow: boolean;
}): JSX.Element | null {
  if (!shouldShow) {
    return null;
  }

  return (
    <KangurAiTutorWarmInsetCard
      data-testid='kangur-ai-tutor-selection-guided-source'
      tone='panel'
      className='mt-3 px-3 py-3'
    >
      <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
        {selectedKnowledgeTitle ? (
          <KangurAiTutorChromeBadge className='px-3 py-1 text-[10px] normal-case tracking-normal'>
            {selectedKnowledgeTitle}
          </KangurAiTutorChromeBadge>
        ) : null}
        <KangurAiTutorChromeBadge className='px-3 py-1 text-[10px]'>
          {selectedKnowledgeFragment
            ? fallbackCopy.knowledgeFragmentBadge
            : fallbackCopy.pageContentBadge}
        </KangurAiTutorChromeBadge>
      </div>
      {selectedKnowledgeSummary ? (
        <div className='mt-2 text-xs leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
          {selectedKnowledgeSummary}
        </div>
      ) : null}
    </KangurAiTutorWarmInsetCard>
  );
}

function KangurAiTutorGuidedSelectionSketchCard({
  canOpenDrawingPanel,
  canSendMessages,
  drawingPanelOpen,
  fallbackCopy,
  isLoading,
  onSketchRequest,
  shouldShow,
  shouldShowSketchHint,
  tutorContent,
}: {
  canOpenDrawingPanel: boolean;
  canSendMessages: boolean;
  drawingPanelOpen: boolean;
  fallbackCopy: GuidedCalloutFallbackCopy;
  isLoading: boolean;
  onSketchRequest: () => void;
  shouldShow: boolean;
  shouldShowSketchHint: boolean;
  tutorContent: GuidedCalloutContent;
}): JSX.Element | null {
  if (!shouldShow) {
    return null;
  }

  return (
    <div
      data-testid='kangur-ai-tutor-selection-sketch-cta'
      className='soft-card kangur-chat-card kangur-chat-padding-md border kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
    >
      <div className='flex flex-col items-start gap-2'>
        <KangurButton
          type='button'
          size='sm'
          variant='surface'
          disabled={isLoading || !canSendMessages || (drawingPanelOpen && canOpenDrawingPanel)}
          onClick={onSketchRequest}
        >
          {resolveTutorGuidedFallback(
            tutorContent.guidedCallout.selectionSketchCtaLabel,
            fallbackCopy.selectionSketchCtaLabel
          )}
        </KangurButton>
        {shouldShowSketchHint ? (
          <div className='text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            {resolveTutorGuidedFallback(
              tutorContent.guidedCallout.selectionSketchHint,
              fallbackCopy.selectionSketchHint
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KangurAiTutorGuidedSelectionHintCard({
  canSendMessages,
  compactActionClassName,
  hintFollowUpActionLabel,
  hintFollowUpQuestion,
  isLoading,
  onSelectHint,
  shouldShow,
}: {
  canSendMessages: boolean;
  compactActionClassName: string;
  hintFollowUpActionLabel: string;
  hintFollowUpQuestion: string;
  isLoading: boolean;
  onSelectHint: () => void;
  shouldShow: boolean;
}): JSX.Element | null {
  if (!shouldShow) {
    return null;
  }

  return (
    <div
      data-testid='kangur-ai-tutor-selection-hint-followup'
      className='soft-card kangur-chat-card kangur-chat-padding-md border kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
    >
      <div className='text-xs font-medium leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
        {hintFollowUpQuestion}
      </div>
      <div className='mt-2'>
        <KangurButton
          data-testid='kangur-ai-tutor-selection-hint-followup-cta'
          type='button'
          className={compactActionClassName}
          size='sm'
          variant='primary'
          disabled={isLoading || !canSendMessages}
          onClick={onSelectHint}
        >
          {hintFollowUpActionLabel}
        </KangurButton>
      </div>
    </div>
  );
}

function KangurAiTutorGuidedSelectionResolvedContent({
  canOpenDrawingPanel,
  canSendMessages,
  compactActionClassName,
  drawingPanelOpen,
  fallbackCopy,
  handleQuickAction,
  hintQuickAction,
  isLoading,
  resolvedSelectionAssistantMessage,
  shouldHideResolvedSelectionAnswer,
  shouldShowHintFollowUp,
  shouldShowSelectionPageContentBadge,
  shouldShowSketchCta,
  shouldShowSketchHint,
  tutorContent,
  onSketchRequest,
}: {
  canOpenDrawingPanel: boolean;
  canSendMessages: boolean;
  compactActionClassName: string;
  drawingPanelOpen: boolean;
  fallbackCopy: GuidedCalloutFallbackCopy;
  handleQuickAction: GuidedCalloutPanelBodyState['handleQuickAction'];
  hintQuickAction: GuidedCalloutQuickAction;
  isLoading: boolean;
  resolvedSelectionAssistantMessage: KangurAiTutorRuntimeMessage | null;
  shouldHideResolvedSelectionAnswer: boolean;
  shouldShowHintFollowUp: boolean;
  shouldShowSelectionPageContentBadge: boolean;
  shouldShowSketchCta: boolean;
  shouldShowSketchHint: boolean;
  tutorContent: GuidedCalloutContent;
  onSketchRequest: () => void;
}): JSX.Element {
  return (
    <div className='mt-3 space-y-2'>
      {!shouldHideResolvedSelectionAnswer ? (
        <>
          {shouldShowSelectionPageContentBadge ? (
            <KangurAiTutorChromeBadge
              data-testid='kangur-ai-tutor-selection-guided-page-content-badge'
              className='w-fit max-w-full px-3 py-1 text-[10px]'
            >
              {fallbackCopy.savedPageContentBadge}
            </KangurAiTutorChromeBadge>
          ) : null}
          <KangurAiTutorWarmInsetCard
            data-testid='kangur-ai-tutor-selection-guided-answer'
            tone='panel'
            className='px-3 py-3 text-sm leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
          >
            {resolvedSelectionAssistantMessage?.content}
          </KangurAiTutorWarmInsetCard>
        </>
      ) : null}
      <KangurAiTutorGuidedSelectionSketchCard
        canOpenDrawingPanel={canOpenDrawingPanel}
        canSendMessages={canSendMessages}
        drawingPanelOpen={drawingPanelOpen}
        fallbackCopy={fallbackCopy}
        isLoading={isLoading}
        onSketchRequest={onSketchRequest}
        shouldShow={shouldShowSketchCta}
        shouldShowSketchHint={shouldShowSketchHint}
        tutorContent={tutorContent}
      />
      <KangurAiTutorGuidedSelectionHintCard
        canSendMessages={canSendMessages}
        compactActionClassName={compactActionClassName}
        hintFollowUpActionLabel={tutorContent.messageList.hintFollowUpActionLabel}
        hintFollowUpQuestion={tutorContent.messageList.hintFollowUpQuestion}
        isLoading={isLoading}
        onSelectHint={() => void handleQuickAction(hintQuickAction)}
        shouldShow={shouldShowHintFollowUp}
      />
    </div>
  );
}

function KangurAiTutorGuidedCalloutActions({
  buttons,
  compactActionClassName,
  homeOnboardingCanGoBack,
  isMobileHomeOnboardingSheet,
  isResolvedSelectionCallout,
  mode,
  onAdvanceHomeOnboarding,
  onBackHomeOnboarding,
  onClose,
  onFinishHomeOnboarding,
  selectionPreparingBadgeInsetClassName,
  selectionPreparingBadgeLabel,
  shouldHideResolvedSelectionAnswer,
  shouldShowSelectionPreparingBadge,
}: {
  buttons: GuidedCalloutContent['guidedCallout']['buttons'];
  compactActionClassName: string;
  homeOnboardingCanGoBack: boolean;
  isMobileHomeOnboardingSheet: boolean;
  isResolvedSelectionCallout: boolean;
  mode: GuidedCalloutState['mode'];
  onAdvanceHomeOnboarding: () => void;
  onBackHomeOnboarding: () => void;
  onClose: () => void;
  onFinishHomeOnboarding: () => void;
  selectionPreparingBadgeInsetClassName: string;
  selectionPreparingBadgeLabel: string;
  shouldHideResolvedSelectionAnswer: boolean;
  shouldShowSelectionPreparingBadge: boolean;
}): JSX.Element {
  return (
    <div
      className={cn(
        'mt-3',
        KANGUR_TIGHT_ROW_CLASSNAME,
        'sm:flex-wrap sm:justify-end',
        isMobileHomeOnboardingSheet && 'mt-2'
      )}
    >
      {mode === 'home_onboarding' ? (
        <>
          {homeOnboardingCanGoBack ? (
            <KangurButton
              type='button'
              size='sm'
              variant='surface'
              className={compactActionClassName}
              onClick={onBackHomeOnboarding}
            >
              {buttons.back}
            </KangurButton>
          ) : null}
          <KangurButton
            type='button'
            size='sm'
            variant='surface'
            className={compactActionClassName}
            onClick={onFinishHomeOnboarding}
          >
            {buttons.finish}
          </KangurButton>
          <KangurButton
            type='button'
            size='sm'
            variant='primary'
            className={compactActionClassName}
            onClick={onAdvanceHomeOnboarding}
          >
            {buttons.understand}
          </KangurButton>
        </>
      ) : mode === 'selection' ? (
        isResolvedSelectionCallout ? (
          shouldHideResolvedSelectionAnswer ? null : (
            <KangurButton
              type='button'
              size='sm'
              variant='surface'
              className={compactActionClassName}
              onClick={onClose}
            >
              {buttons.understand}
            </KangurButton>
          )
        ) : shouldShowSelectionPreparingBadge ? (
          <KangurAiTutorChromeBadge
            className={cn(
              'w-fit max-w-full self-start px-3 py-1 text-[11px] normal-case tracking-normal [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))] [border-color:var(--kangur-chat-control-border,var(--kangur-chat-chip-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] sm:self-auto',
              selectionPreparingBadgeInsetClassName
            )}
          >
            {selectionPreparingBadgeLabel}
          </KangurAiTutorChromeBadge>
        ) : null
      ) : (
        <KangurButton
          type='button'
          size='sm'
          variant='surface'
          className={compactActionClassName}
          onClick={onClose}
        >
          {buttons.understand}
        </KangurButton>
      )}
    </div>
  );
}

function KangurAiTutorGuidedCalloutBody({
  canSendMessages,
  drawingPanelOpen,
  fallbackCopy,
  guidedCallout,
  handleCloseCallout,
  handleQuickAction,
  homeOnboardingCanGoBack,
  isLoading,
  layoutState,
  onAdvanceHomeOnboarding,
  onBackHomeOnboarding,
  onFinishHomeOnboarding,
  sectionLabel,
  selectionDisplayState,
  selectionState,
  sketchState,
  tutorContent,
}: {
  canSendMessages: boolean;
  drawingPanelOpen: boolean;
  fallbackCopy: GuidedCalloutFallbackCopy;
  guidedCallout: GuidedCalloutState;
  handleCloseCallout: () => void;
  handleQuickAction: GuidedCalloutPanelBodyState['handleQuickAction'];
  homeOnboardingCanGoBack: boolean;
  isLoading: boolean;
  layoutState: ReturnType<typeof resolveGuidedCalloutLayoutState>;
  onAdvanceHomeOnboarding: () => void;
  onBackHomeOnboarding: () => void;
  onFinishHomeOnboarding: () => void;
  sectionLabel: string | null;
  selectionDisplayState: ReturnType<typeof resolveGuidedSelectionDisplayState>;
  selectionState: ReturnType<typeof useGuidedCalloutSelectionState>;
  sketchState: ReturnType<typeof useGuidedCalloutSketchState>;
  tutorContent: GuidedCalloutContent;
}): JSX.Element {
  return (
    <div className={layoutState.selectionKeepoutClassName}>
      <KangurAiTutorGuidedCalloutHeader
        closeAriaLabel={tutorContent.guidedCallout.closeAria}
        headerLabel={guidedCallout.headerLabel}
        onClose={handleCloseCallout}
        showCloseButton={
          !guidedCallout.showSelectionGuidanceCallout || selectionDisplayState.isResolvedSelectionCallout
        }
      />
      <KangurAiTutorGuidedCalloutStepLabel
        isMobileHomeOnboardingSheet={layoutState.isMobileHomeOnboardingSheet}
        stepLabel={guidedCallout.stepLabel}
      />
      <KangurAiTutorGuidedCalloutIntro
        detail={selectionDisplayState.resolvedSelectionDetail}
        isMobileHomeOnboardingSheet={layoutState.isMobileHomeOnboardingSheet}
        shouldShowDetail={selectionDisplayState.shouldShowSelectionDetail}
        shouldShowIntro={selectionDisplayState.shouldShowSelectionIntro}
        title={guidedCallout.title}
      />
      <KangurAiTutorGuidedCalloutSectionCard
        label={sectionLabel}
        prefix={tutorContent.guidedCallout.sectionPrefix}
        shouldShow={guidedCallout.showSectionGuidanceCallout}
      />
      <KangurAiTutorGuidedSelectionSourceCard
        fallbackCopy={fallbackCopy}
        selectedKnowledgeFragment={selectionState.selectedKnowledgeFragment}
        selectedKnowledgeSummary={selectionDisplayState.selectedKnowledgeSummary}
        selectedKnowledgeTitle={selectionDisplayState.selectedKnowledgeTitle}
        shouldShow={selectionDisplayState.shouldShowSelectedKnowledgeReference}
      />
      {selectionDisplayState.isResolvedSelectionCallout ? (
        <KangurAiTutorGuidedSelectionResolvedContent
          canOpenDrawingPanel={sketchState.canOpenDrawingPanel}
          canSendMessages={canSendMessages}
          compactActionClassName={layoutState.compactActionClassName}
          drawingPanelOpen={drawingPanelOpen}
          fallbackCopy={fallbackCopy}
          handleQuickAction={handleQuickAction}
          hintQuickAction={selectionState.hintQuickAction}
          isLoading={isLoading}
          resolvedSelectionAssistantMessage={selectionState.resolvedSelectionAssistantMessage}
          shouldHideResolvedSelectionAnswer={selectionDisplayState.shouldHideResolvedSelectionAnswer}
          shouldShowHintFollowUp={selectionDisplayState.shouldShowHintFollowUp}
          shouldShowSelectionPageContentBadge={selectionDisplayState.shouldShowSelectionPageContentBadge}
          shouldShowSketchCta={
            selectionDisplayState.isResolvedSelectionCallout &&
            (
              Boolean(selectionDisplayState.selectedKnowledgeSummary) ||
              Boolean(selectionState.resolvedSelectionAssistantMessage?.content)
            )
          }
          shouldShowSketchHint={sketchState.shouldShowSketchHint}
          tutorContent={tutorContent}
          onSketchRequest={sketchState.handleSketchRequest}
        />
      ) : null}
      <KangurAiTutorGuidedCalloutActions
        buttons={tutorContent.guidedCallout.buttons}
        compactActionClassName={layoutState.compactActionClassName}
        homeOnboardingCanGoBack={homeOnboardingCanGoBack}
        isMobileHomeOnboardingSheet={layoutState.isMobileHomeOnboardingSheet}
        isResolvedSelectionCallout={selectionDisplayState.isResolvedSelectionCallout}
        mode={guidedCallout.mode}
        onAdvanceHomeOnboarding={onAdvanceHomeOnboarding}
        onBackHomeOnboarding={onBackHomeOnboarding}
        onClose={handleCloseCallout}
        onFinishHomeOnboarding={onFinishHomeOnboarding}
        selectionPreparingBadgeInsetClassName={layoutState.selectionPreparingBadgeInsetClassName}
        selectionPreparingBadgeLabel={tutorContent.guidedCallout.selectionPreparingBadge}
        shouldHideResolvedSelectionAnswer={selectionDisplayState.shouldHideResolvedSelectionAnswer}
        shouldShowSelectionPreparingBadge={selectionDisplayState.shouldShowSelectionPreparingBadge}
      />
    </div>
  );
}

export function KangurAiTutorGuidedCallout(): JSX.Element {
  const { guidedCallout } = useKangurAiTutorPortalContext();
  const tutorContent = useKangurAiTutorContent();
  const isCoarsePointer = useKangurCoarsePointer();
  const calloutLabelId = useId();
  const calloutDescriptionId = useId();
  const panelBody = useKangurAiTutorPanelBodyContext();
  const widgetState = useKangurAiTutorWidgetStateContext();
  const fallbackCopy = useMemo(
    () => getGuidedCalloutFallbackCopy(normalizeSiteLocale(tutorContent.locale)),
    [tutorContent.locale]
  );
  const selectionState = useGuidedCalloutSelectionState({
    activeFocus: panelBody.activeFocus,
    activeSelectedText: panelBody.activeSelectedText,
    guidedTutorTarget: widgetState.guidedTutorTarget,
    messages: panelBody.messages,
    mode: guidedCallout.mode,
    selectionConversationContext: widgetState.selectionConversationContext,
    selectionGuidanceHandoffText: widgetState.selectionGuidanceHandoffText,
    selectionResponsePending: widgetState.selectionResponsePending,
    tutorContent,
    visibleQuickActions: panelBody.visibleQuickActions,
  });
  const selectionDisplayState = resolveGuidedSelectionDisplayState({
    detail: guidedCallout.detail,
    fallbackCopy,
    isLoading: panelBody.isLoading,
    isSelectionExplainPendingMode: panelBody.isSelectionExplainPendingMode,
    isTestSurface:
      panelBody.sessionSurface === 'test' || panelBody.activeFocus.conversationFocus.surface === 'test',
    lastInteractionIntent: panelBody.lastInteractionIntent,
    lastPromptMode: panelBody.lastPromptMode,
    mode: guidedCallout.mode,
    resolvedSelectedKnowledgeLabel: selectionState.resolvedSelectedKnowledgeLabel,
    resolvedSelectedKnowledgeReference: selectionState.resolvedSelectedKnowledgeReference,
    resolvedSelectionAssistantMessage: selectionState.resolvedSelectionAssistantMessage,
    selectedKnowledgeEntry: selectionState.selectedKnowledgeEntry,
    selectedKnowledgeFragment: selectionState.selectedKnowledgeFragment,
    showSelectionGuidanceCallout: guidedCallout.showSelectionGuidanceCallout,
  });
  const layoutState = resolveGuidedCalloutLayoutState({
    avatarPlacement: guidedCallout.avatarPlacement,
    headerLabel: guidedCallout.headerLabel,
    isCoarsePointer,
    mode: guidedCallout.mode,
    resolvedSelectionDetail: selectionDisplayState.resolvedSelectionDetail,
    showSelectionGuidanceCallout: guidedCallout.showSelectionGuidanceCallout,
    stepLabel: guidedCallout.stepLabel,
    style: guidedCallout.style,
    title: guidedCallout.title,
  });
  const sketchState = useGuidedCalloutSketchState({
    calloutKey: guidedCallout.calloutKey,
    drawingPanelAvailable: panelBody.drawingPanelAvailable,
    drawingPanelOpen: panelBody.drawingPanelOpen,
    handleOpenDrawingPanel: panelBody.handleOpenDrawingPanel,
    handleToggleDrawing: panelBody.handleToggleDrawing,
    shouldShowSketchCta:
      selectionDisplayState.isResolvedSelectionCallout &&
      (
        Boolean(selectionDisplayState.selectedKnowledgeSummary) ||
        Boolean(selectionState.resolvedSelectionAssistantMessage?.content)
      ),
  });
  const usesDirectionalEntry = !guidedCallout.showSelectionGuidanceCallout;
  const sectionLabel = resolveSectionLabel({
    guidedTutorTarget: widgetState.guidedTutorTarget,
    sectionGuidanceLabel: guidedCallout.sectionGuidanceLabel,
    sectionResponsePendingKind: guidedCallout.sectionResponsePendingKind,
  });
  const homeOnboardingCanGoBack =
    widgetState.homeOnboardingStepIndex !== null && widgetState.homeOnboardingStepIndex > 0;

  return (
    <AnimatePresence mode='wait'>
      {guidedCallout.shouldRender && guidedCallout.style ? (
        <KangurAiTutorGuidedCalloutShell
          accessibleCalloutDescription={layoutState.accessibleCalloutDescription}
          accessibleCalloutTitle={layoutState.accessibleCalloutTitle}
          calloutDescriptionId={calloutDescriptionId}
          calloutKey={guidedCallout.calloutKey}
          calloutLabelId={calloutLabelId}
          calloutTestId={guidedCallout.calloutTestId}
          entryDirection={guidedCallout.entryDirection}
          isResolvedSelectionCallout={selectionDisplayState.isResolvedSelectionCallout}
          isMobileHomeOnboardingSheet={layoutState.isMobileHomeOnboardingSheet}
          placement={guidedCallout.placement}
          prefersReducedMotion={guidedCallout.prefersReducedMotion}
          reducedMotionTransitions={guidedCallout.reducedMotionTransitions}
          shouldAnnounceCallout={layoutState.shouldAnnounceCallout}
          style={guidedCallout.style}
          transitionDuration={guidedCallout.transitionDuration}
          transitionEase={guidedCallout.transitionEase}
          usesDirectionalEntry={usesDirectionalEntry}
        >
          <KangurAiTutorGuidedCalloutBody
            canSendMessages={panelBody.canSendMessages}
            drawingPanelOpen={panelBody.drawingPanelOpen}
            fallbackCopy={fallbackCopy}
            guidedCallout={guidedCallout}
            handleCloseCallout={guidedCallout.onClose}
            handleQuickAction={panelBody.handleQuickAction}
            homeOnboardingCanGoBack={homeOnboardingCanGoBack}
            isLoading={panelBody.isLoading}
            layoutState={layoutState}
            onAdvanceHomeOnboarding={guidedCallout.onAdvanceHomeOnboarding}
            onBackHomeOnboarding={guidedCallout.onBackHomeOnboarding}
            onFinishHomeOnboarding={guidedCallout.onFinishHomeOnboarding}
            sectionLabel={sectionLabel}
            selectionDisplayState={selectionDisplayState}
            selectionState={selectionState}
            sketchState={sketchState}
            tutorContent={tutorContent}
          />
        </KangurAiTutorGuidedCalloutShell>
      ) : null}
    </AnimatePresence>
  );
}

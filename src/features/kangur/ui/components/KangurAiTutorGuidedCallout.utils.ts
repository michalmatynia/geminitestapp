'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { resolveKangurPageContentFragment } from '@/features/kangur/ai-tutor/page-content-fragments';
import { KANGUR_PAGE_CONTENT_COLLECTION } from '@/features/kangur/shared/contracts/kangur-page-content';
import { cn } from '@/features/kangur/shared/utils';
import type {
  KangurAiTutorKnowledgeReference,
  KangurAiTutorRuntimeMessage,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import type {
  KangurPageContentEntry,
  KangurPageContentFragment,
} from '@/features/kangur/shared/contracts/kangur-page-content';
import type { GuidedTutorTarget } from './ai-tutor-widget/KangurAiTutorWidget.types';
import type {
  ActiveTutorFocus,
  TutorQuickAction,
} from './ai-tutor-widget/KangurAiTutorWidget.shared';
import type {
  PendingSelectionResponse,
  SelectionConversationContext,
} from './ai-tutor-widget/KangurAiTutorWidget.types';

const isSelectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'selection' }> => value?.mode === 'selection';

const isSectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'section' }> => value?.mode === 'section';

export const getLatestAssistantMessage = (
  messages: KangurAiTutorRuntimeMessage[]
): KangurAiTutorRuntimeMessage | null =>
  [...messages].reverse().find((message) => message.role === 'assistant') ?? null;

export type GuidedCalloutFallbackCopy = {
  knowledgeFragmentBadge: string;
  pageContentBadge: string;
  savedPageContentBadge: string;
  selectionDetailFromPageContent: string;
  selectionDetailReady: string;
  selectionSketchCtaLabel: string;
  selectionSketchHint: string;
};

export const GUIDED_CALLOUT_FALLBACK_COPY_BY_LOCALE: Record<string, GuidedCalloutFallbackCopy> = {
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

export const getGuidedCalloutFallbackCopy = (
  locale: string
): GuidedCalloutFallbackCopy =>
  GUIDED_CALLOUT_FALLBACK_COPY_BY_LOCALE[locale] ??
  GUIDED_CALLOUT_FALLBACK_COPY_BY_LOCALE['pl']!;

export const resolveSelectedText = ({
  activeSelectedText,
  guidedTutorTarget,
  selectionConversationContext,
  selectionGuidanceHandoffText,
  selectionResponsePending,
}: {
  activeSelectedText: string | null;
  guidedTutorTarget: GuidedTutorTarget | null;
  selectionConversationContext: SelectionConversationContext | null;
  selectionGuidanceHandoffText: string | null;
  selectionResponsePending: PendingSelectionResponse | null;
}): string | null =>
  selectionConversationContext?.selectedText ??
  selectionResponsePending?.selectedText ??
  selectionGuidanceHandoffText ??
  activeSelectedText ??
  (isSelectionGuidedTutorTarget(guidedTutorTarget) ? guidedTutorTarget.selectedText : null) ??
  null;

export const resolveSectionLabel = ({
  guidedTutorTarget,
  sectionGuidanceLabel,
  sectionResponsePendingKind,
}: {
  guidedTutorTarget: GuidedTutorTarget | null;
  sectionGuidanceLabel: string | null;
  sectionResponsePendingKind: string | null;
}): string | null =>
  sectionGuidanceLabel ??
  (isSectionGuidedTutorTarget(guidedTutorTarget) ? guidedTutorTarget.kind : sectionResponsePendingKind);

export const resolveHintQuickAction = (
  visibleQuickActions: TutorQuickAction[],
  tutorContent: KangurAiTutorContent
): TutorQuickAction =>
  visibleQuickActions.find((candidate) => candidate.id === 'hint') ?? {
    id: 'hint',
    label: tutorContent.quickActions.hint.defaultLabel,
    prompt: tutorContent.quickActions.hint.defaultPrompt,
    promptMode: 'hint' as const,
    interactionIntent: 'hint' as const,
  };

const resolvePageContentEntryId = (
  knowledgeReference: KangurAiTutorKnowledgeReference | null
): string | null =>
  knowledgeReference?.sourceCollection === KANGUR_PAGE_CONTENT_COLLECTION
    ? knowledgeReference.sourceRecordId
    : null;

export type GuidedCalloutSelectionState = {
  hintQuickAction: TutorQuickAction;
  resolvedSelectedKnowledgeLabel: string | null;
  resolvedSelectedKnowledgeReference: KangurAiTutorKnowledgeReference | null;
  resolvedSelectedText: string | null;
  resolvedSelectionAssistantMessage: KangurAiTutorRuntimeMessage | null;
  selectedKnowledgeEntry: KangurPageContentEntry | null;
  selectedKnowledgeFragment: KangurPageContentFragment | null;
};

export function useGuidedCalloutSelectionState({
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
  useKangurPageContentEntry,
}: {
  activeFocus: ActiveTutorFocus;
  activeSelectedText: string | null;
  guidedTutorTarget: GuidedTutorTarget | null;
  messages: KangurAiTutorRuntimeMessage[];
  mode: string | null;
  selectionConversationContext: SelectionConversationContext | null;
  selectionGuidanceHandoffText: string | null;
  selectionResponsePending: PendingSelectionResponse | null;
  tutorContent: KangurAiTutorContent;
  visibleQuickActions: TutorQuickAction[];
  useKangurPageContentEntry: typeof import('@/features/kangur/ui/hooks/useKangurPageContent').useKangurPageContentEntry;
}): GuidedCalloutSelectionState {
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

export const resolveGuidedSelectionDisplayState = ({
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
  lastInteractionIntent: string | null;
  lastPromptMode: string | null;
  mode: string | null;
  resolvedSelectedKnowledgeLabel: string | null;
  resolvedSelectedKnowledgeReference: KangurAiTutorKnowledgeReference | null;
  resolvedSelectionAssistantMessage: KangurAiTutorRuntimeMessage | null;
  selectedKnowledgeEntry: KangurPageContentEntry | null;
  selectedKnowledgeFragment: KangurPageContentFragment | null;
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

export const resolveGuidedCalloutLayoutState = ({
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
  avatarPlacement: string | null;
  headerLabel: string | null;
  isCoarsePointer: boolean;
  mode: string | null;
  resolvedSelectionDetail: string | null | undefined;
  showSelectionGuidanceCallout: boolean;
  stepLabel: string | null;
  style: CSSProperties | null | undefined;
  title: string | null | undefined;
}) => ({
  accessibleCalloutDescription: [stepLabel, resolvedSelectionDetail]
    .filter((value): value is string => Boolean(value))
    .join(' '),
  accessibleCalloutTitle: title ?? headerLabel ?? '',
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

export function useGuidedCalloutSketchState({
  calloutKey,
  drawingPanelAvailable,
  drawingPanelOpen,
  handleOpenDrawingPanel,
  handleToggleDrawing,
  shouldShowSketchCta,
}: {
  calloutKey: string;
  drawingPanelAvailable: boolean;
  drawingPanelOpen: boolean;
  handleOpenDrawingPanel: () => void;
  handleToggleDrawing: () => void;
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

'use client';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_WRAP_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurAiTutorRuntimeMessage } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorWarmInsetCard,
} from '../KangurAiTutorChrome';
import { useGuidedCalloutContext } from './KangurAiTutorGuided.context';

import type { JSX } from 'react';

const resolveTutorGuidedFallback = (
  value: string | null | undefined,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  return value;
};

export function KangurAiTutorGuidedCalloutSectionCard(): JSX.Element | null {
  const { tutorContent, guidedCallout, sectionLabel } = useGuidedCalloutContext();

  if (!guidedCallout.showSectionGuidanceCallout) {
    return null;
  }

  return (
    <KangurAiTutorWarmInsetCard tone='guide' className='mt-3 px-3 py-2 text-xs leading-relaxed'>
      {tutorContent.guidedCallout.sectionPrefix}: {sectionLabel}
    </KangurAiTutorWarmInsetCard>
  );
}

export function KangurAiTutorGuidedSelectionSourceCard(): JSX.Element | null {
  const { fallbackCopy, selectionState, selectionDisplayState } = useGuidedCalloutContext();
  const { selectedKnowledgeFragment } = selectionState;
  const { selectedKnowledgeSummary, selectedKnowledgeTitle, shouldShowSelectedKnowledgeReference } = selectionDisplayState;

  if (!shouldShowSelectedKnowledgeReference) {
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

export function KangurAiTutorGuidedSelectionSketchCard(): JSX.Element | null {
  const {
    tutorContent,
    fallbackCopy,
    sketchState,
    selectionDisplayState,
    panelBody,
  } = useGuidedCalloutContext();

  const { canOpenDrawingPanel, handleSketchRequest, shouldShowSketchHint } = sketchState;
  const { isResolvedSelectionCallout, selectedKnowledgeSummary } = selectionDisplayState;
  const { canSendMessages, drawingPanelOpen, isLoading } = panelBody;

  const shouldShow = isResolvedSelectionCallout && (
    Boolean(selectedKnowledgeSummary) ||
    Boolean(useGuidedCalloutContext().selectionState.resolvedSelectionAssistantMessage?.content)
  );

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
          onClick={handleSketchRequest}
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

export function KangurAiTutorGuidedSelectionHintCard(): JSX.Element | null {
  const {
    tutorContent,
    layoutState,
    selectionDisplayState,
    selectionState,
    panelBody,
  } = useGuidedCalloutContext();

  const { compactActionClassName } = layoutState;
  const { shouldShowHintFollowUp } = selectionDisplayState;
  const { hintQuickAction } = selectionState;
  const { canSendMessages, handleQuickAction, isLoading } = panelBody;

  if (!shouldShowHintFollowUp) {
    return null;
  }

  return (
    <div
      data-testid='kangur-ai-tutor-selection-hint-followup'
      className='soft-card kangur-chat-card kangur-chat-padding-md border kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
    >
      <div className='text-xs font-medium leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
        {tutorContent.messageList.hintFollowUpQuestion}
      </div>
      <div className='mt-2'>
        <KangurButton
          data-testid='kangur-ai-tutor-selection-hint-followup-cta'
          type='button'
          className={compactActionClassName}
          size='sm'
          variant='primary'
          disabled={isLoading || !canSendMessages}
          onClick={() => void handleQuickAction(hintQuickAction)}
        >
          {tutorContent.messageList.hintFollowUpActionLabel}
        </KangurButton>
      </div>
    </div>
  );
}

export function KangurAiTutorGuidedSelectionResolvedContent(): JSX.Element {
  const {
    fallbackCopy,
    selectionState,
    selectionDisplayState,
  } = useGuidedCalloutContext();

  const { resolvedSelectionAssistantMessage } = selectionState;
  const { shouldHideResolvedSelectionAnswer, shouldShowSelectionPageContentBadge } = selectionDisplayState;

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
      <KangurAiTutorGuidedSelectionSketchCard />
      <KangurAiTutorGuidedSelectionHintCard />
    </div>
  );
}

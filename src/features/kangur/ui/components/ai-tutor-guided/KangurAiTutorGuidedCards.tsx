'use client';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_WRAP_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurAiTutorRuntimeMessage } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorWarmInsetCard,
} from '../KangurAiTutorChrome';
import type { GuidedCalloutFallbackCopy } from '../KangurAiTutorGuidedCallout.utils';

import type { JSX } from 'react';

type GuidedSelectionKnowledgeFragment = {
  explanation?: string | null;
} | null;

type GuidedTutorContent = {
  guidedCallout: {
    selectionSketchCtaLabel?: string | null;
    selectionSketchHint?: string | null;
  };
  messageList: {
    hintFollowUpActionLabel: string;
    hintFollowUpQuestion: string;
  };
};

const resolveTutorGuidedFallback = (
  value: string | null | undefined,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  return value;
};

export function KangurAiTutorGuidedCalloutSectionCard({
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

export function KangurAiTutorGuidedSelectionSourceCard({
  fallbackCopy,
  selectedKnowledgeFragment,
  selectedKnowledgeSummary,
  selectedKnowledgeTitle,
  shouldShow,
}: {
  fallbackCopy: GuidedCalloutFallbackCopy;
  selectedKnowledgeFragment: GuidedSelectionKnowledgeFragment;
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

export function KangurAiTutorGuidedSelectionSketchCard({
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
  tutorContent: GuidedTutorContent;
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

export function KangurAiTutorGuidedSelectionHintCard({
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

export function KangurAiTutorGuidedSelectionResolvedContent({
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
  handleQuickAction: (...args: any[]) => unknown;
  hintQuickAction: unknown;
  isLoading: boolean;
  resolvedSelectionAssistantMessage: KangurAiTutorRuntimeMessage | null;
  shouldHideResolvedSelectionAnswer: boolean;
  shouldShowHintFollowUp: boolean;
  shouldShowSelectionPageContentBadge: boolean;
  shouldShowSketchCta: boolean;
  shouldShowSketchHint: boolean;
  tutorContent: GuidedTutorContent;
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

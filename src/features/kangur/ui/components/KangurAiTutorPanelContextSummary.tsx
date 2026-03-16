import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PAGE_CONTENT_COLLECTION } from '@/features/kangur/shared/contracts/kangur-page-content';

import { KangurAiTutorWarmInsetCard } from './KangurAiTutorChrome';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { HTMLAttributes, JSX, ReactNode } from 'react';

const contextSummaryCardActionClassName = 'h-8 w-full px-3 text-[11px] sm:w-auto sm:shrink-0';
const contextSummaryChipClassName =
  'rounded-full border px-3 py-1 kangur-chat-surface-soft [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]';

type ContextSummaryAction = {
  label: string;
  onClick: () => void;
  testId: string;
};

type ContextSummaryStatus = {
  label: string;
  testId: string;
  tone: 'complete' | 'pending';
};

type ContextSummaryCardProps = {
  content: ReactNode;
  detail: string;
  primaryAction?: ContextSummaryAction;
  secondaryAction: ContextSummaryAction;
  status?: ContextSummaryStatus;
  testId: string;
  title: string;
};

type ContextSummaryChipProps = {
  children: ReactNode;
  className?: string;
  testId?: string;
} & HTMLAttributes<HTMLSpanElement>;

function KangurAiTutorPanelContextChip({
  children,
  className,
  testId,
  ...props
}: ContextSummaryChipProps): JSX.Element {
  return (
    <span data-testid={testId} className={[contextSummaryChipClassName, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  );
}

function KangurAiTutorPanelContextCard({
  content,
  detail,
  primaryAction,
  secondaryAction,
  status,
  testId,
  title,
}: ContextSummaryCardProps): JSX.Element {
  const cardTestId = testId;
  const primaryActionConfig = primaryAction;
  const secondaryActionConfig = secondaryAction;
  const statusConfig = status;

  return (
    <KangurAiTutorWarmInsetCard
      data-testid={cardTestId}
      tone='panel'
      className='mt-2 kangur-chat-padding-md'
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0 flex-1'>
          <div className='text-[10px] font-bold uppercase tracking-[0.16em] [color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
            {title}
          </div>
          {content ? <div className='mt-2'>{content}</div> : null}
        </div>
        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end'>
          {primaryActionConfig ? (
            <KangurButton
              data-testid={primaryActionConfig.testId}
              type='button'
              size='sm'
              variant='surface'
              className={contextSummaryCardActionClassName}
              onClick={primaryActionConfig.onClick}
            >
              {primaryActionConfig.label}
            </KangurButton>
          ) : null}
          <KangurButton
            data-testid={secondaryActionConfig.testId}
            type='button'
            size='sm'
            variant='surface'
            className={contextSummaryCardActionClassName}
            onClick={secondaryActionConfig.onClick}
          >
            {secondaryActionConfig.label}
          </KangurButton>
        </div>
      </div>
      <div className='mt-2 text-[11px] leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
        {detail}
      </div>
      {statusConfig ? (
        <KangurAiTutorWarmInsetCard
          data-testid={statusConfig.testId}
          tone={statusConfig.tone}
          className='mt-2 kangur-chat-padding-sm text-[11px] font-semibold'
        >
          {statusConfig.label}
        </KangurAiTutorWarmInsetCard>
      ) : null}
    </KangurAiTutorWarmInsetCard>
  );
}

export function KangurAiTutorPanelContextSummary(): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const {
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    askModalHelperText,
    bridgeQuickActionId,
    bridgeSummaryChipLabel,
    focusChipLabel,
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    isAskModalMode,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
  } = useKangurAiTutorPanelBodyContext();
  const {
    contextSwitchNotice,
    highlightedSection,
    selectionConversationContext,
    selectionGuidanceHandoffText,
    selectionResponsePending,
  } = useKangurAiTutorWidgetStateContext();
  const resolvedSelectedText =
    selectionConversationContext?.selectedText ??
    selectionResponsePending?.selectedText ??
    selectionGuidanceHandoffText ??
    activeSelectedText ??
    null;
  const resolvedSelectedKnowledgeReference =
    selectionConversationContext?.knowledgeReference ??
    activeFocus.conversationFocus.knowledgeReference ??
    null;
  const resolvedSelectedKnowledgeLabel =
    selectionConversationContext?.focusLabel ?? activeFocus.conversationFocus.label ?? null;
  const shouldShowSelectedKnowledgeReference =
    resolvedSelectedText !== null &&
    resolvedSelectedKnowledgeReference?.sourceCollection === KANGUR_PAGE_CONTENT_COLLECTION;

  return (
    <>
      {isAskModalMode ? (
        <div
          data-testid='kangur-ai-tutor-ask-modal-helper'
          className='border-b kangur-chat-padding-sm kangur-chat-surface-warm text-xs leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
        >
          {askModalHelperText}
        </div>
      ) : null}

      <div className='border-b kangur-chat-padding-md kangur-chat-surface-warm'>
        {contextSwitchNotice ? (
          <div
            data-testid='kangur-ai-tutor-context-switch'
            className='mb-3 kangur-chat-inset border-2 kangur-chat-padding-sm kangur-chat-surface-soft kangur-chat-surface-soft-shadow'
          >
            <div className='text-[10px] font-black uppercase tracking-[0.16em] [color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
              {contextSwitchNotice.title}
            </div>
            <div className='mt-1 text-sm font-semibold [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
              {contextSwitchNotice.target}
            </div>
            {contextSwitchNotice.detail ? (
              <div className='mt-1 text-[11px] leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                {contextSwitchNotice.detail}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className='flex flex-wrap items-start gap-2'>
          {focusChipLabel ? (
            <KangurAiTutorPanelContextChip
              testId='kangur-ai-tutor-focus-chip'
              className='text-[10px] font-bold uppercase tracking-[0.16em]'
            >
              {focusChipLabel}
            </KangurAiTutorPanelContextChip>
          ) : null}
          {activeFocus.label && activeFocus.kind !== 'selection' ? (
            <KangurAiTutorPanelContextChip className='text-xs font-semibold normal-case tracking-normal'>
              {activeFocus.label}
            </KangurAiTutorPanelContextChip>
          ) : null}
          {bridgeSummaryChipLabel ? (
            <KangurAiTutorPanelContextChip
              testId='kangur-ai-tutor-bridge-chip'
              data-bridge-action-id={bridgeQuickActionId ?? 'none'}
              className='text-[10px] font-bold uppercase tracking-[0.14em] kangur-chat-surface-success'
            >
              {bridgeSummaryChipLabel}
            </KangurAiTutorPanelContextChip>
          ) : null}
        </div>
        {resolvedSelectedText ? (
          <>
            <KangurAiTutorPanelContextCard
              testId='kangur-ai-tutor-selected-text-preview'
              title={tutorContent.panelContext.selectedTitle}
              content={null}
              primaryAction={
                activeSelectionPageRect
                  ? {
                    testId: 'kangur-ai-tutor-selected-text-refocus',
                    label: tutorContent.panelContext.refocusSelectionLabel,
                    onClick: handleFocusSelectedFragment,
                  }
                  : undefined
              }
              secondaryAction={{
                testId: 'kangur-ai-tutor-selected-text-detach',
                label: tutorContent.panelContext.detachSelectionLabel,
                onClick: handleDetachSelectedFragment,
              }}
              detail={
                isSelectionExplainPendingMode
                  ? tutorContent.panelContext.selectedPendingDetail
                  : showSelectionExplainCompleteState
                    ? tutorContent.panelContext.selectedCompleteDetail
                    : tutorContent.panelContext.selectedDefaultDetail
              }
              status={
                isSelectionExplainPendingMode
                  ? {
                    testId: 'kangur-ai-tutor-selected-text-pending-status',
                    label: tutorContent.panelContext.selectedPendingStatus,
                    tone: 'pending',
                  }
                  : showSelectionExplainCompleteState
                    ? {
                      testId: 'kangur-ai-tutor-selected-text-complete-status',
                      label: tutorContent.panelContext.selectedCompleteStatus,
                      tone: 'complete',
                    }
                    : undefined
              }
            />
            {shouldShowSelectedKnowledgeReference && resolvedSelectedKnowledgeReference ? (
              <KangurAiTutorWarmInsetCard
                data-testid='kangur-ai-tutor-selected-text-source'
                tone='panel'
                className='mt-2 kangur-chat-padding-md'
              >
                <div className='text-[10px] font-bold uppercase tracking-[0.16em] [color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
                  Zapisane źródło
                </div>
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  {resolvedSelectedKnowledgeLabel ? (
                    <KangurAiTutorPanelContextChip className='text-xs font-semibold normal-case tracking-normal'>
                      {resolvedSelectedKnowledgeLabel}
                    </KangurAiTutorPanelContextChip>
                  ) : null}
                  <KangurAiTutorPanelContextChip className='text-[10px] font-bold uppercase tracking-[0.14em]'>
                    Treść strony
                  </KangurAiTutorPanelContextChip>
                </div>
                <div className='mt-2 text-xs leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                  Tutor korzysta tu z zapisanego wpisu strony zamiast zgadywać kontekst samego zaznaczenia.
                </div>
                <div className='mt-2 rounded-2xl border kangur-chat-padding-sm font-mono text-[11px] [border-color:var(--kangur-chat-divider,var(--kangur-soft-card-border))] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                  {resolvedSelectedKnowledgeReference.sourcePath}
                </div>
              </KangurAiTutorWarmInsetCard>
            ) : null}
          </>
        ) : highlightedSection ? (
          <KangurAiTutorPanelContextCard
            testId='kangur-ai-tutor-section-preview'
            title={tutorContent.panelContext.sectionTitle}
            content={
              <div className='text-xs font-semibold leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                {highlightedSection.label ?? highlightedSection.kind}
              </div>
            }
            primaryAction={
              activeSectionRect
                ? {
                  testId: 'kangur-ai-tutor-section-refocus',
                  label: tutorContent.panelContext.refocusSectionLabel,
                  onClick: handleFocusHighlightedSection,
                }
                : undefined
            }
            secondaryAction={{
              testId: 'kangur-ai-tutor-section-detach',
              label: tutorContent.panelContext.detachSectionLabel,
              onClick: handleDetachHighlightedSection,
            }}
            detail={
              isSectionExplainPendingMode
                ? tutorContent.panelContext.sectionPendingDetail
                : showSectionExplainCompleteState
                  ? tutorContent.panelContext.sectionCompleteDetail
                  : tutorContent.panelContext.sectionDefaultDetail
            }
            status={
              isSectionExplainPendingMode
                ? {
                  testId: 'kangur-ai-tutor-section-pending-status',
                  label: tutorContent.panelContext.sectionPendingStatus,
                  tone: 'pending',
                }
                : showSectionExplainCompleteState
                  ? {
                    testId: 'kangur-ai-tutor-section-complete-status',
                    label: tutorContent.panelContext.sectionCompleteStatus,
                    tone: 'complete',
                  }
                  : undefined
            }
          />
        ) : null}
      </div>
    </>
  );
}

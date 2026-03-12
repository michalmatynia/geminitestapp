import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';

import { KangurAiTutorWarmInsetCard } from './KangurAiTutorChrome';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { HTMLAttributes, JSX, ReactNode } from 'react';

const contextSummaryCardActionClassName = 'h-8 shrink-0 px-3 text-[11px]';
const contextSummaryChipClassName =
  'rounded-full border px-3 py-1 [background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]';

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
  return (
    <KangurAiTutorWarmInsetCard data-testid={testId} tone='panel' className='mt-2 px-3 py-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='text-[10px] font-bold uppercase tracking-[0.16em] [color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
            {title}
          </div>
          <div className='mt-2'>{content}</div>
        </div>
        {primaryAction ? (
          <KangurButton
            data-testid={primaryAction.testId}
            type='button'
            size='sm'
            variant='surface'
            className={contextSummaryCardActionClassName}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </KangurButton>
        ) : null}
        <KangurButton
          data-testid={secondaryAction.testId}
          type='button'
          size='sm'
          variant='surface'
          className={contextSummaryCardActionClassName}
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </KangurButton>
      </div>
      <div className='mt-2 text-[11px] leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
        {detail}
      </div>
      {status ? (
        <KangurAiTutorWarmInsetCard
          data-testid={status.testId}
          tone={status.tone}
          className='mt-2 px-3 py-2 text-[11px] font-semibold'
        >
          {status.label}
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
    selectedTextPreview,
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
  } = useKangurAiTutorPanelBodyContext();
  const {
    contextSwitchNotice,
    highlightedSection,
    selectionGuidanceHandoffText,
    selectionResponsePending,
  } = useKangurAiTutorWidgetStateContext();
  const resolvedSelectedText =
    activeSelectedText ?? selectionResponsePending?.selectedText ?? selectionGuidanceHandoffText ?? null;
  const resolvedSelectedTextPreview = selectedTextPreview ?? resolvedSelectedText;

  return (
    <>
      {isAskModalMode ? (
        <div
          data-testid='kangur-ai-tutor-ask-modal-helper'
          className='border-b px-3 py-2 text-xs leading-relaxed [background:color-mix(in_srgb,var(--kangur-soft-card-background)_78%,#fff7cf)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_58%,#f59e0b)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
        >
          {askModalHelperText}
        </div>
      ) : null}

      <div className='border-b px-3 py-3 [background:color-mix(in_srgb,var(--kangur-soft-card-background)_74%,#fff7cf)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_58%,#f59e0b)]'>
        {contextSwitchNotice ? (
          <div
            data-testid='kangur-ai-tutor-context-switch'
            className='mb-3 rounded-[20px] border-2 px-3 py-2 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.1)] [background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)]'
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
              className='text-[10px] font-bold uppercase tracking-[0.14em] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#d1fae5)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,#10b981)]'
            >
              {bridgeSummaryChipLabel}
            </KangurAiTutorPanelContextChip>
          ) : null}
        </div>
        {resolvedSelectedText ? (
          <KangurAiTutorPanelContextCard
            testId='kangur-ai-tutor-selected-text-preview'
            title={tutorContent.panelContext.selectedTitle}
            content={
              <div className='text-xs italic leading-relaxed'>
                „{resolvedSelectedTextPreview}”
                {resolvedSelectedText.length > (resolvedSelectedTextPreview?.length ?? 0) ? '…' : ''}
              </div>
            }
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

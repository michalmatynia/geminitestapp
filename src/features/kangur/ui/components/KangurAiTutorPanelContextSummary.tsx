import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';

import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { JSX } from 'react';

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
            <span
              data-testid='kangur-ai-tutor-focus-chip'
              className='rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] [background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
            >
              {focusChipLabel}
            </span>
          ) : null}
          {activeFocus.label && activeFocus.kind !== 'selection' ? (
            <span className='rounded-full border px-3 py-1 text-xs font-semibold [background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
              {activeFocus.label}
            </span>
          ) : null}
          {bridgeSummaryChipLabel ? (
            <span
              data-testid='kangur-ai-tutor-bridge-chip'
              data-bridge-action-id={bridgeQuickActionId ?? 'none'}
              className='rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#d1fae5)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,#10b981)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
            >
              {bridgeSummaryChipLabel}
            </span>
          ) : null}
        </div>
        {resolvedSelectedText ? (
          <div
            data-testid='kangur-ai-tutor-selected-text-preview'
            className='mt-2 rounded-2xl border px-3 py-3 shadow-[0_10px_24px_-18px_rgba(180,83,9,0.24)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,#fff7cf)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,#f59e0b)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <div className='text-[10px] font-bold uppercase tracking-[0.16em] [color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
                  {tutorContent.panelContext.selectedTitle}
                </div>
                <div className='mt-2 text-xs italic leading-relaxed'>
                  „{resolvedSelectedTextPreview}”
                  {resolvedSelectedText.length > (resolvedSelectedTextPreview?.length ?? 0) ? '…' : ''}
                </div>
              </div>
              {activeSelectionPageRect ? (
                <KangurButton
                  data-testid='kangur-ai-tutor-selected-text-refocus'
                  type='button'
                  size='sm'
                  variant='surface'
                  className='h-8 shrink-0 px-3 text-[11px]'
                  onClick={handleFocusSelectedFragment}
                >
                  {tutorContent.panelContext.refocusSelectionLabel}
                </KangurButton>
              ) : null}
              <KangurButton
                data-testid='kangur-ai-tutor-selected-text-detach'
                type='button'
                size='sm'
                variant='surface'
                className='h-8 shrink-0 px-3 text-[11px]'
                onClick={handleDetachSelectedFragment}
              >
                {tutorContent.panelContext.detachSelectionLabel}
              </KangurButton>
            </div>
            <div className='mt-2 text-[11px] leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
              {isSelectionExplainPendingMode
                ? tutorContent.panelContext.selectedPendingDetail
                : showSelectionExplainCompleteState
                  ? tutorContent.panelContext.selectedCompleteDetail
                  : tutorContent.panelContext.selectedDefaultDetail}
            </div>
            {isSelectionExplainPendingMode ? (
              <div
                data-testid='kangur-ai-tutor-selected-text-pending-status'
                className='mt-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_70%,#f59e0b)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
              >
                {tutorContent.panelContext.selectedPendingStatus}
              </div>
            ) : showSelectionExplainCompleteState ? (
              <div
                data-testid='kangur-ai-tutor-selected-text-complete-status'
                className='mt-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#d1fae5)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,#10b981)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
              >
                {tutorContent.panelContext.selectedCompleteStatus}
              </div>
            ) : null}
          </div>
        ) : highlightedSection ? (
          <div
            data-testid='kangur-ai-tutor-section-preview'
            className='mt-2 rounded-2xl border px-3 py-3 shadow-[0_10px_24px_-18px_rgba(180,83,9,0.24)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,#fff7cf)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,#f59e0b)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <div className='text-[10px] font-bold uppercase tracking-[0.16em] [color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
                  {tutorContent.panelContext.sectionTitle}
                </div>
                <div className='mt-2 text-xs font-semibold leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                  {highlightedSection.label ?? highlightedSection.kind}
                </div>
              </div>
              {activeSectionRect ? (
                <KangurButton
                  data-testid='kangur-ai-tutor-section-refocus'
                  type='button'
                  size='sm'
                  variant='surface'
                  className='h-8 shrink-0 px-3 text-[11px]'
                  onClick={handleFocusHighlightedSection}
                >
                  {tutorContent.panelContext.refocusSectionLabel}
                </KangurButton>
              ) : null}
              <KangurButton
                data-testid='kangur-ai-tutor-section-detach'
                type='button'
                size='sm'
                variant='surface'
                className='h-8 shrink-0 px-3 text-[11px]'
                onClick={handleDetachHighlightedSection}
              >
                {tutorContent.panelContext.detachSectionLabel}
              </KangurButton>
            </div>
            <div className='mt-2 text-[11px] leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
              {isSectionExplainPendingMode
                ? tutorContent.panelContext.sectionPendingDetail
                : showSectionExplainCompleteState
                  ? tutorContent.panelContext.sectionCompleteDetail
                  : tutorContent.panelContext.sectionDefaultDetail}
            </div>
            {isSectionExplainPendingMode ? (
              <div
                data-testid='kangur-ai-tutor-section-pending-status'
                className='mt-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_70%,#f59e0b)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
              >
                {tutorContent.panelContext.sectionPendingStatus}
              </div>
            ) : showSectionExplainCompleteState ? (
              <div
                data-testid='kangur-ai-tutor-section-complete-status'
                className='mt-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#d1fae5)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,#10b981)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
              >
                {tutorContent.panelContext.sectionCompleteStatus}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

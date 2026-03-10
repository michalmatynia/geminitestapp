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
          className='border-b border-slate-900/10 bg-[#fff7cf]/72 px-3 py-2 text-xs leading-relaxed text-slate-700'
        >
          {askModalHelperText}
        </div>
      ) : null}

      <div className='border-b border-slate-900/10 bg-[#fff7cf]/80 px-3 py-3'>
        {contextSwitchNotice ? (
          <div
            data-testid='kangur-ai-tutor-context-switch'
            className='mb-3 rounded-[20px] border-2 border-slate-900 bg-white px-3 py-2 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.1)]'
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
          {bridgeSummaryChipLabel ? (
            <span
              data-testid='kangur-ai-tutor-bridge-chip'
              data-bridge-action-id={bridgeQuickActionId ?? 'none'}
              className='rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800'
            >
              {bridgeSummaryChipLabel}
            </span>
          ) : null}
        </div>
        {resolvedSelectedText ? (
          <div
            data-testid='kangur-ai-tutor-selected-text-preview'
            className='mt-2 rounded-2xl border border-amber-200/80 bg-white/85 px-3 py-3 text-slate-700 shadow-[0_10px_24px_-18px_rgba(180,83,9,0.24)]'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <div className='text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700'>
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
            <div className='mt-2 text-[11px] leading-relaxed text-slate-600'>
              {isSelectionExplainPendingMode
                ? tutorContent.panelContext.selectedPendingDetail
                : showSelectionExplainCompleteState
                  ? tutorContent.panelContext.selectedCompleteDetail
                  : tutorContent.panelContext.selectedDefaultDetail}
            </div>
            {isSelectionExplainPendingMode ? (
              <div
                data-testid='kangur-ai-tutor-selected-text-pending-status'
                className='mt-2 rounded-2xl border border-amber-100 bg-amber-50/85 px-3 py-2 text-[11px] font-semibold text-amber-900'
              >
                {tutorContent.panelContext.selectedPendingStatus}
              </div>
            ) : showSelectionExplainCompleteState ? (
              <div
                data-testid='kangur-ai-tutor-selected-text-complete-status'
                className='mt-2 rounded-2xl border border-emerald-100 bg-emerald-50/85 px-3 py-2 text-[11px] font-semibold text-emerald-900'
              >
                {tutorContent.panelContext.selectedCompleteStatus}
              </div>
            ) : null}
          </div>
        ) : highlightedSection ? (
          <div
            data-testid='kangur-ai-tutor-section-preview'
            className='mt-2 rounded-2xl border border-amber-200/80 bg-white/85 px-3 py-3 text-slate-700 shadow-[0_10px_24px_-18px_rgba(180,83,9,0.24)]'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <div className='text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700'>
                  {tutorContent.panelContext.sectionTitle}
                </div>
                <div className='mt-2 text-xs font-semibold leading-relaxed text-slate-800'>
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
            <div className='mt-2 text-[11px] leading-relaxed text-slate-600'>
              {isSectionExplainPendingMode
                ? tutorContent.panelContext.sectionPendingDetail
                : showSectionExplainCompleteState
                  ? tutorContent.panelContext.sectionCompleteDetail
                  : tutorContent.panelContext.sectionDefaultDetail}
            </div>
            {isSectionExplainPendingMode ? (
              <div
                data-testid='kangur-ai-tutor-section-pending-status'
                className='mt-2 rounded-2xl border border-amber-100 bg-amber-50/85 px-3 py-2 text-[11px] font-semibold text-amber-900'
              >
                {tutorContent.panelContext.sectionPendingStatus}
              </div>
            ) : showSectionExplainCompleteState ? (
              <div
                data-testid='kangur-ai-tutor-section-complete-status'
                className='mt-2 rounded-2xl border border-emerald-100 bg-emerald-50/85 px-3 py-2 text-[11px] font-semibold text-emerald-900'
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

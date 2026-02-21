'use client';

import React from 'react';

import { Button, Tabs, TabsList, TabsTrigger } from '@/shared/ui';

import {
  isCardImageRemovalLocked,
  formatBytes,
  formatDateTime,
  formatLinkedVariantTimestamp,
  EMPTY_ENVIRONMENT_REFERENCE_DRAFT,
} from './slot-inline-edit-utils';
import { SlotInlineEditCardTab } from './SlotInlineEditCardTab';
import { SlotInlineEditCompositesTab } from './SlotInlineEditCompositesTab';
import { SlotInlineEditEnvironmentTab } from './SlotInlineEditEnvironmentTab';
import { SlotInlineEditGenerationsTab } from './SlotInlineEditGenerationsTab';
import { SlotInlineEditMasksTab } from './SlotInlineEditMasksTab';
import { useStudioInlineEdit } from './StudioInlineEditContext';
import { ExtractPromptParamsModal } from '../modals/ExtractPromptParamsModal';
import { GenerationPreviewModal } from '../modals/GenerationPreviewModal';
import { SlotInlineEditModal } from '../modals/SlotInlineEditModal';

export function StudioInlineEditPanels(): React.JSX.Element {
  const {
    compositeTabInputImages,
    compositeTabInputSourceLabel,
    editCardTab,
    environmentPreviewDimensions,
    environmentPreviewSource,
    environmentReferenceDraft,
    extractBusy,
    extractDraftPrompt,
    extractError,
    extractHistory,
    extractReviewOpen,
    generationPreviewModalOpen,
    inlineCardImageManagerController,
    inlinePreviewBase64Bytes,
    inlinePreviewDimensions,
    inlinePreviewMimeType,
    inlinePreviewSource,
    linkedGeneratedVariants,
    linkedMaskSlots,
    linkedRunsQuery,
    linkedVariantApplyBusyKey,
    onApplyLinkedVariantToCard,
    onClearSlotImage,
    onCopyCardId,
    onOpenGenerationPreviewModal,
    onRefreshLinkedRuns,
    onReplaceFromDrive,
    onReplaceFromLocal,
    onSaveInlineSlot,
    onUploadEnvironmentFromDrive,
    onUploadEnvironmentFromLocal,
    previewControls,
    previewLeaves,
    previewParams,
    previewValidation,
    selectedExtractChanged,
    selectedExtractDiffLines,
    selectedExtractHistory,
    selectedGenerationModalDimensions,
    selectedGenerationPreview,
    selectedGenerationPreviewDimensions,
    selectedSlot,
    setEditCardTab,
    setEnvironmentPreviewNaturalSize,
    setEnvironmentReferenceDraft,
    setExtractDraftPrompt,
    setExtractHistory,
    setExtractReviewOpen,
    setGenerationModalPreviewNaturalSize,
    setGenerationPreviewModalOpen,
    setGenerationPreviewNaturalSize,
    setInlinePreviewNaturalSize,
    setSelectedExtractHistoryId,
    setSlotFolderDraft,
    setSlotInlineEditOpen,
    setSlotNameDraft,
    slotBase64Draft,
    slotFolderDraft,
    slotInlineEditOpen,
    slotNameDraft,
    slotUpdateBusy,
    sourceCompositeImage,
    studioSettings,
    uploadPending,
    handleAiExtraction,
    handleApplyExtraction,
    handleProgrammaticExtraction,
    handleSmartExtraction,
    handleSuggestUiControls,
  } = useStudioInlineEdit();

  const linkedRunsErrorMessageForCard = linkedRunsQuery.error instanceof Error
    ? linkedRunsQuery.error.message
    : 'Failed to load linked variants.';
    
  const linkedRunsErrorMessageForGenerations = linkedRunsQuery.error instanceof Error
    ? linkedRunsQuery.error.message
    : 'Failed to load generated images.';

  const editCardModalHeader = (
    <div className='flex items-center gap-3'>
      <div className='flex items-center gap-4'>
        <Button
          onClick={() => {
            void onSaveInlineSlot();
          }}
          disabled={slotUpdateBusy || !selectedSlot}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          {slotUpdateBusy ? 'Saving...' : 'Save Card'}
        </Button>
        <div className='flex items-center gap-2'>
          <h2 className='text-2xl font-bold text-white'>Edit Card</h2>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SlotInlineEditModal
        isOpen={slotInlineEditOpen}
        onClose={() => setSlotInlineEditOpen(false)}
        onSuccess={() => {}}
        item={selectedSlot}
        onCopyId={(id) => { void onCopyCardId(id); }}
        header={editCardModalHeader}
      >
        <Tabs
          value={editCardTab}
          onValueChange={(value: string) => {
            if (
              value === 'card' ||
              value === 'generations' ||
              value === 'environment' ||
              value === 'masks' ||
              value === 'composites'
            ) {
              setEditCardTab(value);
            }
          }}
          className='space-y-4'
        >
          <TabsList className='grid w-full grid-cols-5 bg-card/50'>
            <TabsTrigger value='card' className='text-xs'>Card</TabsTrigger>
            <TabsTrigger value='generations' className='text-xs'>Generations</TabsTrigger>
            <TabsTrigger value='environment' className='text-xs'>Environment</TabsTrigger>
            <TabsTrigger value='masks' className='text-xs'>Masks</TabsTrigger>
            <TabsTrigger value='composites' className='text-xs'>Composites</TabsTrigger>
          </TabsList>
          <SlotInlineEditCardTab
            clearImageDisabled={slotUpdateBusy || isCardImageRemovalLocked(selectedSlot)}
            {...(isCardImageRemovalLocked(selectedSlot)
              ? {
                clearImageTitle:
                    'Card image is locked and can only be removed by deleting the card.',
              }
              : {})}
            formatBytes={formatBytes}
            formatDateTime={formatDateTime}
            formatLinkedVariantTimestamp={formatLinkedVariantTimestamp}
            inlineCardImageManagerController={inlineCardImageManagerController}
            inlinePreviewBase64Bytes={inlinePreviewBase64Bytes}
            inlinePreviewDimensions={inlinePreviewDimensions}
            inlinePreviewMimeType={inlinePreviewMimeType}
            inlinePreviewSource={inlinePreviewSource}
            linkedGeneratedVariants={linkedGeneratedVariants}
            linkedRunsErrorMessage={linkedRunsErrorMessageForCard}
            linkedRunsIsError={linkedRunsQuery.isError}
            linkedRunsIsFetching={linkedRunsQuery.isFetching}
            linkedRunsIsLoading={linkedRunsQuery.isLoading}
            linkedVariantApplyBusyKey={linkedVariantApplyBusyKey}
            onApplyLinkedVariantToCard={(variant) => {
              void onApplyLinkedVariantToCard(variant);
            }}
            onClearSlotImage={() => {
              void onClearSlotImage();
            }}
            onRefreshLinkedRuns={() => {
              onRefreshLinkedRuns();
            }}
            onReplaceFromDrive={onReplaceFromDrive}
            onReplaceFromLocal={onReplaceFromLocal}
            onSlotFolderChange={setSlotFolderDraft}
            onSlotNameChange={setSlotNameDraft}
            selectedSlot={selectedSlot}
            setInlinePreviewNaturalSize={setInlinePreviewNaturalSize}
            slotBase64Draft={slotBase64Draft}
            slotFolderDraft={slotFolderDraft}
            slotNameDraft={slotNameDraft}
            slotUpdateBusy={slotUpdateBusy}
            uploadPending={uploadPending}
          />
          <SlotInlineEditGenerationsTab
            formatBytes={formatBytes}
            formatLinkedVariantTimestamp={formatLinkedVariantTimestamp}
            linkedGeneratedVariants={linkedGeneratedVariants}
            linkedRunsErrorMessage={linkedRunsErrorMessageForGenerations}
            linkedRunsIsError={linkedRunsQuery.isError}
            linkedRunsIsFetching={linkedRunsQuery.isFetching}
            linkedRunsIsLoading={linkedRunsQuery.isLoading}
            onOpenGenerationPreviewModal={onOpenGenerationPreviewModal}
            onRefreshLinkedRuns={() => {
              onRefreshLinkedRuns();
            }}
            selectedGenerationPreview={selectedGenerationPreview}
            selectedGenerationPreviewDimensions={selectedGenerationPreviewDimensions}
            selectedSlotName={selectedSlot?.name ?? null}
            setGenerationPreviewNaturalSize={setGenerationPreviewNaturalSize}
            slotNameDraft={slotNameDraft}
          />
          <SlotInlineEditEnvironmentTab
            canClearEnvironmentImage={Boolean(
              environmentReferenceDraft.imageFileId || environmentReferenceDraft.imageUrl.trim()
            )}
            environmentPreviewDimensions={environmentPreviewDimensions}
            environmentPreviewSource={environmentPreviewSource}
            environmentReferenceDraft={environmentReferenceDraft}
            formatBytes={formatBytes}
            formatDateTime={formatDateTime}
            onClearEnvironmentImage={() => {
              setEnvironmentReferenceDraft({ ...EMPTY_ENVIRONMENT_REFERENCE_DRAFT });
              setEnvironmentPreviewNaturalSize(null);
            }}
            onUploadEnvironmentFromDrive={onUploadEnvironmentFromDrive}
            onUploadEnvironmentFromLocal={onUploadEnvironmentFromLocal}
            selectedSlotName={selectedSlot?.name ?? null}
            setEnvironmentPreviewNaturalSize={setEnvironmentPreviewNaturalSize}
            slotNameDraft={slotNameDraft}
            uploadPending={uploadPending}
          />
          <SlotInlineEditMasksTab
            linkedMaskSlots={linkedMaskSlots}
            formatBytes={formatBytes}
            formatDateTime={formatDateTime}
          />
          <SlotInlineEditCompositesTab
            compositeTabInputImages={compositeTabInputImages}
            compositeTabInputSourceLabel={compositeTabInputSourceLabel}
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            sourceCompositeImage={sourceCompositeImage}
            formatBytes={formatBytes}
            formatDateTime={formatDateTime}
          />
        </Tabs>
      </SlotInlineEditModal>

      <GenerationPreviewModal
        isOpen={generationPreviewModalOpen}
        onClose={() => setGenerationPreviewModalOpen(false)}
        item={selectedGenerationPreview}
        selectedGenerationModalDimensions={selectedGenerationModalDimensions}
        slotUpdateBusy={slotUpdateBusy}
        handleApplyLinkedVariantToCard={onApplyLinkedVariantToCard}
        setGenerationModalPreviewNaturalSize={setGenerationModalPreviewNaturalSize}
      />

      <ExtractPromptParamsModal
        isOpen={extractReviewOpen}
        onClose={() => setExtractReviewOpen(false)}
        extractDraftPrompt={extractDraftPrompt}
        setExtractDraftPrompt={setExtractDraftPrompt}
        extractBusy={extractBusy}
        handleSmartExtraction={() => { void handleSmartExtraction(); }}
        handleProgrammaticExtraction={() => { void handleProgrammaticExtraction(); }}
        handleAiExtraction={() => { void handleAiExtraction(); }}
        handleSuggestUiControls={() => { void handleSuggestUiControls(); }}
        handleApplyExtraction={handleApplyExtraction}
        previewParams={previewParams}
        extractError={extractError}
        extractHistory={extractHistory}
        selectedExtractHistory={selectedExtractHistory}
        selectedExtractDiffLines={selectedExtractDiffLines}
        selectedExtractChanged={selectedExtractChanged}
        setSelectedExtractHistoryId={setSelectedExtractHistoryId}
        setExtractHistory={setExtractHistory}
        studioSettings={studioSettings}
        previewValidation={previewValidation}
        previewLeaves={previewLeaves}
        previewControls={previewControls}
      />
    </>
  );
}

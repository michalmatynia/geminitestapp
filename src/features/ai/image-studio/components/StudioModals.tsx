'use client';

import React from 'react';
import { useStudioModalsState } from '../hooks/useStudioModalsState';
import { DriveImportModal } from './modals/DriveImportModal';
import { SlotCreateModal } from './modals/SlotCreateModal';
import { SlotInlineEditModal } from './modals/SlotInlineEditModal';
import { GenerationPreviewModal } from './modals/GenerationPreviewModal';
import { ExtractPromptParamsModal } from './modals/ExtractPromptParamsModal';

export function StudioModals(): React.JSX.Element {
  const state = useStudioModalsState();

  return (
    <>
      <DriveImportModal
        isOpen={state.driveImportOpen}
        onClose={() => state.setDriveImportOpen(false)}
        title={state.driveImportMode === 'replace' ? 'Attach Image' : 'Import Images'}
        isUploading={state.uploadMutation.isPending}
        onSelectFile={(files) => {
          void state.handleDriveSelection(files);
        }}
      />

      <SlotCreateModal
        isOpen={state.slotCreateOpen}
        onClose={() => state.setSlotCreateOpen(false)}
        onSelectMode={(mode) => {
          if (mode === 'empty') {
            void state.handleCreateEmptySlot();
          } else if (mode === 'image') {
            state.setSlotCreateOpen(false);
            state.setDriveImportOpen(true);
          }
        }}
      />

      <SlotInlineEditModal
        isOpen={state.slotInlineEditOpen}
        onClose={() => state.setSlotInlineEditOpen(false)}
        selectedSlot={state.selectedSlot}
        onCopyId={(id) => state.handleCopyCardId(id)}
      >
        <div className='p-4'>
          {/* Card content based on state.editCardTab */}
          <p className='text-sm text-gray-400'>Edit Card: {state.selectedSlot?.name}</p>
        </div>
      </SlotInlineEditModal>

      <GenerationPreviewModal
        isOpen={state.generationPreviewModalOpen}
        onClose={() => state.setGenerationPreviewModalOpen(false)}
        selectedGenerationPreview={state.selectedGenerationPreview}
        generationModalPreviewNaturalSize={state.generationModalPreviewNaturalSize}
        selectedGenerationModalDimensions={state.selectedGenerationModalDimensions}
        slotUpdateBusy={state.slotUpdateBusy}
        handleApplyLinkedVariantToCard={state.handleApplyLinkedVariantToCard}
        setGenerationModalPreviewNaturalSize={state.setGenerationModalPreviewNaturalSize}
      />

      <ExtractPromptParamsModal
        isOpen={state.extractReviewOpen}
        onClose={() => state.setExtractReviewOpen(false)}
        extractDraftPrompt={state.extractDraftPrompt}
        setExtractDraftPrompt={state.setExtractDraftPrompt}
        extractBusy={state.extractBusy}
        handleSmartExtraction={state.handleSmartExtraction}
        handleProgrammaticExtraction={state.handleProgrammaticExtraction}
        handleAiExtraction={state.handleAiExtraction}
        handleSuggestUiControls={state.handleSuggestUiControls}
        handleApplyExtraction={state.handleApplyExtraction}
        previewParams={state.previewParams}
        extractError={state.extractError}
        extractHistory={state.extractHistory}
        selectedExtractHistory={null}
        selectedExtractDiffLines={[]}
        selectedExtractChanged={false}
        setSelectedExtractHistoryId={state.setSelectedExtractHistoryId}
        setExtractHistory={state.setExtractHistory}
        studioSettings={state.studioSettings}
        previewValidation={state.previewValidation}
        previewLeaves={state.previewLeaves}
        previewControls={state.previewControls}
      />
    </>
  );
}

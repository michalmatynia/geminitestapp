'use client';

import React from 'react';

import { Button, Tabs, TabsList, TabsTrigger } from '@/shared/ui';

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
    editCardTab,
    extractBusy,
    extractDraftPrompt,
    extractError,
    extractHistory,
    extractReviewOpen,
    generationPreviewModalOpen,
    onApplyLinkedVariantToCard,
    onCopyCardId,
    onSaveInlineSlot,
    previewControls,
    previewLeaves,
    previewParams,
    previewValidation,
    selectedExtractChanged,
    selectedExtractDiffLines,
    selectedExtractHistory,
    selectedGenerationModalDimensions,
    selectedGenerationPreview,
    selectedSlot,
    setEditCardTab,
    setExtractDraftPrompt,
    setExtractHistory,
    setExtractReviewOpen,
    setGenerationModalPreviewNaturalSize,
    setGenerationPreviewModalOpen,
    setSelectedExtractHistoryId,
    slotInlineEditOpen,
    setSlotInlineEditOpen,
    slotUpdateBusy,
    studioSettings,
    handleAiExtraction,
    handleApplyExtraction,
    handleProgrammaticExtraction,
    handleSmartExtraction,
    handleSuggestUiControls,
  } = useStudioInlineEdit();

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
          <SlotInlineEditCardTab />
          <SlotInlineEditGenerationsTab />
          <SlotInlineEditEnvironmentTab />
          <SlotInlineEditMasksTab />
          <SlotInlineEditCompositesTab />
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

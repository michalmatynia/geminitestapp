import React from 'react';

import type { ProductImageManagerController } from '@/features/products/components/ProductImageManager';
import { Button, Tabs, TabsList, TabsTrigger } from '@/shared/ui';

import {
  EMPTY_ENVIRONMENT_REFERENCE_DRAFT,
  formatBytes,
  formatDateTime,
  formatLinkedVariantTimestamp,
  isCardImageRemovalLocked,
} from './slot-inline-edit-utils';
import { SlotInlineEditCardTab } from './SlotInlineEditCardTab';
import { SlotInlineEditCompositesTab } from './SlotInlineEditCompositesTab';
import { SlotInlineEditEnvironmentTab } from './SlotInlineEditEnvironmentTab';
import { SlotInlineEditGenerationsTab } from './SlotInlineEditGenerationsTab';
import { SlotInlineEditMasksTab } from './SlotInlineEditMasksTab';
import { ExtractPromptParamsModal } from '../modals/ExtractPromptParamsModal';
import { GenerationPreviewModal } from '../modals/GenerationPreviewModal';
import { SlotInlineEditModal } from '../modals/SlotInlineEditModal';

import type {
  ParamUiControl,
  PromptDiffLine,
  PromptExtractHistoryEntry,
  PromptExtractValidationIssue,
} from './prompt-extract-utils';
import type {
  CompositeTabImageViewModel,
  EnvironmentReferenceDraftViewModel,
  InlinePreviewSourceViewModel,
  LinkedGeneratedVariantViewModel,
  LinkedMaskSlotViewModel,
} from './slot-inline-edit-tab-types';
import type { ImageStudioSlotRecord } from '../../types';

export type EditCardTab = 'card' | 'generations' | 'environment' | 'masks' | 'composites';

type StudioInlineEditPanelsProps = {
  compositeTabInputImages: CompositeTabImageViewModel[];
  compositeTabInputSourceLabel: string;
  editCardTab: EditCardTab;
  environmentPreviewDimensions: string;
  environmentPreviewSource: InlinePreviewSourceViewModel;
  environmentReferenceDraft: EnvironmentReferenceDraftViewModel;
  extractBusy: 'none' | 'programmatic' | 'smart' | 'ai' | 'ui';
  extractDraftPrompt: string;
  extractError: string | null;
  extractHistory: PromptExtractHistoryEntry[];
  extractReviewOpen: boolean;
  generationPreviewModalOpen: boolean;
  inlineCardImageManagerController: ProductImageManagerController;
  inlinePreviewBase64Bytes: number | null;
  inlinePreviewDimensions: string;
  inlinePreviewMimeType: string;
  inlinePreviewSource: InlinePreviewSourceViewModel;
  linkedGeneratedVariants: LinkedGeneratedVariantViewModel[];
  linkedMaskSlots: LinkedMaskSlotViewModel[];
  linkedRunsErrorMessageForCard: string;
  linkedRunsErrorMessageForGenerations: string;
  linkedRunsIsError: boolean;
  linkedRunsIsFetching: boolean;
  linkedRunsIsLoading: boolean;
  linkedVariantApplyBusyKey: string | null;
  onApplyLinkedVariantToCard: (variant: LinkedGeneratedVariantViewModel) => Promise<void>;
  onClearSlotImage: () => Promise<void>;
  onCopyCardId: (cardId: string) => Promise<void>;
  onOpenGenerationPreviewModal: (variant: LinkedGeneratedVariantViewModel) => void;
  onRefreshLinkedRuns: () => void;
  onReplaceFromDrive: () => void;
  onReplaceFromLocal: () => void;
  onSaveInlineSlot: () => Promise<void>;
  onUploadEnvironmentFromDrive: () => void;
  onUploadEnvironmentFromLocal: () => void;
  previewControls: Record<string, ParamUiControl>;
  previewLeaves: Array<{ path: string; value: unknown }>;
  previewParams: Record<string, unknown> | null;
  previewValidation: {
    before: PromptExtractValidationIssue[];
    after: PromptExtractValidationIssue[];
  } | null;
  selectedExtractChanged: boolean;
  selectedExtractDiffLines: PromptDiffLine[];
  selectedExtractHistory: PromptExtractHistoryEntry | null;
  selectedGenerationModalDimensions: string;
  selectedGenerationPreview: LinkedGeneratedVariantViewModel | null;
  selectedGenerationPreviewDimensions: string;
  selectedSlot: ImageStudioSlotRecord | null;
  setEditCardTab: (tab: EditCardTab) => void;
  setEnvironmentPreviewNaturalSize: (dimensions: { width: number; height: number } | null) => void;
  setEnvironmentReferenceDraft: React.Dispatch<React.SetStateAction<EnvironmentReferenceDraftViewModel>>;
  setExtractDraftPrompt: (prompt: string) => void;
  setExtractHistory: React.Dispatch<React.SetStateAction<PromptExtractHistoryEntry[]>>;
  setExtractReviewOpen: (open: boolean) => void;
  setGenerationModalPreviewNaturalSize: (dimensions: { width: number; height: number } | null) => void;
  setGenerationPreviewModalOpen: (open: boolean) => void;
  setGenerationPreviewNaturalSize: (dimensions: { width: number; height: number } | null) => void;
  setInlinePreviewNaturalSize: (dimensions: { width: number; height: number } | null) => void;
  setSelectedExtractHistoryId: (id: string | null) => void;
  setSlotFolderDraft: (value: string) => void;
  setSlotInlineEditOpen: (open: boolean) => void;
  setSlotNameDraft: (value: string) => void;
  slotBase64Draft: string;
  slotFolderDraft: string;
  slotInlineEditOpen: boolean;
  slotNameDraft: string;
  slotUpdateBusy: boolean;
  sourceCompositeImage: CompositeTabImageViewModel | null;
  studioSettings: { promptExtraction: { showValidationSummary: boolean } };
  uploadPending: boolean;
  handleAiExtraction: () => Promise<void>;
  handleApplyExtraction: () => void;
  handleProgrammaticExtraction: () => Promise<void>;
  handleSmartExtraction: () => Promise<void>;
  handleSuggestUiControls: () => Promise<void>;
};

export function StudioInlineEditPanels({
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
  linkedRunsErrorMessageForCard,
  linkedRunsErrorMessageForGenerations,
  linkedRunsIsError,
  linkedRunsIsFetching,
  linkedRunsIsLoading,
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
}: StudioInlineEditPanelsProps): React.JSX.Element {
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
            linkedRunsIsError={linkedRunsIsError}
            linkedRunsIsFetching={linkedRunsIsFetching}
            linkedRunsIsLoading={linkedRunsIsLoading}
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
            linkedRunsIsError={linkedRunsIsError}
            linkedRunsIsFetching={linkedRunsIsFetching}
            linkedRunsIsLoading={linkedRunsIsLoading}
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
            sourceCompositeImage={sourceCompositeImage as any}
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

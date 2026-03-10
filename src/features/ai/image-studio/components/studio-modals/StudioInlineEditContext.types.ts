'use client';

import type { ParamUiControl } from '@/features/ai/image-studio/utils/param-ui';
import type { ImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';
import type { ProductImageManagerController } from '@/features/products';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { PromptValidationIssue } from '@/shared/contracts/prompt-engine';
import type { ListQuery } from '@/shared/contracts/ui';

import type {
  PromptDiffLine,
  PromptExtractHistoryEntry,
} from './prompt-extract-utils';
import type {
  CompositeTabImageViewModel as CompositeTabImage,
  EnvironmentReferenceDraftViewModel as EnvironmentReferenceDraft,
  InlinePreviewSourceViewModel,
  LinkedGeneratedRunsResponse,
  LinkedGeneratedVariantViewModel as LinkedGeneratedVariant,
  LinkedMaskSlotViewModel,
} from './slot-inline-edit-tab-types';
import type React from 'react';

export type EditCardTab = 'card' | 'generations' | 'environment' | 'masks' | 'composites';

export type LocalUploadMode = 'create' | 'replace' | 'temporary-object' | 'environment';

export interface StudioInlineEditStateContextValue {
  selectedSlot: ImageStudioSlotRecord | null;
  slotInlineEditOpen: boolean;
  slotImageUrlDraft: string;
  slotBase64Draft: string;
  slotUpdateBusy: boolean;
  editCardTab: EditCardTab;
  slotNameDraft: string;
  slotFolderDraft: string;
  extractBusy: 'none' | 'programmatic' | 'smart' | 'ai' | 'ui';
  extractDraftPrompt: string;
  extractError: string | null;
  extractReviewOpen: boolean;
  previewParams: Record<string, unknown> | null;
  previewValidation: {
    before: PromptValidationIssue[];
    after: PromptValidationIssue[];
  } | null;
  previewLeaves: Array<{ path: string; value: unknown }>;
  previewControls: Record<string, ParamUiControl>;
  extractHistory: PromptExtractHistoryEntry[];
  selectedExtractHistory: PromptExtractHistoryEntry | null;
  selectedExtractDiffLines: PromptDiffLine[];
  selectedExtractChanged: boolean;
  environmentReferenceDraft: EnvironmentReferenceDraft;
  environmentPreviewSource: InlinePreviewSourceViewModel;
  environmentPreviewDimensions: string;
  linkedGeneratedVariants: LinkedGeneratedVariant[];
  selectedGenerationPreview: LinkedGeneratedVariant | null;
  selectedGenerationPreviewDimensions: string;
  generationPreviewModalOpen: boolean;
  selectedGenerationModalDimensions: string;
  linkedVariantApplyBusyKey: string | null;
  inlinePreviewSource: InlinePreviewSourceViewModel;
  inlinePreviewDimensions: string;
  inlinePreviewMimeType: string;
  inlinePreviewBase64Bytes: number | null;
  compositeTabInputImages: CompositeTabImage[];
  compositeTabInputSourceLabel: string;
  linkedMaskSlots: LinkedMaskSlotViewModel[];
  sourceCompositeImage?: CompositeTabImage;
  studioSettings: ImageStudioSettings;
  uploadPending: boolean;
  inlineCardImageManagerController: ProductImageManagerController;
  linkedRunsQuery: ListQuery<LinkedGeneratedVariant, LinkedGeneratedRunsResponse>;
}

export interface StudioInlineEditActionsContextValue {
  setEditCardTab: (tab: EditCardTab) => void;
  setSlotNameDraft: (name: string) => void;
  setSlotFolderDraft: (folder: string) => void;
  setGenerationPreviewModalOpen: (open: boolean) => void;
  onSaveInlineSlot: () => Promise<void>;
  onClearSlotImage: () => Promise<void>;
  onCopyCardId: (id: string) => Promise<void>;
  onRefreshLinkedRuns: () => void;
  onOpenGenerationPreviewModal: (variant: LinkedGeneratedVariant) => void;
  onApplyLinkedVariantToCard: (variant: LinkedGeneratedVariant) => Promise<void>;
  setInlinePreviewNaturalSize: (size: { width: number; height: number } | null) => void;
  setEnvironmentPreviewNaturalSize: (size: { width: number; height: number } | null) => void;
  setGenerationPreviewNaturalSize: (size: { width: number; height: number } | null) => void;
  setGenerationModalPreviewNaturalSize: (size: { width: number; height: number } | null) => void;
  setExtractDraftPrompt: (prompt: string) => void;
  setExtractHistory: (history: PromptExtractHistoryEntry[]) => void;
  setSelectedExtractHistoryId: (id: string | null) => void;
  setExtractReviewOpen: (open: boolean) => void;
  setSlotInlineEditOpen: (open: boolean) => void;
  setEnvironmentReferenceDraft: React.Dispatch<React.SetStateAction<EnvironmentReferenceDraft>>;
  handleAiExtraction: () => Promise<void>;
  handleApplyExtraction: () => void;
  handleProgrammaticExtraction: () => Promise<void>;
  handleSmartExtraction: () => Promise<void>;
  handleSuggestUiControls: () => Promise<void>;
  onReplaceFromDrive: () => void;
  onReplaceFromLocal: () => void;
  onUploadEnvironmentFromDrive: () => void;
  onUploadEnvironmentFromLocal: () => void;
}

export type StudioInlineEditContextValue = StudioInlineEditStateContextValue &
  StudioInlineEditActionsContextValue;

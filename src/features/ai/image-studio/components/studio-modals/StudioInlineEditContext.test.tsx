// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  StudioInlineEditProvider,
  useStudioInlineEdit,
  useStudioInlineEditActions,
  useStudioInlineEditState,
} from './StudioInlineEditContext';

const createRuntimeStub = () => ({
  inlineSlotLinkSyncTimeoutRef: { current: null as number | null },
  inlineSlotBase64SyncTimeoutRef: { current: null as number | null },
  suppressNextInlineDraftPersistenceOpsRef: { current: 0 },
  editCardTab: 'card' as const,
  setEditCardTab: vi.fn(),
  slotNameDraft: 'Draft card',
  setSlotNameDraft: vi.fn(),
  slotFolderDraft: 'Root',
  setSlotFolderDraft: vi.fn(),
  extractBusy: 'none' as const,
  setExtractBusy: vi.fn(),
  extractError: null as string | null,
  setExtractError: vi.fn(),
  previewParams: null as Record<string, unknown> | null,
  setPreviewParams: vi.fn(),
  previewSpecs: null,
  setPreviewSpecs: vi.fn(),
  previewControls: {},
  setPreviewControls: vi.fn(),
  previewValidation: null,
  setPreviewValidation: vi.fn(),
  previewLeaves: [],
  extractHistory: [],
  setExtractHistory: vi.fn(),
  selectedExtractHistory: null,
  selectedExtractDiffLines: [],
  selectedExtractChanged: false,
  setSelectedExtractHistoryId: vi.fn(),
  environmentReferenceDraft: {
    imageFileId: null,
    imageUrl: '',
    filename: '',
    mimetype: '',
    size: null,
    width: null,
    height: null,
    updatedAt: null,
  },
  setEnvironmentReferenceDraft: vi.fn(),
  environmentPreviewSource: null,
  environmentPreviewDimensions: 'n/a',
  linkedGeneratedVariants: [],
  selectedGenerationPreview: null,
  selectedGenerationPreviewDimensions: 'n/a',
  generationPreviewModalOpen: false,
  setGenerationPreviewModalOpen: vi.fn(),
  selectedGenerationModalDimensions: 'n/a',
  linkedVariantApplyBusyKey: null as string | null,
  setLinkedVariantApplyBusyKey: vi.fn(),
  inlinePreviewSource: null,
  inlinePreviewDimensions: 'n/a',
  inlinePreviewMimeType: 'n/a',
  inlinePreviewBase64Bytes: null as number | null,
  compositeTabInputImages: [],
  compositeTabInputSourceLabel: 'No inputs',
  linkedMaskSlots: [],
  sourceCompositeImage: undefined,
  setGenerationPreviewKey: vi.fn(),
  setGenerationPreviewNaturalSize: vi.fn(),
  setGenerationModalPreviewNaturalSize: vi.fn(),
  setInlinePreviewNaturalSize: vi.fn(),
  setEnvironmentPreviewNaturalSize: vi.fn(),
  linkedRunsQuery: {
    refetch: vi.fn(),
  },
});

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  triggerLocalUpload: vi.fn(),
  setDriveImportOpen: vi.fn(),
  setDriveImportMode: vi.fn(),
  setDriveImportTargetId: vi.fn(),
  setSlotInlineEditOpen: vi.fn(),
  setSlotImageUrlDraft: vi.fn(),
  setSlotBase64Draft: vi.fn(),
  setSlotUpdateBusy: vi.fn(),
  updateSlotMutation: {
    mutateAsync: vi.fn(),
  },
  uploadMutation: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  setExtractReviewOpen: vi.fn(),
  setExtractDraftPrompt: vi.fn(),
  setPromptText: vi.fn(),
  setParamsState: vi.fn(),
  setParamSpecs: vi.fn(),
  setParamUiOverrides: vi.fn(),
  setExtractPreviewUiOverrides: vi.fn(),
  handleSaveInlineSlot: vi.fn(),
  handleClearSlotImage: vi.fn(),
  handleApplyLinkedVariantToCard: vi.fn(),
  handleAiExtraction: vi.fn(),
  handleApplyExtraction: vi.fn(),
  handleProgrammaticExtraction: vi.fn(),
  handleSmartExtraction: vi.fn(),
  handleSuggestUiControls: vi.fn(),
  copyCardIdToClipboard: vi.fn(),
  runtime: null as ReturnType<typeof createRuntimeStub> | null,
}));

vi.mock('@/features/ai/ai-context-registry/context/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: () => null,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => undefined,
  }),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('../../context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-1',
  }),
}));

vi.mock('../../context/PromptContext', () => ({
  usePromptState: () => ({
    extractReviewOpen: false,
    extractDraftPrompt: 'Prompt draft',
  }),
  usePromptActions: () => ({
    setExtractReviewOpen: mocks.setExtractReviewOpen,
    setExtractDraftPrompt: mocks.setExtractDraftPrompt,
    setPromptText: mocks.setPromptText,
    setParamsState: mocks.setParamsState,
    setParamSpecs: mocks.setParamSpecs,
    setParamUiOverrides: mocks.setParamUiOverrides,
    setExtractPreviewUiOverrides: mocks.setExtractPreviewUiOverrides,
  }),
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettingsState: () => ({
    studioSettings: {
      promptExtraction: {
        mode: 'programmatic',
        applyAutofix: false,
        autoApplyFormattedPrompt: false,
        showValidationSummary: false,
      },
      uiExtractor: {
        mode: 'heuristic',
      },
    },
  }),
}));

vi.mock('../../context/SlotsContext', () => ({
  useSlotsState: () => ({
    slots: [],
    compositeAssets: [],
    selectedFolder: 'Root',
    selectedSlot: null,
    slotInlineEditOpen: true,
    slotImageUrlDraft: '',
    slotBase64Draft: '',
    slotUpdateBusy: false,
  }),
  useSlotsActions: () => ({
    updateSlotMutation: mocks.updateSlotMutation,
    setDriveImportOpen: mocks.setDriveImportOpen,
    setDriveImportMode: mocks.setDriveImportMode,
    setDriveImportTargetId: mocks.setDriveImportTargetId,
    uploadMutation: mocks.uploadMutation,
    setSlotInlineEditOpen: mocks.setSlotInlineEditOpen,
    setSlotImageUrlDraft: mocks.setSlotImageUrlDraft,
    setSlotBase64Draft: mocks.setSlotBase64Draft,
    setSlotUpdateBusy: mocks.setSlotUpdateBusy,
  }),
}));

vi.mock('./useStudioInlineEditRuntimeState', () => ({
  useStudioInlineEditRuntimeState: () => mocks.runtime as ReturnType<typeof createRuntimeStub>,
}));

vi.mock('./studio-modals-inline-slot-handlers', () => ({
  createInlineSlotHandlers: () => ({
    handleSaveInlineSlot: mocks.handleSaveInlineSlot,
    handleClearSlotImage: mocks.handleClearSlotImage,
    handleApplyLinkedVariantToCard: mocks.handleApplyLinkedVariantToCard,
  }),
}));

vi.mock('./studio-modals-prompt-handlers', () => ({
  createPromptExtractionHandlers: () => ({
    handleAiExtraction: mocks.handleAiExtraction,
    handleApplyExtraction: mocks.handleApplyExtraction,
    handleProgrammaticExtraction: mocks.handleProgrammaticExtraction,
    handleSmartExtraction: mocks.handleSmartExtraction,
    handleSuggestUiControls: mocks.handleSuggestUiControls,
  }),
  copyCardIdToClipboard: mocks.copyCardIdToClipboard,
}));

describe('StudioInlineEditContext', () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.triggerLocalUpload.mockReset();
    mocks.setDriveImportOpen.mockReset();
    mocks.setDriveImportMode.mockReset();
    mocks.setDriveImportTargetId.mockReset();
    mocks.setSlotInlineEditOpen.mockReset();
    mocks.setSlotImageUrlDraft.mockReset();
    mocks.setSlotBase64Draft.mockReset();
    mocks.setSlotUpdateBusy.mockReset();
    mocks.updateSlotMutation.mutateAsync.mockReset().mockResolvedValue(undefined);
    mocks.uploadMutation.isPending = false;
    mocks.uploadMutation.mutateAsync.mockReset().mockResolvedValue(undefined);
    mocks.setExtractReviewOpen.mockReset();
    mocks.setExtractDraftPrompt.mockReset();
    mocks.setPromptText.mockReset();
    mocks.setParamsState.mockReset();
    mocks.setParamSpecs.mockReset();
    mocks.setParamUiOverrides.mockReset();
    mocks.setExtractPreviewUiOverrides.mockReset();
    mocks.handleSaveInlineSlot.mockReset().mockResolvedValue(undefined);
    mocks.handleClearSlotImage.mockReset().mockResolvedValue(undefined);
    mocks.handleApplyLinkedVariantToCard.mockReset().mockResolvedValue(undefined);
    mocks.handleAiExtraction.mockReset().mockResolvedValue(undefined);
    mocks.handleApplyExtraction.mockReset();
    mocks.handleProgrammaticExtraction.mockReset().mockResolvedValue(undefined);
    mocks.handleSmartExtraction.mockReset().mockResolvedValue(undefined);
    mocks.handleSuggestUiControls.mockReset().mockResolvedValue(undefined);
    mocks.copyCardIdToClipboard.mockReset().mockResolvedValue(undefined);
    mocks.runtime = createRuntimeStub();
  });

  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useStudioInlineEditState())).toThrow(
      'useStudioInlineEditState must be used within StudioInlineEditProvider'
    );
    expect(() => renderHook(() => useStudioInlineEditActions())).toThrow(
      'useStudioInlineEditActions must be used within StudioInlineEditProvider'
    );
  });

  it('merges state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StudioInlineEditProvider triggerLocalUpload={mocks.triggerLocalUpload}>
        {children}
      </StudioInlineEditProvider>
    );

    const { result } = renderHook(() => useStudioInlineEdit(), { wrapper });

    expect(result.current.slotInlineEditOpen).toBe(true);
    expect(result.current.editCardTab).toBe('card');
    expect(result.current.uploadPending).toBe(false);

    act(() => {
      result.current.setEditCardTab('generations');
      result.current.onReplaceFromDrive();
      result.current.onUploadEnvironmentFromLocal();
      result.current.onRefreshLinkedRuns();
    });

    expect(mocks.runtime.setEditCardTab).toHaveBeenCalledWith('generations');
    expect(mocks.setDriveImportOpen).toHaveBeenCalledWith(true);
    expect(mocks.setDriveImportMode).toHaveBeenCalledWith('replace');
    expect(mocks.setDriveImportTargetId).toHaveBeenCalledWith(null);
    expect(mocks.triggerLocalUpload).toHaveBeenCalledWith('environment', null);
    expect(mocks.runtime.linkedRunsQuery.refetch).toHaveBeenCalledTimes(1);
  });
});

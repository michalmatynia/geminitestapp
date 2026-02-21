'use client';

import { useState, useCallback, useMemo } from 'react';

import { PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY, DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL } from '@/features/products/constants';
import { resolveProductImageUrl } from '@/features/products/utils/image-routing';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  toSlotName,
} from '../components/studio-modals/prompt-extract-utils';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState, usePromptActions } from '../context/PromptContext';
import { useSettingsState } from '../context/SettingsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
import { studioKeys } from '../hooks/useImageStudioQueries';

import type { PromptExtractHistoryEntry, PromptExtractValidationIssue } from '../components/studio-modals/prompt-extract-utils';
import type { ParamUiControl } from '../utils/param-ui';

type LinkedGeneratedRunRecord = {
  id: string;
  createdAt: string;
  outputs: Array<{
    id: string;
    filepath: string;
    filename: string;
    size: number;
    width: number | null;
    height: number | null;
  }>;
};

type LinkedGeneratedRunsResponse = {
  runs?: LinkedGeneratedRunRecord[];
  total?: number;
};

export type LinkedGeneratedVariant = {
  key: string;
  runId: string;
  runCreatedAt: string;
  outputIndex: number;
  outputCount: number;
  imageSrc: string;
  output: {
    id: string;
    filepath: string;
    filename: string;
    size: number;
    width: number | null;
    height: number | null;
  };
};

export function useStudioModalsState() {
  const { toast } = useToast();
  const { projectId } = useProjectsState();
  const settingsStore = useSettingsStore();
  const {
    slots,
    selectedFolder,
    selectedSlot,
    slotCreateOpen,
    driveImportOpen,
    driveImportMode,
    driveImportTargetId,
    slotInlineEditOpen,
    slotUpdateBusy,
  } = useSlotsState();
  const {
    setSelectedSlotId,
    createSlots,
    updateSlotMutation,
    setSlotCreateOpen,
    setDriveImportOpen,
    importFromDriveMutation,
    uploadMutation,
    setSlotInlineEditOpen,
    setSlotImageUrlDraft,
    setSlotBase64Draft,
    setSlotUpdateBusy,
  } = useSlotsActions();
  const { extractReviewOpen, extractDraftPrompt } = usePromptState();
  const {
    setExtractReviewOpen,
    setExtractDraftPrompt,
  } = usePromptActions();
  const { studioSettings } = useSettingsState();

  const [slotNameDraft, setSlotNameDraft] = useState('');
  const [slotFolderDraft, setSlotFolderDraft] = useState('');
  const [extractBusy] = useState<'none' | 'programmatic' | 'smart' | 'ai' | 'ui'>('none');
  const [extractError] = useState<string | null>(null);
  const [previewParams] = useState<Record<string, unknown> | null>(null);
  const [previewControls] = useState<Record<string, ParamUiControl>>({});
  const [previewValidation] = useState<{
    before: PromptExtractValidationIssue[];
    after: PromptExtractValidationIssue[];
  } | null>(null);
  const [extractHistory, setExtractHistory] = useState<PromptExtractHistoryEntry[]>([]);
  const [selectedExtractHistoryId, setSelectedExtractHistoryId] = useState<string | null>(null);
  const [editCardTab, setEditCardTab] = useState<'card' | 'generations' | 'environment' | 'masks' | 'composites'>('card');
  const [generationPreviewKey] = useState<string | null>(null);
  const [generationPreviewModalOpen, setGenerationPreviewModalOpen] = useState(false);
  const [generationModalPreviewNaturalSize, setGenerationModalPreviewNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const productImagesExternalBaseUrl = settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ?? DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const linkedRunsQuery = createListQueryV2<LinkedGeneratedRunsResponse, LinkedGeneratedRunsResponse>({
    queryKey: studioKeys.runs({
      projectId: projectId ?? null,
      sourceSlotId: selectedSlot?.id ?? null,
      status: 'completed',
      scope: 'slot-inline-edit',
    }),
    queryFn: async () => {
      if (!projectId || !selectedSlot?.id) return { runs: [], total: 0 };
      return await api.get<LinkedGeneratedRunsResponse>('/api/image-studio/runs', {
        params: { projectId, sourceSlotId: selectedSlot.id, status: 'completed', limit: 100, offset: 0 },
      });
    },
    enabled: Boolean(projectId && slotInlineEditOpen && selectedSlot?.id),
    staleTime: 5_000,
    meta: {
      source: 'image-studio.modals.linked-runs',
      operation: 'list',
      resource: 'image-studio.runs',
      domain: 'image_studio',
    },
  });

  const linkedGeneratedVariants = useMemo((): LinkedGeneratedVariant[] => {
    const runs = Array.isArray(linkedRunsQuery.data?.runs) ? linkedRunsQuery.data.runs : [];
    return runs.flatMap((run) => {
      const outputs = Array.isArray(run.outputs) ? run.outputs : [];
      return outputs.map((output, idx): LinkedGeneratedVariant | null => {
        if (!output.id || !output.filepath) return null;
        return {
          key: `${run.id}:${output.id}`,
          runId: run.id,
          runCreatedAt: run.createdAt,
          outputIndex: idx + 1,
          outputCount: outputs.length,
          imageSrc: resolveProductImageUrl(output.filepath, productImagesExternalBaseUrl) ?? output.filepath,
          output,
        };
      }).filter((v): v is LinkedGeneratedVariant => !!v);
    });
  }, [linkedRunsQuery.data?.runs, productImagesExternalBaseUrl]);

  const selectedGenerationPreview = useMemo(() => {
    if (!generationPreviewKey) return linkedGeneratedVariants[0] ?? null;
    return linkedGeneratedVariants.find(v => v.key === generationPreviewKey) ?? linkedGeneratedVariants[0] ?? null;
  }, [generationPreviewKey, linkedGeneratedVariants]);

  const selectedGenerationModalDimensions = useMemo(() => {
    const w = selectedGenerationPreview?.output.width ?? generationModalPreviewNaturalSize?.width;
    const h = selectedGenerationPreview?.output.height ?? generationModalPreviewNaturalSize?.height;
    return w && h ? `${w} x ${h}` : 'n/a';
  }, [selectedGenerationPreview, generationModalPreviewNaturalSize]);

  const handleApplyLinkedVariantToCard = useCallback(async (variant: LinkedGeneratedVariant) => {
    if (!selectedSlot) return;
    setSlotUpdateBusy(true);
    try {
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: { imageFileId: variant.output.id, imageUrl: variant.output.filepath, imageBase64: null },
      });
      setSlotImageUrlDraft(variant.output.filepath);
      setSlotBase64Draft('');
      toast('Linked variant applied to card.', { variant: 'success' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast(message || 'Failed to apply variant', { variant: 'error' });
    } finally {
      setSlotUpdateBusy(false);
    }
  }, [selectedSlot, updateSlotMutation, setSlotImageUrlDraft, setSlotBase64Draft, toast, setSlotUpdateBusy]);

  const handleDriveSelection = async (files: ImageFileSelection[]) => {
    setDriveImportOpen(false);
    if (files.length === 0) return;
    try {
      const result = await importFromDriveMutation.mutateAsync({ files, folder: selectedFolder });
      const imported = result.uploaded?.[0];
      if (!imported) throw new Error('Import failed');

      if (driveImportMode === 'replace' && driveImportTargetId) {
        await updateSlotMutation.mutateAsync({
          id: driveImportTargetId,
          data: { imageFileId: imported.id, imageUrl: imported.filepath, imageBase64: null },
        });
        toast('Card image updated.', { variant: 'success' });
      } else {
        const created = await createSlots([{
          name: toSlotName(imported.filename || '', 0),
          folderPath: selectedFolder,
          imageFileId: imported.id,
          imageUrl: imported.filepath,
        }]);
        if (created[0]) setSelectedSlotId(created[0].id);
        toast('Created card from import.', { variant: 'success' });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast(message || 'Import failed', { variant: 'error' });
    }
  };

  const handleCreateEmptySlot = async () => {
    setSlotCreateOpen(false);
    try {
      const created = await createSlots([{
        name: `Card ${slots.length + 1}`,
        folderPath: selectedFolder,
      }]);
      if (created[0]) setSelectedSlotId(created[0].id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast(message || 'Failed to create card', { variant: 'error' });
    }
  };

  const previewLeaves: Array<{ path: string; value: unknown }> = [];

  return {
    projectId,
    slots,
    selectedSlot,
    slotCreateOpen,
    setSlotCreateOpen,
    driveImportOpen,
    setDriveImportOpen,
    driveImportMode,
    slotInlineEditOpen,
    setSlotInlineEditOpen,
    slotUpdateBusy,
    extractReviewOpen,
    setExtractReviewOpen,
    extractDraftPrompt,
    setExtractDraftPrompt,
    extractBusy,
    extractError,
    previewParams,
    previewValidation,
    extractHistory,
    setExtractHistory,
    selectedExtractHistoryId,
    setSelectedExtractHistoryId,
    studioSettings,
    previewLeaves,
    previewControls,
    slotNameDraft,
    setSlotNameDraft,
    slotFolderDraft,
    setSlotFolderDraft,
    editCardTab,
    setEditCardTab,
    linkedGeneratedVariants,
    selectedGenerationPreview,
    generationPreviewModalOpen,
    setGenerationPreviewModalOpen,
    generationModalPreviewNaturalSize,
    setGenerationModalPreviewNaturalSize,
    selectedGenerationModalDimensions,
    handleApplyLinkedVariantToCard,
    handleDriveSelection,
    handleCreateEmptySlot,
    handleProgrammaticExtraction: () => {}, // Placeholders for now
    handleSmartExtraction: () => {},
    handleAiExtraction: () => {},
    handleSuggestUiControls: () => {},
    handleApplyExtraction: () => {},
    handleSaveInlineSlot: () => {},
    handleCopyCardId: (_id: string) => {},
    uploadMutation,
  };
}

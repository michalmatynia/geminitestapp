import { studioKeys } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import { api } from '@/shared/lib/api-client';

import { wait, type VariantThumbnailInfo } from './preview-utils';
import { resolveVariantSlotIdForCenterPreview } from './variant-thumbnails';

import type { VariantTooltipState } from './VariantTooltipPortal';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { QueryClient } from '@tanstack/react-query';
import type React from 'react';

type ToastVariant = 'error' | 'info' | 'success';
type ToastFn = (message: string, options?: { variant?: ToastVariant }) => void;

type TemporaryUpload = {
  id: string;
  filepath: string;
  filename: string;
  width: number | null;
  height: number | null;
};

type ResolveVariantSlotIdWithRetriesParams = {
  activeRunId: string | null;
  attempts: number;
  projectId: string | null;
  queryClient: QueryClient;
  refreshSlots: () => Promise<void>;
  rootVariantSourceSlotId: string | null;
  slots: ImageStudioSlotRecord[];
  variant: VariantThumbnailInfo;
};

type LoadVariantIntoCanvasParams = {
  activeRunId: string | null;
  projectId: string | null;
  queryClient: QueryClient;
  rootVariantSourceSlotId: string | null;
  setPreviewMode: (mode: 'image' | '3d') => void;
  setSelectedSlotId: (slotId: string | null) => void;
  setSingleVariantView: React.Dispatch<React.SetStateAction<'variant' | 'source'>>;
  setSplitVariantView: React.Dispatch<React.SetStateAction<boolean>>;
  setTemporaryObjectUpload: (upload: TemporaryUpload) => void;
  setWorkingSlotId: (slotId: string | null) => void;
  slots: ImageStudioSlotRecord[];
  toast: ToastFn;
  variant: VariantThumbnailInfo;
};

type DeleteVariantFromCenterPreviewParams = {
  activeRunId: string | null;
  buildVariantDismissKeys: (variant: VariantThumbnailInfo) => string[];
  clearActiveRunError: () => void;
  projectId: string | null;
  queryClient: QueryClient;
  rootVariantSourceSlotId: string | null;
  setSelectedSlotId: (slotId: string | null) => void;
  setWorkingSlotId: (slotId: string | null) => void;
  setDismissedVariantKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setVariantTooltip: React.Dispatch<React.SetStateAction<VariantTooltipState | null>>;
  slots: ImageStudioSlotRecord[];
  toast: ToastFn;
  variant: VariantThumbnailInfo;
};

type DeleteVariantApiResponse = {
  ok: boolean;
  modeUsed: 'slot_cascade' | 'asset_only' | 'noop';
  matchedSlotIds: string[];
  deletedSlotIds: string[];
  deletedFileIds: string[];
  deletedFilepaths: string[];
  warnings: string[];
};

const toTemporaryUpload = (variant: VariantThumbnailInfo): TemporaryUpload | null => {
  if (!variant.output) return null;
  return {
    id: variant.output.id,
    filepath: variant.output.filepath,
    filename: variant.output.filename,
    width: variant.output.width,
    height: variant.output.height,
  };
};

const resolveVariantSlotIdWithRetries = async ({
  activeRunId,
  attempts,
  projectId,
  queryClient,
  refreshSlots,
  rootVariantSourceSlotId,
  slots,
  variant,
}: ResolveVariantSlotIdWithRetriesParams): Promise<string | null> => {
  let resolvedSlotId = resolveVariantSlotIdForCenterPreview({
    activeRunId,
    candidateSlots: slots,
    rootVariantSourceSlotId,
    variant,
  });
  if (resolvedSlotId) return resolvedSlotId;
  if (!projectId) return null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await refreshSlots();

    const cached = queryClient.getQueryData<{ slots?: ImageStudioSlotRecord[] }>(
      studioKeys.slots(projectId)
    );
    const candidateSlots = Array.isArray(cached?.slots) ? cached.slots : slots;
    resolvedSlotId = resolveVariantSlotIdForCenterPreview({
      activeRunId,
      candidateSlots,
      rootVariantSourceSlotId,
      variant,
    });
    if (resolvedSlotId) return resolvedSlotId;

    await wait(180);
  }

  return null;
};

const dismissVariantFromUi = (
  buildVariantDismissKeys: (variant: VariantThumbnailInfo) => string[],
  clearActiveRunError: () => void,
  setDismissedVariantKeys: React.Dispatch<React.SetStateAction<Set<string>>>,
  setVariantTooltip: React.Dispatch<React.SetStateAction<VariantTooltipState | null>>,
  variant: VariantThumbnailInfo,
): void => {
  setDismissedVariantKeys((current) => {
    const next = new Set(current);
    buildVariantDismissKeys(variant).forEach((key) => {
      next.add(key);
    });
    return next;
  });
  setVariantTooltip((current) => (current?.variant.id === variant.id ? null : current));
  clearActiveRunError();
};

const refreshGenerationQueries = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === studioKeys.all[0] &&
      query.queryKey[1] === 'list' &&
      query.queryKey[2] === 'runs',
  });
};

const collectSourceParentSlotIds = (slot: ImageStudioSlotRecord | null): string[] => {
  if (!slot?.metadata || typeof slot.metadata !== 'object' || Array.isArray(slot.metadata)) return [];
  const metadata = slot.metadata;
  const ordered = new Set<string>();
  const primarySource =
    typeof metadata['sourceSlotId'] === 'string' ? metadata['sourceSlotId'].trim() : '';
  if (primarySource) ordered.add(primarySource);
  const sourceList = metadata['sourceSlotIds'];
  if (Array.isArray(sourceList)) {
    sourceList.forEach((value: unknown) => {
      if (typeof value !== 'string') return;
      const normalized = value.trim();
      if (!normalized) return;
      ordered.add(normalized);
    });
  }
  return Array.from(ordered);
};

export const loadVariantIntoCanvas = async ({
  activeRunId,
  projectId,
  queryClient,
  rootVariantSourceSlotId,
  setPreviewMode,
  setSelectedSlotId,
  setSingleVariantView,
  setSplitVariantView,
  setTemporaryObjectUpload,
  setWorkingSlotId,
  slots,
  toast,
  variant,
}: LoadVariantIntoCanvasParams): Promise<void> => {
  const resolvedSlotId = await resolveVariantSlotIdWithRetries({
    activeRunId,
    attempts: 6,
    projectId,
    queryClient,
    refreshSlots: async (): Promise<void> => {
      if (!projectId) return;
      await queryClient.refetchQueries({
        queryKey: studioKeys.slots(projectId),
        type: 'active',
      });
    },
    rootVariantSourceSlotId,
    slots,
    variant,
  });

  if (!resolvedSlotId) {
    const temporaryUpload = toTemporaryUpload(variant);
    if (temporaryUpload) {
      setTemporaryObjectUpload(temporaryUpload);
      toast('Variant linked to card. Open Edit Card to apply this generated output.', {
        variant: 'info',
      });
      return;
    }
    toast('Variant is still syncing to run outputs. Try again in a second.', { variant: 'info' });
    return;
  }

  const temporaryUpload = toTemporaryUpload(variant);
  if (temporaryUpload) {
    setTemporaryObjectUpload(temporaryUpload);
  }

  setSingleVariantView('variant');
  setSplitVariantView(false);
  setSelectedSlotId(resolvedSlotId);
  setWorkingSlotId(resolvedSlotId);
  setPreviewMode('image');
};

export const deleteVariantFromCenterPreview = async ({
  activeRunId,
  buildVariantDismissKeys,
  clearActiveRunError,
  projectId,
  queryClient,
  rootVariantSourceSlotId,
  setSelectedSlotId,
  setWorkingSlotId,
  setDismissedVariantKeys,
  setVariantTooltip,
  slots,
  toast,
  variant,
}: DeleteVariantFromCenterPreviewParams): Promise<void> => {
  try {
    if (!projectId) {
      toast('Select a project first.', { variant: 'info' });
      return;
    }

    const targetSlotId = await resolveVariantSlotIdWithRetries({
      activeRunId,
      attempts: 6,
      projectId,
      queryClient,
      refreshSlots: async (): Promise<void> => {
        if (!projectId) return;
        const response = await api.get<{ slots?: ImageStudioSlotRecord[] }>(
          `/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`,
          {
            cache: 'no-store',
            logError: false,
          },
        );
        queryClient.setQueryData(studioKeys.slots(projectId), response);
      },
      rootVariantSourceSlotId,
      slots,
      variant,
    });

    const runIdFromVariantId = variant.id.startsWith('run:')
      ? variant.id.split(':')[1]?.trim() ?? ''
      : '';
    const generationRunId = runIdFromVariantId || activeRunId?.trim() || null;
    const response = await api.post<DeleteVariantApiResponse>(
      `/api/image-studio/projects/${encodeURIComponent(projectId)}/variants/delete`,
      {
        slotId: targetSlotId ?? variant.slotId ?? undefined,
        assetId: variant.output?.id ?? undefined,
        filepath: variant.output?.filepath ?? variant.imageSrc ?? undefined,
        generationRunId: generationRunId ?? undefined,
        generationOutputIndex: Number.isFinite(variant.index) ? variant.index : undefined,
        sourceSlotId: rootVariantSourceSlotId ?? undefined,
      },
    );
    const slotById = new Map<string, ImageStudioSlotRecord>(
      slots.map((slot): [string, ImageStudioSlotRecord] => [slot.id, slot]),
    );
    const deletedSlotIds = new Set(
      response.deletedSlotIds
        .filter((slotId): slotId is string => typeof slotId === 'string')
        .map((slotId: string) => slotId.trim())
        .filter(Boolean),
    );
    const focusSlotCandidates = new Set<string>();
    const resolvedTargetSlotId = (targetSlotId ?? variant.slotId ?? '').trim();
    const targetSlotRecord = resolvedTargetSlotId ? slotById.get(resolvedTargetSlotId) ?? null : null;
    const deletedSlotRecords = Array.from(deletedSlotIds)
      .map((slotId: string) => slotById.get(slotId) ?? null)
      .filter((slot): slot is ImageStudioSlotRecord => Boolean(slot));
    const possibleParentSources = [
      targetSlotRecord,
      ...deletedSlotRecords,
    ];
    possibleParentSources.forEach((slot) => {
      collectSourceParentSlotIds(slot).forEach((parentId) => {
        if (deletedSlotIds.has(parentId)) return;
        focusSlotCandidates.add(parentId);
      });
    });
    const normalizedRootSourceSlotId = rootVariantSourceSlotId?.trim() ?? '';
    if (normalizedRootSourceSlotId && !deletedSlotIds.has(normalizedRootSourceSlotId)) {
      focusSlotCandidates.add(normalizedRootSourceSlotId);
    }

    if (response.modeUsed === 'noop') {
      const warning = response.warnings[0] || 'Variant delete did not remove any slot or file.';
      toast(warning, { variant: 'info' });
      refreshGenerationQueries(queryClient);
      return;
    }

    if (response.modeUsed === 'asset_only') {
      const warning = response.warnings[0] || 'Variant file was deleted without slot cascade.';
      toast(warning, { variant: 'info' });
    }

    if (response.modeUsed === 'slot_cascade') {
      toast('Variant node and linked files deleted.', { variant: 'success' });
    }

    dismissVariantFromUi(
      buildVariantDismissKeys,
      clearActiveRunError,
      setDismissedVariantKeys,
      setVariantTooltip,
      variant,
    );
    refreshGenerationQueries(queryClient);
    try {
      const refreshed = await api.get<{ slots?: ImageStudioSlotRecord[] }>(
        `/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`,
        {
          cache: 'no-store',
          logError: false,
        },
      );
      queryClient.setQueryData(studioKeys.slots(projectId), refreshed);
      const refreshedSlots = Array.isArray(refreshed?.slots) ? refreshed.slots : [];
      const refreshedIdSet = new Set(
        refreshedSlots
          .map((slot) => slot.id?.trim() ?? '')
          .filter(Boolean),
      );
      const nextFocusSlotId =
        Array.from(focusSlotCandidates).find((candidateId) => refreshedIdSet.has(candidateId)) ??
        null;
      if (nextFocusSlotId) {
        setWorkingSlotId(nextFocusSlotId);
        setSelectedSlotId(nextFocusSlotId);
      }
    } catch {
      // Best-effort cache refresh, fall back to invalidate/refetch below.
    }
    await queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
    await queryClient.refetchQueries({ queryKey: studioKeys.slots(projectId), type: 'active' });
  } catch (error: unknown) {
    toast(error instanceof Error ? error.message : 'Failed to delete variant.', { variant: 'error' });
  }
};

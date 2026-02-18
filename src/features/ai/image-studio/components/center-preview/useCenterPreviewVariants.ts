import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { normalizeImagePath, type VariantThumbnailInfo } from './preview-utils';
import { buildVariantThumbnails } from './variant-thumbnails';

import type { GenerationLandingSlot } from '../../context/GenerationContext';
import type { PendingSequenceThumbnailState } from '../../context/UiContext';
import type { ImageStudioSlotRecord } from '../../types';
import type { Dispatch, SetStateAction } from 'react';

type UseCenterPreviewVariantsArgs = {
  activeRunId: string | null;
  activeRunSourceSlotId: string | null;
  landingSlots: GenerationLandingSlot[];
  productImagesExternalBaseUrl: string;
  projectId: string | null;
  pendingSequenceThumbnail: PendingSequenceThumbnailState | null;
  rootVariantSourceSlotId: string | null;
  slots: ImageStudioSlotRecord[];
  workingSlot: ImageStudioSlotRecord | null;
};

type UseCenterPreviewVariantsResult = {
  activeVariantId: string | null;
  buildVariantDismissKeys: (variant: VariantThumbnailInfo) => string[];
  canCompareSelectedVariants: boolean;
  compareVariantA: VariantThumbnailInfo | null;
  compareVariantB: VariantThumbnailInfo | null;
  compareVariantIds: [string | null, string | null];
  compareVariantImageA: string | null;
  compareVariantImageB: string | null;
  filteredVariantThumbnails: VariantThumbnailInfo[];
  setCompareVariantIds: Dispatch<SetStateAction<[string | null, string | null]>>;
  setCompareVariantLookup: Dispatch<SetStateAction<Record<string, VariantThumbnailInfo>>>;
  setDismissedVariantKeys: Dispatch<SetStateAction<Set<string>>>;
  setVariantTimestampQuery: Dispatch<SetStateAction<string>>;
  variantTimestampQuery: string;
  visibleVariantThumbnails: VariantThumbnailInfo[];
};

export function useCenterPreviewVariants({
  activeRunId,
  activeRunSourceSlotId,
  landingSlots,
  productImagesExternalBaseUrl,
  projectId,
  pendingSequenceThumbnail,
  rootVariantSourceSlotId,
  slots,
  workingSlot,
}: UseCenterPreviewVariantsArgs): UseCenterPreviewVariantsResult {
  const [variantTimestampQuery, setVariantTimestampQuery] = useState('');
  const [compareVariantIds, setCompareVariantIds] = useState<[string | null, string | null]>([null, null]);
  const [compareVariantLookup, setCompareVariantLookup] = useState<Record<string, VariantThumbnailInfo>>({});
  const [dismissedVariantKeys, setDismissedVariantKeys] = useState<Set<string>>(new Set());
  const pendingDismissedVariantHydrationKeyRef = useRef<string | null>(null);

  const dismissedVariantStorageKey = useMemo((): string | null => {
    const normalizedProjectId = projectId?.trim() ?? '';
    const normalizedRunId = activeRunId?.trim() ?? '';
    if (!normalizedProjectId || !normalizedRunId) return null;
    return `image_studio_dismissed_variants:${normalizedProjectId}:${normalizedRunId}`;
  }, [activeRunId, projectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!dismissedVariantStorageKey) {
      pendingDismissedVariantHydrationKeyRef.current = null;
      setDismissedVariantKeys(new Set());
      return;
    }
    pendingDismissedVariantHydrationKeyRef.current = dismissedVariantStorageKey;
    const raw = window.localStorage.getItem(dismissedVariantStorageKey);
    if (!raw) {
      setDismissedVariantKeys(new Set());
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setDismissedVariantKeys(new Set());
        return;
      }
      const keys = parsed
        .filter((value: unknown): value is string => typeof value === 'string')
        .map((value: string) => value.trim())
        .filter(Boolean);
      setDismissedVariantKeys(new Set(keys));
    } catch {
      setDismissedVariantKeys(new Set());
    }
  }, [dismissedVariantStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!dismissedVariantStorageKey) return;
    if (pendingDismissedVariantHydrationKeyRef.current === dismissedVariantStorageKey) {
      pendingDismissedVariantHydrationKeyRef.current = null;
      return;
    }
    const serialized = JSON.stringify(Array.from(dismissedVariantKeys));
    window.localStorage.setItem(dismissedVariantStorageKey, serialized);
  }, [dismissedVariantKeys, dismissedVariantStorageKey]);

  const buildVariantDismissKeys = useCallback(
    (variant: VariantThumbnailInfo): string[] => {
      const keys = new Set<string>();
      keys.add(`id:${variant.id}`);
      const normalizedSlotId = variant.slotId?.trim() ?? '';
      if (normalizedSlotId) {
        keys.add(`slot:${normalizedSlotId}`);
      } else {
        // For transient variants without a concrete slot, fall back to output/path keys.
        if (variant.output?.id) {
          keys.add(`output:${variant.output.id}`);
        }
        const normalizedPath = normalizeImagePath(
          variant.output?.filepath ?? variant.imageSrc
        );
        if (normalizedPath) {
          keys.add(`path:${normalizedPath}`);
        }
      }
      return Array.from(keys);
    },
    []
  );

  const variantThumbnails = useMemo(() => {
    const builtVariants = buildVariantThumbnails({
      activeRunId,
      activeRunSourceSlotId,
      landingSlots,
      productImagesExternalBaseUrl,
      rootVariantSourceSlotId,
      slots,
    });

    const pendingRunId = pendingSequenceThumbnail?.runId?.trim() ?? '';
    if (!pendingRunId) return builtVariants;

    const pendingSourceSlotId = pendingSequenceThumbnail?.sourceSlotId?.trim() ?? '';
    const normalizedRootSourceSlotId = rootVariantSourceSlotId?.trim() ?? '';
    if (
      pendingSourceSlotId &&
      normalizedRootSourceSlotId &&
      pendingSourceSlotId !== normalizedRootSourceSlotId
    ) {
      return builtVariants;
    }

    const hasSyncedSequenceSlot = slots.some((slot) => {
      if (!slot.metadata || typeof slot.metadata !== 'object' || Array.isArray(slot.metadata)) return false;
      const metadata = slot.metadata;
      const sequence = metadata['sequence'];
      if (!sequence || typeof sequence !== 'object' || Array.isArray(sequence)) return false;
      const runId = typeof (sequence as Record<string, unknown>)['runId'] === 'string'
        ? ((sequence as Record<string, unknown>)['runId'] as string).trim()
        : '';
      return runId === pendingRunId;
    });
    if (hasSyncedSequenceSlot) return builtVariants;

    const pendingVariantId = `sequence:pending:${pendingRunId}`;
    if (builtVariants.some((variant) => variant.id === pendingVariantId)) return builtVariants;
    const nextIndex =
      builtVariants.length > 0
        ? Math.max(...builtVariants.map((variant) => variant.index)) + 1
        : 1;
    const pendingVariant: VariantThumbnailInfo = {
      id: pendingVariantId,
      index: nextIndex,
      status: 'pending',
      imageSrc: null,
      output: null,
      slotId: null,
      model: null,
      timestamp: pendingSequenceThumbnail?.startedAt ?? null,
      timestampLabel: 'Syncing...',
      timestampSearchText: 'sequence syncing pending',
      tokenCostUsd: null,
      actualCostUsd: null,
      costEstimated: false,
    };

    return [
      pendingVariant,
      ...builtVariants,
    ];
  },
  [
    activeRunId,
    activeRunSourceSlotId,
    landingSlots,
    pendingSequenceThumbnail,
    productImagesExternalBaseUrl,
    rootVariantSourceSlotId,
    slots,
  ]);

  const visibleVariantThumbnails = useMemo(
    () =>
      variantThumbnails.filter((variant) => {
        if (dismissedVariantKeys.has(`id:${variant.id}`)) return false;
        if (variant.slotId && dismissedVariantKeys.has(`slot:${variant.slotId}`)) {
          return false;
        }
        if (variant.output?.id && dismissedVariantKeys.has(`output:${variant.output.id}`)) {
          return false;
        }
        const normalizedPath = normalizeImagePath(
          variant.output?.filepath ?? variant.imageSrc
        );
        if (normalizedPath && dismissedVariantKeys.has(`path:${normalizedPath}`)) {
          return false;
        }
        return true;
      }),
    [dismissedVariantKeys, variantThumbnails]
  );

  useEffect(() => {
    setCompareVariantLookup((prev) => {
      if (visibleVariantThumbnails.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const variant of visibleVariantThumbnails) {
        if (next[variant.id] !== variant) {
          next[variant.id] = variant;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [visibleVariantThumbnails]);

  useEffect(() => {
    setCompareVariantLookup({});
    setCompareVariantIds([null, null]);
  }, [projectId]);

  const normalizedVariantTimestampQuery = variantTimestampQuery.trim().toLowerCase();
  const filteredVariantThumbnails = useMemo((): VariantThumbnailInfo[] => {
    if (!normalizedVariantTimestampQuery) return visibleVariantThumbnails;
    return visibleVariantThumbnails.filter((variant) =>
      variant.timestampSearchText.includes(normalizedVariantTimestampQuery)
    );
  }, [normalizedVariantTimestampQuery, visibleVariantThumbnails]);

  const compareVariantA = useMemo(
    () => {
      const compareVariantId = compareVariantIds[0];
      if (!compareVariantId) return null;
      return (
        visibleVariantThumbnails.find((variant) => variant.id === compareVariantId) ??
        compareVariantLookup[compareVariantId] ??
        null
      );
    },
    [compareVariantIds, compareVariantLookup, visibleVariantThumbnails]
  );

  const compareVariantB = useMemo(
    () => {
      const compareVariantId = compareVariantIds[1];
      if (!compareVariantId) return null;
      return (
        visibleVariantThumbnails.find((variant) => variant.id === compareVariantId) ??
        compareVariantLookup[compareVariantId] ??
        null
      );
    },
    [compareVariantIds, compareVariantLookup, visibleVariantThumbnails]
  );

  const compareVariantImageA = compareVariantA?.imageSrc ?? compareVariantA?.output?.filepath ?? null;
  const compareVariantImageB = compareVariantB?.imageSrc ?? compareVariantB?.output?.filepath ?? null;
  const canCompareSelectedVariants = Boolean(compareVariantImageA && compareVariantImageB);

  const activeVariantId = useMemo((): string | null => {
    if (!workingSlot) return null;

    const workingSlotId = workingSlot.id?.trim() ?? '';
    const workingOutputId = workingSlot.imageFileId?.trim() ?? '';
    const workingImagePath = normalizeImagePath(
      workingSlot.imageFile?.filepath ?? workingSlot.imageUrl ?? null
    );

    if (workingSlotId) {
      const bySlotId = visibleVariantThumbnails.find(
        (variant) => variant.slotId === workingSlotId
      );
      if (bySlotId) return bySlotId.id;
    }

    for (const variant of visibleVariantThumbnails) {
      if (workingOutputId && variant.output?.id === workingOutputId) {
        return variant.id;
      }
      const variantPath = normalizeImagePath(variant.output?.filepath ?? variant.imageSrc);
      if (workingImagePath && variantPath && workingImagePath === variantPath) {
        return variant.id;
      }
    }

    return null;
  }, [
    visibleVariantThumbnails,
    workingSlot,
    workingSlot?.imageFile?.filepath,
    workingSlot?.imageFileId,
    workingSlot?.imageUrl,
  ]);

  return {
    activeVariantId,
    buildVariantDismissKeys,
    canCompareSelectedVariants,
    compareVariantA,
    compareVariantB,
    compareVariantIds,
    compareVariantImageA,
    compareVariantImageB,
    filteredVariantThumbnails,
    setCompareVariantIds,
    setCompareVariantLookup,
    setDismissedVariantKeys,
    setVariantTimestampQuery,
    variantTimestampQuery,
    visibleVariantThumbnails,
  };
}

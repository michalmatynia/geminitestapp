import { estimateGenerationCost } from '@/features/ai/image-studio/utils/generation-cost';
import {
  getImageStudioSlotImageSrc,
  isLikelyImageStudioErrorText,
} from '@/features/ai/image-studio/utils/image-src';

import {
  asFiniteNumber,
  asObjectRecord,
  buildTimestampSearchText,
  formatTimestamp,
  normalizeImagePath,
  type VariantThumbnailInfo,
} from './preview-utils';

import type { VersionNode } from '../../context/VersionGraphContext';
import type { ImageStudioSlotRecord, SlotGenerationMetadata } from '../../types';

const GENERATED_SOURCE_PATH_REGEX = /^\/uploads\/studio\/(?:center|crops|upscale|autoscale)\/[^/]+\/([^/]+)\//i;

type LandingSlotLike = {
  index: number;
  status: string;
  output?: {
    id: string;
    filepath: string;
    filename?: string | null;
    size?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;
};

type BuildVariantThumbnailsParams = {
  activeRunId: string | null;
  activeRunSourceSlotId: string | null;
  landingSlots: LandingSlotLike[];
  productImagesExternalBaseUrl: string;
  rootVariantSourceSlotId: string | null;
  slots: ImageStudioSlotRecord[];
};

type ResolveVariantSlotIdParams = {
  activeRunId: string | null;
  candidateSlots: ImageStudioSlotRecord[];
  rootVariantSourceSlotId: string | null;
  variant: VariantThumbnailInfo;
};

const normalizeVariantStatus = (value: string): VariantThumbnailInfo['status'] => {
  if (value === 'completed' || value === 'failed') return value;
  return 'pending';
};

const toVariantOutput = (
  output: LandingSlotLike['output'],
  fallbackFilename: string,
): VariantThumbnailInfo['output'] => {
  if (!output) return null;
  return {
    id: output.id,
    filepath: output.filepath,
    filename: output.filename || fallbackFilename,
    size: typeof output.size === 'number' && Number.isFinite(output.size) ? output.size : 0,
    width: typeof output.width === 'number' && Number.isFinite(output.width) ? output.width : null,
    height: typeof output.height === 'number' && Number.isFinite(output.height) ? output.height : null,
  };
};

export const resolveSourceSlotIdFromGeneratedPath = (slot: ImageStudioSlotRecord | null): string | null => {
  if (!slot) return null;
  const sourcePath = normalizeImagePath(slot.imageFile?.url ?? slot.imageUrl ?? null);
  if (!sourcePath) return null;
  const match = sourcePath.match(GENERATED_SOURCE_PATH_REGEX);
  const sourceSlotId = match?.[1]?.trim() ?? '';
  return sourceSlotId || null;
};

export const isTreeRevealableCardSlot = (slot: ImageStudioSlotRecord | null): boolean => {
  if (!slot?.id) return false;
  const metadata = asObjectRecord(slot.metadata);
  if (!metadata) return true;

  const role = typeof metadata['role'] === 'string' ? metadata['role'].trim().toLowerCase() : '';
  const relationType = typeof metadata['relationType'] === 'string'
    ? metadata['relationType'].trim().toLowerCase()
    : '';

  const isGenerationDerived =
    role === 'generation' ||
    relationType.startsWith('generation:') ||
    relationType.startsWith('center:') ||
    relationType.startsWith('crop:') ||
    relationType.startsWith('upscale:') ||
    relationType.startsWith('autoscale:');

  return !isGenerationDerived;
};

const isGenerationSlotLinkedToRoot = (
  slot: ImageStudioSlotRecord,
  rootSourceSlotId: string,
  productImagesExternalBaseUrl: string,
): boolean => {
  const metadata = asObjectRecord(slot.metadata) as SlotGenerationMetadata | null;
  if (!metadata) return false;

  const relationType = typeof metadata.relationType === 'string' ? metadata.relationType : '';
  const source = typeof metadata.sourceSlotId === 'string' ? metadata.sourceSlotId.trim() : '';
  const sourceIds = Array.isArray(metadata.sourceSlotIds)
    ? metadata.sourceSlotIds.filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    )
    : [];

  const linkedToSource = source === rootSourceSlotId || sourceIds.includes(rootSourceSlotId);
  const isGeneration =
    metadata.role === 'generation' ||
    relationType.startsWith('generation:') ||
    relationType.startsWith('center:') ||
    relationType.startsWith('crop:') ||
    relationType.startsWith('upscale:') ||
    relationType.startsWith('autoscale:');
  const imageSrc = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);

  return linkedToSource && isGeneration && Boolean(imageSrc || slot.imageFileId);
};

const buildVariantFromSlot = (
  slot: ImageStudioSlotRecord,
  fallbackIndex: number,
  productImagesExternalBaseUrl: string,
): VariantThumbnailInfo => {
  const metadata = asObjectRecord(slot.metadata) as SlotGenerationMetadata | null;
  const generationParams = asObjectRecord(metadata?.generationParams);
  const generationRequest = asObjectRecord(metadata?.generationRequest);
  const generationCosts = asObjectRecord(metadata?.generationCosts);

  const model =
    (typeof generationParams?.['model'] === 'string' ? generationParams['model'] : null) ??
    (typeof generationRequest?.['model'] === 'string' ? generationRequest['model'] : null) ??
    null;
  const timestamp =
    (typeof generationParams?.['timestamp'] === 'string' ? generationParams['timestamp'] : null) ??
    (typeof generationRequest?.['timestamp'] === 'string' ? generationRequest['timestamp'] : null) ??
    null;
  const prompt =
    (typeof generationParams?.['prompt'] === 'string' ? generationParams['prompt'] : null) ??
    (typeof generationRequest?.['prompt'] === 'string' ? generationRequest['prompt'] : null) ??
    '';
  const outputCountCandidate =
    asFiniteNumber(metadata?.generationOutputCount) ??
    asFiniteNumber(generationParams?.['outputCount']) ??
    null;
  const outputCount = outputCountCandidate ?? 1;

  let tokenCostUsd = asFiniteNumber(generationCosts?.['tokenCostUsd']);
  let actualCostUsd = asFiniteNumber(generationCosts?.['actualCostUsd']);
  let costEstimated = generationCosts?.['estimated'] !== false;

  if ((tokenCostUsd === null || actualCostUsd === null) && model) {
    const estimate = estimateGenerationCost({
      prompt,
      model,
      outputCount,
    });
    if (tokenCostUsd === null) tokenCostUsd = estimate.promptCostUsdPerOutput;
    if (actualCostUsd === null) actualCostUsd = estimate.totalCostUsdPerOutput;
    costEstimated = true;
  }

  const slotImageFile = slot.imageFile ?? null;
  const resolvedSlotImageSrc = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
  const rawSlotImageUrl = typeof slot.imageUrl === 'string' ? slot.imageUrl.trim() : '';
  const safeSlotImageUrl =
    rawSlotImageUrl && !isLikelyImageStudioErrorText(rawSlotImageUrl)
      ? rawSlotImageUrl
      : '';
  const output = slotImageFile
    ? {
      id: slotImageFile.id,
      filepath: slotImageFile.url,
      filename: slotImageFile.filename || slot.name || `Generated ${fallbackIndex}`,
      size: slotImageFile.size,
      width: slotImageFile.width,
      height: slotImageFile.height,
    }
    : slot.imageFileId || safeSlotImageUrl
      ? {
        id: slot.imageFileId ?? `slot:${slot.id}`,
        filepath: safeSlotImageUrl,
        filename: slot.name || `Generated ${fallbackIndex}`,
        size: 0,
        width: null,
        height: null,
      }
      : null;

  const imageSrc = resolvedSlotImageSrc || output?.filepath || null;
  const rawIndex =
    asFiniteNumber(metadata?.generationOutputIndex) ??
    asFiniteNumber(generationParams?.['outputIndex']) ??
    fallbackIndex;
  const index = Math.max(1, Math.floor(rawIndex));

  return {
    id: `slot:${slot.id}`,
    index,
    status: output ? 'completed' : 'failed',
    imageSrc,
    output,
    slotId: slot.id,
    model,
    timestamp,
    timestampLabel: formatTimestamp(timestamp),
    timestampSearchText: buildTimestampSearchText(timestamp),
    tokenCostUsd,
    actualCostUsd,
    costEstimated,
  };
};

export const buildVariantThumbnails = ({
  activeRunId,
  activeRunSourceSlotId,
  landingSlots,
  productImagesExternalBaseUrl,
  rootVariantSourceSlotId,
  slots,
}: BuildVariantThumbnailsParams): VariantThumbnailInfo[] => {
  const rootSourceSlotId = rootVariantSourceSlotId;
  if (!rootSourceSlotId) return [];

  const historicalVariants: VariantThumbnailInfo[] = slots
    .filter((slot) => isGenerationSlotLinkedToRoot(slot, rootSourceSlotId, productImagesExternalBaseUrl))
    .map((slot, index) => buildVariantFromSlot(slot, index + 1, productImagesExternalBaseUrl))
    .sort((a, b) => {
      const aTs = a.timestamp ? Date.parse(a.timestamp) : Number.NaN;
      const bTs = b.timestamp ? Date.parse(b.timestamp) : Number.NaN;
      if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
        return bTs - aTs;
      }
      return b.index - a.index;
    });

  const historicalSlotIds = new Set<string>(
    historicalVariants
      .map((variant) => variant.slotId)
      .filter((slotId): slotId is string => typeof slotId === 'string' && slotId.length > 0),
  );
  const normalizedRootSourceSlotId = rootSourceSlotId.trim();
  const normalizedActiveRunSourceSlotId = activeRunSourceSlotId?.trim() ?? '';
  const canShowActiveRunLandingSlots =
    !normalizedActiveRunSourceSlotId ||
    normalizedActiveRunSourceSlotId === normalizedRootSourceSlotId;

  const transientVariants = landingSlots
    .map((landingSlot): VariantThumbnailInfo | null => {
      const output = toVariantOutput(landingSlot.output ?? null, `Generated ${landingSlot.index}`);
      const normalizedOutputPath = normalizeImagePath(output?.filepath);
      const matchingSlots = slots.filter((slot) => {
        const metadata = asObjectRecord(slot.metadata);
        const runId = typeof metadata?.['generationRunId'] === 'string' ? metadata['generationRunId'] : null;
        const outputIndex = typeof metadata?.['generationOutputIndex'] === 'number'
          ? metadata['generationOutputIndex']
          : null;

        if (activeRunId && runId === activeRunId && outputIndex === landingSlot.index) {
          return true;
        }
        if (!output) {
          return false;
        }
        if (slot.imageFileId === output.id) {
          return true;
        }
        if (normalizedOutputPath) {
          if (normalizeImagePath(slot.imageFile?.url) === normalizedOutputPath) {
            return true;
          }
          if (normalizeImagePath(slot.imageUrl) === normalizedOutputPath) {
            return true;
          }
        }
        return false;
      });

      const matchedSlot = matchingSlots.find((slot) => {
        const metadata = asObjectRecord(slot.metadata);
        const runId = typeof metadata?.['generationRunId'] === 'string' ? metadata['generationRunId'] : null;
        const outputIndex = typeof metadata?.['generationOutputIndex'] === 'number'
          ? metadata['generationOutputIndex']
          : null;
        return Boolean(activeRunId && runId === activeRunId && outputIndex === landingSlot.index);
      }) ?? matchingSlots[0] ?? null;

      if (!matchedSlot || !isGenerationSlotLinkedToRoot(matchedSlot, rootSourceSlotId, productImagesExternalBaseUrl)) {
        if (!canShowActiveRunLandingSlots) {
          return null;
        }

        return {
          id: `run:${activeRunId ?? 'pending'}:${landingSlot.index}`,
          index: landingSlot.index,
          status: normalizeVariantStatus(landingSlot.status),
          imageSrc: output?.filepath ?? null,
          output,
          slotId: null,
          model: null,
          timestamp: null,
          timestampLabel: formatTimestamp(null),
          timestampSearchText: buildTimestampSearchText(null),
          tokenCostUsd: null,
          actualCostUsd: null,
          costEstimated: false,
        };
      }

      if (historicalSlotIds.has(matchedSlot.id)) {
        return null;
      }

      const imageSrc =
        getImageStudioSlotImageSrc(matchedSlot, productImagesExternalBaseUrl) ?? output?.filepath ?? null;

      const metadata = asObjectRecord(matchedSlot.metadata) as SlotGenerationMetadata | null;
      const generationParams = asObjectRecord(metadata?.generationParams);
      const generationRequest = asObjectRecord(metadata?.generationRequest);
      const generationCosts = asObjectRecord(metadata?.generationCosts);

      const model =
        (typeof generationParams?.['model'] === 'string' ? generationParams['model'] : null) ??
        (typeof generationRequest?.['model'] === 'string' ? generationRequest['model'] : null) ??
        null;
      const timestamp =
        (typeof generationParams?.['timestamp'] === 'string' ? generationParams['timestamp'] : null) ??
        (typeof generationRequest?.['timestamp'] === 'string' ? generationRequest['timestamp'] : null) ??
        null;
      const prompt =
        (typeof generationParams?.['prompt'] === 'string' ? generationParams['prompt'] : null) ??
        (typeof generationRequest?.['prompt'] === 'string' ? generationRequest['prompt'] : null) ??
        '';
      const outputCountCandidate =
        asFiniteNumber(metadata?.generationOutputCount) ??
        asFiniteNumber(generationParams?.['outputCount']) ??
        (landingSlots.length > 0 ? landingSlots.length : null);
      const outputCount = outputCountCandidate ?? 1;

      let tokenCostUsd = asFiniteNumber(generationCosts?.['tokenCostUsd']);
      let actualCostUsd = asFiniteNumber(generationCosts?.['actualCostUsd']);
      let costEstimated = generationCosts?.['estimated'] !== false;

      if ((tokenCostUsd === null || actualCostUsd === null) && model) {
        const estimate = estimateGenerationCost({
          prompt,
          model,
          outputCount,
        });
        if (tokenCostUsd === null) tokenCostUsd = estimate.promptCostUsdPerOutput;
        if (actualCostUsd === null) actualCostUsd = estimate.totalCostUsdPerOutput;
        costEstimated = true;
      }

      return {
        id: `slot:${matchedSlot.id}`,
        index: landingSlot.index,
        status: normalizeVariantStatus(landingSlot.status),
        imageSrc,
        output,
        slotId: matchedSlot.id,
        model,
        timestamp,
        timestampLabel: formatTimestamp(timestamp),
        timestampSearchText: buildTimestampSearchText(timestamp),
        tokenCostUsd,
        actualCostUsd,
        costEstimated,
      };
    })
    .filter((variant): variant is VariantThumbnailInfo => Boolean(variant));

  const deduped = new Map<string, VariantThumbnailInfo>();
  [...transientVariants, ...historicalVariants].forEach((variant) => {
    if (!deduped.has(variant.id)) {
      deduped.set(variant.id, variant);
    }
  });

  return Array.from(deduped.values());
};

export const resolveVariantSlotIdForCenterPreview = ({
  activeRunId,
  candidateSlots,
  rootVariantSourceSlotId,
  variant,
}: ResolveVariantSlotIdParams): string | null => {
  const directSlotId = variant.slotId?.trim() ?? '';
  if (directSlotId && candidateSlots.some((slot) => slot.id === directSlotId)) {
    return directSlotId;
  }

  if (variant.output?.id) {
    const matchedByFileId = candidateSlots.find((slot) => slot.imageFileId === variant.output?.id);
    if (matchedByFileId) return matchedByFileId.id;
  }

  const variantOutputPath = normalizeImagePath(variant.output?.filepath ?? variant.imageSrc);
  if (variantOutputPath) {
    const matchedByPath = candidateSlots.find((slot) => {
      const imageFilePath = normalizeImagePath(slot.imageFile?.url);
      if (imageFilePath && imageFilePath === variantOutputPath) return true;
      const imageUrlPath = normalizeImagePath(slot.imageUrl);
      return Boolean(imageUrlPath && imageUrlPath === variantOutputPath);
    });
    if (matchedByPath) return matchedByPath.id;
  }

  const runIdFromVariantId = variant.id.startsWith('run:')
    ? variant.id.split(':')[1]?.trim() ?? ''
    : '';
  const normalizedRunId = runIdFromVariantId || activeRunId?.trim() || '';
  const normalizedRootSourceId = rootVariantSourceSlotId?.trim() ?? '';
  if (normalizedRunId) {
    const matchedByRunMetadata = candidateSlots.find((slot) => {
      const metadata = asObjectRecord(slot.metadata);
      const runId = typeof metadata?.['generationRunId'] === 'string' ? metadata['generationRunId'].trim() : '';
      if (!runId || runId !== normalizedRunId) return false;
      const outputIndex =
        typeof metadata?.['generationOutputIndex'] === 'number' && Number.isFinite(metadata['generationOutputIndex'])
          ? metadata['generationOutputIndex']
          : null;
      if (outputIndex !== variant.index) return false;
      if (!normalizedRootSourceId) return true;

      const sourceSlotId = typeof metadata?.['sourceSlotId'] === 'string' ? metadata['sourceSlotId'].trim() : '';
      if (sourceSlotId && sourceSlotId === normalizedRootSourceId) return true;
      const sourceSlotIds = Array.isArray(metadata?.['sourceSlotIds'])
        ? metadata['sourceSlotIds']
          .filter((value): value is string => typeof value === 'string')
          .map((value: string) => value.trim())
          .filter(Boolean)
        : [];
      return sourceSlotIds.includes(normalizedRootSourceId);
    });
    if (matchedByRunMetadata) return matchedByRunMetadata.id;
  }

  return null;
};

export const buildDetailsNodeForCenterPreview = (
  detailsSlot: ImageStudioSlotRecord | null,
  slots: ImageStudioSlotRecord[],
): VersionNode | null => {
  if (!detailsSlot) return null;

  const metadata = asObjectRecord(detailsSlot.metadata) as SlotGenerationMetadata | null;
  const sourceSlotIds = Array.isArray(metadata?.sourceSlotIds)
    ? metadata.sourceSlotIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];
  const sourceSlotId =
    typeof metadata?.sourceSlotId === 'string' && metadata.sourceSlotId.trim().length > 0
      ? metadata.sourceSlotId.trim()
      : null;
  const parentIds = sourceSlotIds.length > 0
    ? sourceSlotIds
    : sourceSlotId
      ? [sourceSlotId]
      : [];
  const childIds = slots
    .filter((slot) => {
      if (slot.id === detailsSlot.id) return false;
      const slotMetadata = asObjectRecord(slot.metadata) as SlotGenerationMetadata | null;
      if (!slotMetadata) return false;
      if (slotMetadata.sourceSlotId === detailsSlot.id) return true;
      return Array.isArray(slotMetadata.sourceSlotIds) && slotMetadata.sourceSlotIds.includes(detailsSlot.id);
    })
    .map((slot) => slot.id);

  let nodeType: VersionNode['type'] = 'base';
  if (metadata?.role === 'composite') {
    nodeType = 'composite';
  } else if (metadata?.role === 'merge' || parentIds.length > 1) {
    nodeType = 'merge';
  } else if (metadata?.role === 'generation' || parentIds.length === 1) {
    nodeType = 'generation';
  }

  const label = detailsSlot.name?.trim() || detailsSlot.id;
  return {
    id: detailsSlot.id,
    label,
    type: nodeType,
    parentIds,
    childIds,
    hasMask: Boolean(asObjectRecord(metadata?.maskData)),
    slot: detailsSlot,
    depth: 0,
    x: 0,
    y: 0,
    descendantCount: childIds.length,
  };
};

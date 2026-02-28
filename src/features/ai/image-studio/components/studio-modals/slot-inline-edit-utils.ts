import { resolveProductImageUrl } from '@/shared/utils/image-routing';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

import { isImageStudioSlotImageLocked } from '@/shared/lib/ai/image-studio/utils/slot-image-lock';

import type {
  CompositeTabImageViewModel,
  EnvironmentReferenceDraftViewModel,
  InlinePreviewSourceViewModel,
  LinkedGeneratedRunRecord,
  LinkedGeneratedVariantViewModel,
  LinkedMaskSlotViewModel,
} from './slot-inline-edit-tab-types';

export const applyEnvironmentReferenceAssetToDraft = (
  file: ImageFileRecord
): EnvironmentReferenceDraftViewModel => ({
  imageFileId: file.id,
  imageUrl: file.filepath,
  filename: file.filename || '',
  mimetype: file.mimetype,
  size: file.size,
  width: file.width ?? null,
  height: file.height ?? null,
  updatedAt: file.updatedAt || new Date().toISOString(),
});

export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

export const resolveSlotIdCandidates = (rawId: string): string[] => {
  const normalized = rawId.trim();
  if (!normalized) return [];

  const unprefixed = normalized.startsWith('slot:')
    ? normalized.slice('slot:'.length).trim()
    : normalized.startsWith('card:')
      ? normalized.slice('card:'.length).trim()
      : normalized;

  const candidates = new Set<string>([normalized]);
  if (unprefixed) {
    candidates.add(unprefixed);
    candidates.add(`slot:${unprefixed}`);
    candidates.add(`card:${unprefixed}`);
  }
  return Array.from(candidates);
};

export const EMPTY_ENVIRONMENT_REFERENCE_DRAFT: EnvironmentReferenceDraftViewModel = {
  imageFileId: null,
  imageUrl: '',
  filename: '',
  mimetype: '',
  size: null,
  width: null,
  height: null,
  updatedAt: null,
};

export const INLINE_CARD_IMAGE_SLOT_INDEX = 0;

export const slotHasRenderableImage = (slot: ImageStudioSlotRecord | null | undefined): boolean => {
  if (!slot) return false;
  const fileId = slot.imageFileId?.trim() ?? '';
  const filePath = slot.imageFile?.url?.trim() ?? '';
  const imageUrl = slot.imageUrl?.trim() ?? '';
  const imageBase64 = slot.imageBase64?.trim() ?? '';
  return Boolean(fileId || filePath || imageUrl || imageBase64);
};

export const isCardImageRemovalLocked = (slot: ImageStudioSlotRecord | null | undefined): boolean =>
  slotHasRenderableImage(slot) || isImageStudioSlotImageLocked(slot ?? null);

export const readEnvironmentReferenceDraft = (
  slot: ImageStudioSlotRecord | null
): EnvironmentReferenceDraftViewModel => {
  const metadata = asRecord(slot?.metadata);
  const environmentReference = asRecord(metadata?.['environmentReference']);
  if (!environmentReference) return { ...EMPTY_ENVIRONMENT_REFERENCE_DRAFT };

  const imageUrl =
    typeof environmentReference['imageUrl'] === 'string'
      ? environmentReference['imageUrl'].trim()
      : '';

  return {
    imageFileId:
      typeof environmentReference['imageFileId'] === 'string'
        ? environmentReference['imageFileId'].trim() || null
        : null,
    imageUrl,
    filename:
      typeof environmentReference['filename'] === 'string'
        ? environmentReference['filename'].trim()
        : '',
    mimetype:
      typeof environmentReference['mimetype'] === 'string'
        ? environmentReference['mimetype'].trim()
        : '',
    size: asFiniteNumber(environmentReference['size']),
    width: asFiniteNumber(environmentReference['width']),
    height: asFiniteNumber(environmentReference['height']),
    updatedAt:
      typeof environmentReference['updatedAt'] === 'string'
        ? environmentReference['updatedAt']
        : null,
  };
};

export const formatLinkedVariantTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export const formatBytes = (value: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'n/a';
  return parsed.toLocaleString();
};

export const estimateBase64Bytes = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const payload = trimmed.includes(',') ? trimmed.slice(trimmed.indexOf(',') + 1) : trimmed;
  const compact = payload.replace(/\s+/g, '');
  if (!compact) return null;
  const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
  const estimated = Math.floor((compact.length * 3) / 4) - padding;
  return estimated > 0 ? estimated : null;
};

export const extractDataUrlMimeType = (value: string): string | null => {
  const trimmed = value.trim();
  const match = trimmed.match(/^data:([^;,]+)[;,]/i);
  if (!match?.[1]) return null;
  return match[1];
};

export const resolveInlinePreviewMimeType = (
  fileMimeType: string | null | undefined,
  slotBase64Draft: string
): string => {
  const fromFile = fileMimeType?.trim() ?? '';
  if (fromFile) return fromFile;
  const fromBase64 = extractDataUrlMimeType(slotBase64Draft);
  if (fromBase64) return fromBase64;
  return 'n/a';
};

export const resolveDimensionLabel = (
  primaryWidth: number | null | undefined,
  primaryHeight: number | null | undefined,
  fallbackWidth: number | null | undefined = null,
  fallbackHeight: number | null | undefined = null
): string => {
  const width =
    typeof primaryWidth === 'number' && Number.isFinite(primaryWidth)
      ? primaryWidth
      : (fallbackWidth ?? null);
  const height =
    typeof primaryHeight === 'number' && Number.isFinite(primaryHeight)
      ? primaryHeight
      : (fallbackHeight ?? null);
  if (
    typeof width === 'number' &&
    Number.isFinite(width) &&
    typeof height === 'number' &&
    Number.isFinite(height)
  ) {
    return `${width} x ${height}`;
  }
  return 'n/a';
};

export const mapLinkedGeneratedVariants = (
  runs: LinkedGeneratedRunRecord[] | undefined,
  productImagesExternalBaseUrl: string
): LinkedGeneratedVariantViewModel[] => {
  const normalizedRuns = Array.isArray(runs) ? runs : [];
  return normalizedRuns.flatMap((run) => {
    const outputs = Array.isArray(run.outputs) ? run.outputs : [];
    return outputs
      .map((output, outputIndex): LinkedGeneratedVariantViewModel | null => {
        const outputPath = output.filepath?.trim() ?? '';
        if (!output.id || !outputPath) return null;
        return {
          key: `${run.id}:${output.id}`,
          runId: run.id,
          runCreatedAt: run.createdAt,
          outputIndex: outputIndex + 1,
          outputCount: outputs.length,
          imageSrc: resolveProductImageUrl(outputPath, productImagesExternalBaseUrl) ?? outputPath,
          output: {
            id: output.id,
            filepath: outputPath,
            filename: output.filename ?? '',
            size: typeof output.size === 'number' && Number.isFinite(output.size) ? output.size : 0,
            width:
              typeof output.width === 'number' && Number.isFinite(output.width)
                ? output.width
                : null,
            height:
              typeof output.height === 'number' && Number.isFinite(output.height)
                ? output.height
                : null,
          },
        };
      })
      .filter((variant): variant is LinkedGeneratedVariantViewModel => Boolean(variant));
  });
};

export const resolveSelectedGenerationPreview = (
  linkedGeneratedVariants: LinkedGeneratedVariantViewModel[],
  generationPreviewKey: string | null
): LinkedGeneratedVariantViewModel | null => {
  if (linkedGeneratedVariants.length === 0) return null;
  if (!generationPreviewKey) return linkedGeneratedVariants[0] ?? null;
  return (
    linkedGeneratedVariants.find((variant) => variant.key === generationPreviewKey) ??
    linkedGeneratedVariants[0] ??
    null
  );
};

export const resolveInlinePreviewSource = (
  slotBase64Draft: string,
  slotImageUrlDraft: string,
  selectedSlot: ImageStudioSlotRecord | null,
  productImagesExternalBaseUrl: string
): InlinePreviewSourceViewModel => {
  const normalizedDraftBase64 = slotBase64Draft.trim();
  if (normalizedDraftBase64) {
    return {
      src: normalizedDraftBase64,
      sourceType: 'Draft Base64',
      rawSource: '(inline base64)',
      resolvedSource: '(inline base64)',
    };
  }

  const normalizedDraftUrl = slotImageUrlDraft.trim();
  if (normalizedDraftUrl) {
    const resolved =
      resolveProductImageUrl(normalizedDraftUrl, productImagesExternalBaseUrl) ??
      normalizedDraftUrl;
    return {
      src: resolved,
      sourceType: 'Draft URL',
      rawSource: normalizedDraftUrl,
      resolvedSource: resolved,
    };
  }

  const filePath = selectedSlot?.imageFile?.url?.trim() ?? '';
  if (filePath) {
    const resolved = resolveProductImageUrl(filePath, productImagesExternalBaseUrl) ?? filePath;
    return {
      src: resolved,
      sourceType: 'Attached File',
      rawSource: filePath,
      resolvedSource: resolved,
    };
  }

  const storedUrl = selectedSlot?.imageUrl?.trim() ?? '';
  if (storedUrl) {
    const resolved = resolveProductImageUrl(storedUrl, productImagesExternalBaseUrl) ?? storedUrl;
    return {
      src: resolved,
      sourceType: 'Stored URL',
      rawSource: storedUrl,
      resolvedSource: resolved,
    };
  }

  return {
    src: null,
    sourceType: 'None',
    rawSource: 'n/a',
    resolvedSource: 'n/a',
  };
};

export const resolveEnvironmentPreviewSource = (
  environmentReferenceDraft: EnvironmentReferenceDraftViewModel,
  productImagesExternalBaseUrl: string
): InlinePreviewSourceViewModel => {
  const normalizedUrl = environmentReferenceDraft.imageUrl.trim();
  if (!normalizedUrl) {
    return {
      src: null,
      sourceType: 'None',
      rawSource: 'n/a',
      resolvedSource: 'n/a',
    };
  }
  const resolved =
    resolveProductImageUrl(normalizedUrl, productImagesExternalBaseUrl) ?? normalizedUrl;
  return {
    src: resolved,
    sourceType: environmentReferenceDraft.imageFileId ? 'Uploaded File' : 'Stored URL',
    rawSource: normalizedUrl,
    resolvedSource: resolved,
  };
};

export const mapLinkedMaskSlots = (
  slots: ImageStudioSlotRecord[],
  selectedSlotId: string | null | undefined,
  productImagesExternalBaseUrl: string
): LinkedMaskSlotViewModel[] => {
  const normalizedSelectedSlotId = selectedSlotId?.trim() ?? '';
  if (!normalizedSelectedSlotId) return [];

  return slots
    .filter((slot) => {
      const metadata = asRecord(slot.metadata);
      if (!metadata) return false;
      const role =
        typeof metadata['role'] === 'string' ? metadata['role'].trim().toLowerCase() : '';
      const relationType =
        typeof metadata['relationType'] === 'string'
          ? metadata['relationType'].trim().toLowerCase()
          : '';
      const sourceSlotId =
        typeof metadata['sourceSlotId'] === 'string' ? metadata['sourceSlotId'].trim() : '';
      const sourceSlotIds = Array.isArray(metadata['sourceSlotIds'])
        ? (metadata['sourceSlotIds'] as unknown[])
          .filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0
          )
          .map((value: string) => value.trim())
        : [];
      const linkedToSelected =
        sourceSlotId === normalizedSelectedSlotId ||
        sourceSlotIds.includes(normalizedSelectedSlotId);
      return linkedToSelected && (role === 'mask' || relationType.startsWith('mask:'));
    })
    .map((slot): LinkedMaskSlotViewModel => {
      const metadata = asRecord(slot.metadata);
      const relationType =
        typeof metadata?.['relationType'] === 'string' ? metadata['relationType'] : '';
      const variant = typeof metadata?.['variant'] === 'string' ? metadata['variant'] : 'unknown';
      const generationMode =
        typeof metadata?.['generationMode'] === 'string' ? metadata['generationMode'] : 'n/a';
      const inverted = Boolean(metadata?.['inverted']);
      const rawFilepath = slot.imageFile?.url?.trim() || slot.imageUrl?.trim() || null;
      const imageSrc = rawFilepath
        ? (resolveProductImageUrl(rawFilepath, productImagesExternalBaseUrl) ?? rawFilepath)
        : null;
      return {
        slotId: slot.id,
        name: slot.name?.trim() || slot.id,
        variant,
        inverted,
        relationType,
        generationMode,
        imageSrc,
        imageFileId: slot.imageFile?.id ?? slot.imageFileId ?? null,
        filepath: rawFilepath,
        filename: slot.imageFile?.filename ?? null,
        width: slot.imageFile?.width ?? null,
        height: slot.imageFile?.height ?? null,
        size: slot.imageFile?.size ?? null,
        updatedAt: slot.imageFile?.updatedAt ?? null,
      };
    })
    .sort((a, b) => {
      const aTs = a.updatedAt ? new Date(a.updatedAt).getTime() : Number.NaN;
      const bTs = b.updatedAt ? new Date(b.updatedAt).getTime() : Number.NaN;
      if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
        return bTs - aTs;
      }
      return a.name.localeCompare(b.name);
    });
};

export const mapSourceCompositeImage = (args: {
  selectedSlot: ImageStudioSlotRecord | null;
  inlinePreviewNaturalSize: { width: number; height: number } | null;
  inlinePreviewSource: InlinePreviewSourceViewModel;
  inlinePreviewBase64Bytes: number | null;
  slotNameDraft: string;
}): CompositeTabImageViewModel => {
  const {
    selectedSlot,
    inlinePreviewNaturalSize,
    inlinePreviewSource,
    inlinePreviewBase64Bytes,
    slotNameDraft,
  } = args;
  const width = selectedSlot?.imageFile?.width ?? inlinePreviewNaturalSize?.width ?? null;
  const height = selectedSlot?.imageFile?.height ?? inlinePreviewNaturalSize?.height ?? null;
  const rawSource = inlinePreviewSource.rawSource;
  return {
    key: `source:${selectedSlot?.id ?? 'draft'}`,
    source: 'source',
    name: slotNameDraft.trim() || selectedSlot?.name?.trim() || selectedSlot?.id || 'Source Card',
    sourceType: inlinePreviewSource.sourceType,
    slotId: selectedSlot?.id ?? null,
    order: null,
    imageSrc: inlinePreviewSource.src,
    imageFileId: selectedSlot?.imageFile?.id ?? selectedSlot?.imageFileId ?? null,
    filepath: rawSource === '(inline base64)' || rawSource === 'n/a' ? null : rawSource,
    filename: selectedSlot?.imageFile?.filename ?? null,
    width: typeof width === 'number' && Number.isFinite(width) ? width : null,
    height: typeof height === 'number' && Number.isFinite(height) ? height : null,
    size: selectedSlot?.imageFile?.size ?? inlinePreviewBase64Bytes ?? null,
    updatedAt: selectedSlot?.imageFile?.updatedAt ?? null,
  };
};

export const mapSavedCompositeInputImages = (args: {
  selectedSlot: ImageStudioSlotRecord | null;
  slots: ImageStudioSlotRecord[];
  productImagesExternalBaseUrl: string;
}): CompositeTabImageViewModel[] => {
  const { selectedSlot, slots, productImagesExternalBaseUrl } = args;
  if (!selectedSlot) return [];
  const metadata = asRecord(selectedSlot.metadata);
  const compositeConfig = asRecord(metadata?.['compositeConfig']);
  const rawLayers = Array.isArray(compositeConfig?.['layers'])
    ? (compositeConfig?.['layers'] as unknown[])
    : [];
  return rawLayers
    .map((layer, layerIndex): CompositeTabImageViewModel | null => {
      const layerRecord = asRecord(layer);
      if (!layerRecord) return null;
      const slotId = typeof layerRecord['slotId'] === 'string' ? layerRecord['slotId'].trim() : '';
      const layerSlot = slotId ? (slots.find((slot) => slot.id === slotId) ?? null) : null;
      const rawFilepath = layerSlot?.imageFile?.url?.trim() || layerSlot?.imageUrl?.trim() || null;
      const imageSrc = rawFilepath
        ? (resolveProductImageUrl(rawFilepath, productImagesExternalBaseUrl) ?? rawFilepath)
        : null;
      const order = asFiniteNumber(layerRecord['order']) ?? layerIndex;
      return {
        key: `saved:${slotId || `layer-${layerIndex}`}:${order}`,
        source: 'input',
        name: layerSlot?.name?.trim() || `Layer ${layerIndex + 1}`,
        sourceType: 'Saved Composite Layer',
        slotId: slotId || null,
        order,
        imageSrc,
        imageFileId: layerSlot?.imageFile?.id ?? layerSlot?.imageFileId ?? null,
        filepath: rawFilepath,
        filename: layerSlot?.imageFile?.filename ?? null,
        width: layerSlot?.imageFile?.width ?? null,
        height: layerSlot?.imageFile?.height ?? null,
        size: layerSlot?.imageFile?.size ?? null,
        updatedAt: layerSlot?.imageFile?.updatedAt ?? null,
      };
    })
    .filter((entry): entry is CompositeTabImageViewModel => Boolean(entry))
    .sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
};

export const mapActiveCompositeInputImages = (
  compositeAssets: ImageStudioSlotRecord[],
  productImagesExternalBaseUrl: string
): CompositeTabImageViewModel[] =>
  compositeAssets.map((slot, index): CompositeTabImageViewModel => {
    const rawFilepath = slot.imageFile?.url?.trim() || slot.imageUrl?.trim() || null;
    const imageSrc = rawFilepath
      ? (resolveProductImageUrl(rawFilepath, productImagesExternalBaseUrl) ?? rawFilepath)
      : null;
    return {
      key: `active:${slot.id}:${index}`,
      source: 'input',
      name: slot.name?.trim() || slot.id,
      sourceType: 'Active Composite Input',
      slotId: slot.id,
      order: index,
      imageSrc,
      imageFileId: slot.imageFile?.id ?? slot.imageFileId ?? null,
      filepath: rawFilepath,
      filename: slot.imageFile?.filename ?? null,
      width: slot.imageFile?.width ?? null,
      height: slot.imageFile?.height ?? null,
      size: slot.imageFile?.size ?? null,
      updatedAt: slot.imageFile?.updatedAt ?? null,
    };
  });

export const resolveCompositeTabInputSourceLabel = (
  savedCount: number,
  activeCount: number
): string => {
  if (savedCount > 0) {
    return 'Showing saved composite layers from this card.';
  }
  if (activeCount > 0) {
    return 'Showing active composite inputs selected in Studio.';
  }
  return 'No composite input images found for this card.';
};

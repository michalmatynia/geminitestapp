import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';
import { asFiniteNumber, asRecord } from './slot-inline-edit-utils';
import type {
  CompositeTabImageViewModel,
  InlinePreviewSourceViewModel,
  LinkedGeneratedRunRecord,
  LinkedGeneratedVariantViewModel,
  LinkedMaskSlotViewModel,
} from './slot-inline-edit-tab-types';

const mapOutputToViewModel = (
  output: { id: string; filepath: string; filename?: string | null; size?: number | null; width?: number | null; height?: number | null },
  outputIndex: number,
  outputCount: number,
  run: LinkedGeneratedRunRecord,
  productImagesExternalBaseUrl: string
): LinkedGeneratedVariantViewModel | null => {
  const outputPath = output.filepath.trim();
  if (output.id.length === 0 || outputPath.length === 0) return null;
  return {
    key: `${run.id}:${output.id}`,
    runId: run.id,
    runCreatedAt: run.createdAt,
    outputIndex: outputIndex + 1,
    outputCount,
    imageSrc: resolveProductImageUrl(outputPath, productImagesExternalBaseUrl) ?? outputPath,
    output: {
      id: output.id,
      filepath: outputPath,
      filename: output.filename ?? '',
      size: (typeof output.size === 'number' && Number.isFinite(output.size)) ? output.size : 0,
      width: (typeof output.width === 'number' && Number.isFinite(output.width)) ? output.width : null,
      height: (typeof output.height === 'number' && Number.isFinite(output.height)) ? output.height : null,
    },
  };
};

export const mapLinkedGeneratedVariants = (
  runs: LinkedGeneratedRunRecord[] | undefined,
  productImagesExternalBaseUrl: string
): LinkedGeneratedVariantViewModel[] => {
  const normalizedRuns = Array.isArray(runs) ? runs : [];
  return normalizedRuns.flatMap((run) => {
    const outputs = Array.isArray(run.outputs) ? run.outputs : [];
    return outputs
      .map((output, idx) => mapOutputToViewModel(output, idx, outputs.length, run, productImagesExternalBaseUrl))
      .filter((v): v is LinkedGeneratedVariantViewModel => v !== null);
  });
};

const isSlotLinkedToSelected = (metadata: Record<string, unknown>, selectedSlotId: string): boolean => {
  const sourceSlotId = typeof metadata['sourceSlotId'] === 'string' ? metadata['sourceSlotId'].trim() : '';
  if (sourceSlotId === selectedSlotId) return true;

  const rawSourceSlotIds = metadata['sourceSlotIds'];
  if (Array.isArray(rawSourceSlotIds)) {
    return (rawSourceSlotIds as unknown[]).some(v => typeof v === 'string' && v.trim() === selectedSlotId);
  }
  return false;
};

export const mapLinkedMaskSlots = (
  slots: ImageStudioSlotRecord[],
  selectedSlotId: string | null | undefined,
  productImagesExternalBaseUrl: string
): LinkedMaskSlotViewModel[] => {
  const normalizedSelectedSlotId = selectedSlotId?.trim() ?? '';
  if (normalizedSelectedSlotId.length === 0) return [];

  return slots
    .filter((slot) => {
      const metadata = asRecord(slot.metadata);
      if (metadata === null) return false;
      const role = typeof metadata['role'] === 'string' ? metadata['role'].trim().toLowerCase() : '';
      const relationType = typeof metadata['relationType'] === 'string' ? metadata['relationType'].trim().toLowerCase() : '';
      return isSlotLinkedToSelected(metadata, normalizedSelectedSlotId) && (role === 'mask' || relationType.startsWith('mask:'));
    })
    .map((slot): LinkedMaskSlotViewModel => {
      const metadata = asRecord(slot.metadata);
      const relationType = typeof metadata?.['relationType'] === 'string' ? metadata['relationType'] : '';
      const variant = typeof metadata?.['variant'] === 'string' ? metadata['variant'] : 'unknown';
      const generationMode = typeof metadata?.['generationMode'] === 'string' ? metadata['generationMode'] : 'n/a';
      const inverted = metadata?.['inverted'] === true;
      const rawFilepath = slot.imageFile?.url?.trim() || slot.imageUrl?.trim() || null;
      const imageSrc = rawFilepath !== null ? (resolveProductImageUrl(rawFilepath, productImagesExternalBaseUrl) ?? rawFilepath) : null;
      return {
        slotId: slot.id,
        name: slot.name?.trim() || slot.id,
        variant, inverted, relationType, generationMode, imageSrc,
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
      const aTs = a.updatedAt !== null ? new Date(a.updatedAt).getTime() : Number.NaN;
      const bTs = b.updatedAt !== null ? new Date(b.updatedAt).getTime() : Number.NaN;
      if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) return bTs - aTs;
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
  const { selectedSlot, inlinePreviewNaturalSize, inlinePreviewSource, inlinePreviewBase64Bytes, slotNameDraft } = args;
  const width = selectedSlot?.imageFile?.width ?? inlinePreviewNaturalSize?.width ?? null;
  const height = selectedSlot?.imageFile?.height ?? inlinePreviewNaturalSize?.height ?? null;
  const rawSource = inlinePreviewSource.rawSource;
  const name = slotNameDraft.trim() || selectedSlot?.name?.trim() || selectedSlot?.id || 'Source Card';
  return {
    key: `source:${selectedSlot?.id ?? 'draft'}`,
    source: 'source',
    name,
    sourceType: inlinePreviewSource.sourceType,
    slotId: selectedSlot?.id ?? null,
    order: null,
    imageSrc: inlinePreviewSource.src,
    imageFileId: selectedSlot?.imageFile?.id ?? selectedSlot?.imageFileId ?? null,
    filepath: (rawSource === '(inline base64)' || rawSource === 'n/a') ? null : rawSource,
    filename: selectedSlot?.imageFile?.filename ?? null,
    width: (typeof width === 'number' && Number.isFinite(width)) ? width : null,
    height: (typeof height === 'number' && Number.isFinite(height)) ? height : null,
    size: selectedSlot?.imageFile?.size ?? inlinePreviewBase64Bytes ?? null,
    updatedAt: selectedSlot?.imageFile?.updatedAt ?? null,
  };
};

const mapSavedLayerToViewModel = (
  layer: unknown,
  idx: number,
  slots: ImageStudioSlotRecord[],
  productImagesExternalBaseUrl: string
): CompositeTabImageViewModel | null => {
  const layerRecord = asRecord(layer);
  if (layerRecord === null) return null;
  const slotId = typeof layerRecord['slotId'] === 'string' ? layerRecord['slotId'].trim() : '';
  const layerSlot = slotId.length > 0 ? (slots.find((s) => s.id === slotId) ?? null) : null;
  const rawFilepath = layerSlot?.imageFile?.url?.trim() || layerSlot?.imageUrl?.trim() || null;
  const imageSrc = rawFilepath !== null ? (resolveProductImageUrl(rawFilepath, productImagesExternalBaseUrl) ?? rawFilepath) : null;
  const order = asFiniteNumber(layerRecord['order']) ?? idx;
  return {
    key: `saved:${slotId || `layer-${idx}`}:${order}`,
    source: 'input',
    name: layerSlot?.name?.trim() || `Layer ${idx + 1}`,
    sourceType: 'Saved Composite Layer',
    slotId: slotId.length > 0 ? slotId : null,
    order, imageSrc,
    imageFileId: layerSlot?.imageFile?.id ?? layerSlot?.imageFileId ?? null,
    filepath: rawFilepath,
    filename: layerSlot?.imageFile?.filename ?? null,
    width: layerSlot?.imageFile?.width ?? null,
    height: layerSlot?.imageFile?.height ?? null,
    size: layerSlot?.imageFile?.size ?? null,
    updatedAt: layerSlot?.imageFile?.updatedAt ?? null,
  };
};

export const mapSavedCompositeInputImages = (args: {
  selectedSlot: ImageStudioSlotRecord | null;
  slots: ImageStudioSlotRecord[];
  productImagesExternalBaseUrl: string;
}): CompositeTabImageViewModel[] => {
  const { selectedSlot, slots, productImagesExternalBaseUrl } = args;
  if (selectedSlot === null) return [];
  const metadata = asRecord(selectedSlot.metadata);
  const compositeConfig = asRecord(metadata?.['compositeConfig']);
  const rawLayers = Array.isArray(compositeConfig?.['layers']) ? (compositeConfig['layers'] as unknown[]) : [];
  return rawLayers
    .map((layer, idx) => mapSavedLayerToViewModel(layer, idx, slots, productImagesExternalBaseUrl))
    .filter((v): v is CompositeTabImageViewModel => v !== null)
    .sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
};

export const mapActiveCompositeInputImages = (
  slots: ImageStudioSlotRecord[],
  productImagesExternalBaseUrl: string
): CompositeTabImageViewModel[] =>
  slots.map((slot, idx): CompositeTabImageViewModel => {
    const rawFilepath = slot.imageFile?.url?.trim() || slot.imageUrl?.trim() || null;
    const imageSrc =
      rawFilepath !== null
        ? (resolveProductImageUrl(rawFilepath, productImagesExternalBaseUrl) ?? rawFilepath)
        : null;
    const metadata = asRecord(slot.metadata);
    const order = asFiniteNumber(metadata?.['compositeOrder']) ?? idx;
    return {
      key: `active:${slot.id}:${order}`,
      source: 'input',
      name: slot.name?.trim() || `Input ${idx + 1}`,
      sourceType: 'Active Composite Input',
      slotId: slot.id,
      order,
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

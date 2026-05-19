import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';
import { asRecord, asFiniteNumber } from './slot-inline-edit-utils';
import type {
  CompositeTabImageViewModel,
  InlinePreviewSourceViewModel,
  LinkedGeneratedRunRecord,
  LinkedGeneratedVariantViewModel,
  LinkedMaskSlotViewModel,
} from './slot-inline-edit-tab-types';

interface OutputMappingArgs {
  output: { id: string; filepath: string; filename?: string | null; size?: number | null; width?: number | null; height?: number | null };
  outputIndex: number;
  outputCount: number;
  run: LinkedGeneratedRunRecord;
  baseUrl: string;
}

function mapOutputToViewModel(args: OutputMappingArgs): LinkedGeneratedVariantViewModel | null {
  const { output, outputIndex, outputCount, run, baseUrl } = args;
  const path = output.filepath.trim();
  const id = output.id.trim();
  if (id.length === 0 || path.length === 0) return null;
  
  const size = (typeof output.size === 'number' && Number.isFinite(output.size)) ? output.size : 0;
  const width = (typeof output.width === 'number' && Number.isFinite(output.width)) ? output.width : null;
  const height = (typeof output.height === 'number' && Number.isFinite(output.height)) ? output.height : null;

  return {
    key: `${run.id}:${id}`,
    runId: run.id,
    runCreatedAt: run.createdAt,
    outputIndex: outputIndex + 1,
    outputCount,
    imageSrc: resolveProductImageUrl(path, baseUrl) ?? path,
    output: { id, filepath: path, filename: output.filename ?? '', size, width, height },
  };
}

export function mapLinkedGeneratedVariants(
  runs: LinkedGeneratedRunRecord[] | undefined,
  baseUrl: string
): LinkedGeneratedVariantViewModel[] {
  if (runs === undefined || !Array.isArray(runs)) return [];
  
  return runs.flatMap((run) => {
    const outputs = Array.isArray(run.outputs) ? run.outputs : [];
    return outputs
      .map((output, idx) => mapOutputToViewModel({ output, outputIndex: idx, outputCount: outputs.length, run, baseUrl }))
      .filter((v): v is LinkedGeneratedVariantViewModel => v !== null);
  });
}

function isSlotLinkedToSelected(metadata: Record<string, unknown>, selectedId: string): boolean {
  const sourceId = typeof metadata['sourceSlotId'] === 'string' ? metadata['sourceSlotId'].trim() : '';
  if (sourceId === selectedId) return true;

  const sourceIds = metadata['sourceSlotIds'];
  if (Array.isArray(sourceIds)) {
    return (sourceIds as unknown[]).some(v => typeof v === 'string' && v.trim() === selectedId);
  }
  return false;
}

function getTrimmedUrl(slot: ImageStudioSlotRecord): string | null {
  const fUrl = (slot.imageFile?.url ?? '').trim();
  if (fUrl.length > 0) return fUrl;
  const iUrl = (slot.imageUrl ?? '').trim();
  if (iUrl.length > 0) return iUrl;
  return null;
}

interface SlotBaseInfo {
  name: string;
  rawPath: string | null;
  imageSrc: string | null;
  imageFileId: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  updatedAt: string | null;
}

function getSlotBaseInfo(slot: ImageStudioSlotRecord, baseUrl: string): SlotBaseInfo {
  const rawPath = getTrimmedUrl(slot);
  const imageSrc = (rawPath !== null) ? (resolveProductImageUrl(rawPath, baseUrl) ?? rawPath) : null;
  const f = slot.imageFile ?? null;
  
  return {
    name: slot.name?.trim() || slot.id,
    rawPath, imageSrc,
    imageFileId: f?.id ?? slot.imageFileId ?? null,
    filename: f?.filename ?? null,
    width: f?.width ?? null,
    height: f?.height ?? null,
    size: f?.size ?? null,
    updatedAt: f?.updatedAt ?? null,
  };
}

export function mapLinkedMaskSlots(
  slots: ImageStudioSlotRecord[],
  selectedSlotId: string | null | undefined,
  baseUrl: string
): LinkedMaskSlotViewModel[] {
  const targetId = (selectedSlotId ?? '').trim();
  if (targetId.length === 0) return [];

  return slots
    .filter((slot) => {
      const meta = asRecord(slot.metadata);
      if (meta === null) return false;
      const role = typeof meta['role'] === 'string' ? meta['role'].trim().toLowerCase() : '';
      const relType = typeof meta['relationType'] === 'string' ? meta['relationType'].trim().toLowerCase() : '';
      return (role === 'mask' || relType.startsWith('mask:')) && isSlotLinkedToSelected(meta, targetId);
    })
    .map((slot): LinkedMaskSlotViewModel => {
      const meta = asRecord(slot.metadata) ?? {};
      const base = getSlotBaseInfo(slot, baseUrl);
      return {
        slotId: slot.id,
        name: base.name,
        variant: typeof meta['variant'] === 'string' ? meta['variant'] : 'unknown',
        inverted: meta['inverted'] === true,
        relationType: typeof meta['relationType'] === 'string' ? meta['relationType'] : '',
        generationMode: typeof meta['generationMode'] === 'string' ? meta['generationMode'] : 'n/a',
        imageSrc: base.imageSrc,
        imageFileId: base.imageFileId,
        filepath: base.rawPath,
        filename: base.filename,
        width: base.width,
        height: base.height,
        size: base.size,
        updatedAt: base.updatedAt,
      };
    })
    .sort((a, b) => {
      const aTs = (a.updatedAt !== null) ? new Date(a.updatedAt).getTime() : Number.NaN;
      const bTs = (b.updatedAt !== null) ? new Date(b.updatedAt).getTime() : Number.NaN;
      if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) return bTs - aTs;
      return a.name.localeCompare(b.name);
    });
}

export function mapSourceCompositeImage(args: {
  selectedSlot: ImageStudioSlotRecord | null;
  naturalSize: { width: number; height: number } | null;
  source: InlinePreviewSourceViewModel;
  base64Bytes: number | null;
  nameDraft: string;
}): CompositeTabImageViewModel {
  const { selectedSlot, naturalSize, source, base64Bytes, nameDraft } = args;
  const f = selectedSlot?.imageFile ?? null;
  const w = f?.width ?? naturalSize?.width ?? null;
  const h = f?.height ?? naturalSize?.height ?? null;
  const rawPath = (source.rawSource === '(inline base64)' || source.rawSource === 'n/a') ? null : source.rawSource;
  const name = nameDraft.trim() || selectedSlot?.name?.trim() || selectedSlot?.id || 'Source Card';
  
  return {
    key: `source:${selectedSlot?.id ?? 'draft'}`,
    source: 'source',
    name,
    sourceType: source.sourceType,
    slotId: selectedSlot?.id ?? null,
    order: null,
    imageSrc: source.src,
    imageFileId: f?.id ?? selectedSlot?.imageFileId ?? null,
    filepath: rawPath,
    filename: f?.filename ?? null,
    width: (typeof w === 'number' && Number.isFinite(w)) ? w : null,
    height: (typeof h === 'number' && Number.isFinite(h)) ? h : null,
    size: f?.size ?? base64Bytes ?? null,
    updatedAt: f?.updatedAt ?? null,
  };
}

function mapSavedLayerToViewModel(
  layer: unknown,
  idx: number,
  slots: ImageStudioSlotRecord[],
  baseUrl: string
): CompositeTabImageViewModel | null {
  const layerRec = asRecord(layer);
  if (layerRec === null) return null;
  const slotId = typeof layerRec['slotId'] === 'string' ? layerRec['slotId'].trim() : '';
  const layerSlot = slotId.length > 0 ? (slots.find((s) => s.id === slotId) ?? null) : null;
  const order = asFiniteNumber(layerRec['order']) ?? idx;
  
  if (layerSlot === null) {
    return {
      key: `saved:missing-${idx}:${order}`,
      source: 'input',
      name: `Layer ${idx + 1} (missing)`,
      sourceType: 'Saved Composite Layer',
      slotId: (slotId.length > 0) ? slotId : null,
      order, imageSrc: null, imageFileId: null, filepath: null, filename: null, width: null, height: null, size: null, updatedAt: null,
    };
  }

  const base = getSlotBaseInfo(layerSlot, baseUrl);
  return {
    key: `saved:${slotId || `layer-${idx}`}:${order}`,
    source: 'input',
    name: base.name,
    sourceType: 'Saved Composite Layer',
    slotId: (slotId.length > 0) ? slotId : null,
    order, imageSrc: base.imageSrc,
    imageFileId: base.imageFileId,
    filepath: base.rawPath,
    filename: base.filename,
    width: base.width,
    height: base.height,
    size: base.size,
    updatedAt: base.updatedAt,
  };
}

export function mapSavedCompositeInputImages(args: {
  selectedSlot: ImageStudioSlotRecord | null;
  slots: ImageStudioSlotRecord[];
  baseUrl: string;
}): CompositeTabImageViewModel[] {
  const { selectedSlot, slots, baseUrl } = args;
  if (selectedSlot === null) return [];
  const meta = asRecord(selectedSlot.metadata);
  const cConfig = asRecord(meta?.['compositeConfig']);
  const layers = Array.isArray(cConfig?.['layers']) ? (cConfig['layers'] as unknown[]) : [];
  
  return layers
    .map((layer, idx) => mapSavedLayerToViewModel(layer, idx, slots, baseUrl))
    .filter((v): v is CompositeTabImageViewModel => v !== null)
    .sort((a, b) => {
      const aO = a.order ?? Number.MAX_SAFE_INTEGER;
      const bO = b.order ?? Number.MAX_SAFE_INTEGER;
      if (aO !== bO) return aO - bO;
      return a.name.localeCompare(b.name);
    });
}

export function mapActiveCompositeInputImages(
  compositeAssets: ImageStudioSlotRecord[],
  baseUrl: string
): CompositeTabImageViewModel[] {
  return compositeAssets.map((slot, index): CompositeTabImageViewModel => {
    const base = getSlotBaseInfo(slot, baseUrl);
    return {
      key: `active:${slot.id}:${index}`,
      source: 'input',
      name: base.name,
      sourceType: 'Active Composite Input',
      slotId: slot.id,
      order: index,
      imageSrc: base.imageSrc,
      imageFileId: base.imageFileId,
      filepath: base.rawPath,
      filename: base.filename,
      width: base.width,
      height: base.height,
      size: base.size,
      updatedAt: base.updatedAt,
    };
  });
}

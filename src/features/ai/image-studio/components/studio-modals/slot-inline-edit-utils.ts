import { isImageStudioSlotImageLocked } from '@/features/ai/image-studio/utils/slot-image-lock';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';

import type {
  EnvironmentReferenceDraftViewModel,
  InlinePreviewSourceViewModel,
} from './slot-inline-edit-tab-types';

export const INLINE_CARD_IMAGE_SLOT_INDEX = 0;

export function applyEnvironmentReferenceAssetToDraft(
  file: ImageFileRecord
): EnvironmentReferenceDraftViewModel {
  const filename = (typeof file.filename === 'string' && file.filename.length > 0) ? file.filename : '';
  const updatedAt = (typeof file.updatedAt === 'string' && file.updatedAt.length > 0) ? file.updatedAt : new Date().toISOString();
  
  return {
    imageFileId: file.id,
    imageUrl: file.filepath,
    filename,
    mimetype: file.mimetype,
    size: file.size,
    width: file.width ?? null,
    height: file.height ?? null,
    updatedAt,
  };
}

export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

export const resolveSlotIdCandidates = (rawId: string): string[] => {
  const normalized = rawId.trim();
  if (normalized.length === 0) return [];

  const unprefixed = ((): string => {
    if (normalized.startsWith('slot:')) return normalized.slice('slot:'.length).trim();
    if (normalized.startsWith('card:')) return normalized.slice('card:'.length).trim();
    return normalized;
  })();

  const candidates = new Set<string>([normalized]);
  if (unprefixed.length > 0) {
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

const getTrimmedValue = (v: string | null | undefined): string => (v ?? '').trim();

export function slotHasRenderableImage(slot: ImageStudioSlotRecord | null | undefined): boolean {
  if (slot === null || slot === undefined) return false;
  
  if (getTrimmedValue(slot.imageFileId).length > 0) return true;
  if (getTrimmedValue(slot.imageFile?.url).length > 0) return true;
  if (getTrimmedValue(slot.imageUrl).length > 0) return true;
  if (getTrimmedValue(slot.imageBase64).length > 0) return true;
  
  return false;
}

export function isCardImageRemovalLocked(slot: ImageStudioSlotRecord | null | undefined): boolean {
  if (slotHasRenderableImage(slot)) return true;
  const s = slot ?? null;
  return isImageStudioSlotImageLocked(s);
}

const resolveEnvRefDraftField = (envRef: Record<string, unknown>, key: string): string => {
  const val = envRef[key];
  return typeof val === 'string' ? val.trim() : '';
};

export const readEnvironmentReferenceDraft = (
  slot: ImageStudioSlotRecord | null
): EnvironmentReferenceDraftViewModel => {
  const metadata = asRecord(slot?.metadata);
  const envRef = asRecord(metadata?.['environmentReference']);
  if (envRef === null) return { ...EMPTY_ENVIRONMENT_REFERENCE_DRAFT };

  const imageUrl = resolveEnvRefDraftField(envRef, 'imageUrl');
  const rawFileId = resolveEnvRefDraftField(envRef, 'imageFileId');
  const imageFileId = rawFileId.length > 0 ? rawFileId : null;
  
  const updatedAt = envRef['updatedAt'];

  return {
    imageFileId,
    imageUrl,
    filename: resolveEnvRefDraftField(envRef, 'filename'),
    mimetype: resolveEnvRefDraftField(envRef, 'mimetype'),
    size: asFiniteNumber(envRef['size']),
    width: asFiniteNumber(envRef['width']),
    height: asFiniteNumber(envRef['height']),
    updatedAt: typeof updatedAt === 'string' ? updatedAt : null,
  };
};

export const formatLinkedVariantTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export const formatBytes = (value: number | null): string => {
  if (value === null || !Number.isFinite(value) || value <= 0) return 'n/a';
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
  if (value === null || value === undefined) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'n/a';
  return parsed.toLocaleString();
};

export const estimateBase64Bytes = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const payload = trimmed.includes(',') ? trimmed.slice(trimmed.indexOf(',') + 1) : trimmed;
  const compact = payload.replace(/\s+/g, '');
  if (compact.length === 0) return null;
  const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
  const estimated = Math.floor((compact.length * 3) / 4) - padding;
  return estimated > 0 ? estimated : null;
};

export const extractDataUrlMimeType = (value: string): string | null => {
  const trimmed = value.trim();
  const match = trimmed.match(/^data:([^;,]+)[;,]/i);
  const mime = match?.[1];
  if (mime === undefined) return null;
  return mime;
};

export const resolveInlinePreviewMimeType = (
  fileMimeType: string | null | undefined,
  slotBase64Draft: string
): string => {
  const fromFile = fileMimeType?.trim() ?? '';
  if (fromFile.length > 0) return fromFile;
  
  const fromBase64 = extractDataUrlMimeType(slotBase64Draft);
  if (fromBase64 !== null && fromBase64.length > 0) return fromBase64;
  
  return 'n/a';
};

const resolveEffectiveDimension = (
  primary: number | null | undefined,
  fallback: number | null | undefined
): number | null => {
  if (typeof primary === 'number' && Number.isFinite(primary)) return primary;
  if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
  return null;
};

export function resolveDimensionLabel(
  primaryWidth: number | null | undefined,
  primaryHeight: number | null | undefined,
  fallbackWidth: number | null | undefined = null,
  fallbackHeight: number | null | undefined = null
): string {
  const width = resolveEffectiveDimension(primaryWidth, fallbackWidth);
  const height = resolveEffectiveDimension(primaryHeight, fallbackHeight);
  
  if (width !== null && height !== null) {
    return `${width} x ${height}`;
  }
  return 'n/a';
}

const resolvePreviewFromDraftBase64 = (base64: string): InlinePreviewSourceViewModel | null => {
  const normalized = base64.trim();
  if (normalized.length === 0) return null;
  return { src: normalized, sourceType: 'Draft Base64', rawSource: '(inline base64)', resolvedSource: '(inline base64)' };
};

const resolvePreviewFromUrl = (url: string | null | undefined, type: string, baseUrl: string): InlinePreviewSourceViewModel | null => {
  const normalized = (url ?? '').trim();
  if (normalized.length === 0) return null;
  const res = resolveProductImageUrl(normalized, baseUrl) ?? normalized;
  return { src: res, sourceType: type as any, rawSource: normalized, resolvedSource: res };
};

export function resolveInlinePreviewSource(
  slotBase64Draft: string,
  slotImageUrlDraft: string,
  selectedSlot: ImageStudioSlotRecord | null,
  productImagesExternalBaseUrl: string
): InlinePreviewSourceViewModel {
  const fromBase64 = resolvePreviewFromDraftBase64(slotBase64Draft);
  if (fromBase64 !== null) return fromBase64;

  const fromDraftUrl = resolvePreviewFromUrl(slotImageUrlDraft, 'Draft URL', productImagesExternalBaseUrl);
  if (fromDraftUrl !== null) return fromDraftUrl;

  const fromFile = resolvePreviewFromUrl(selectedSlot?.imageFile?.url, 'Attached File', productImagesExternalBaseUrl);
  if (fromFile !== null) return fromFile;

  const fromStored = resolvePreviewFromUrl(selectedSlot?.imageUrl, 'Stored URL', productImagesExternalBaseUrl);
  if (fromStored !== null) return fromStored;

  return { src: null, sourceType: 'None', rawSource: 'n/a', resolvedSource: 'n/a' };
}

export function resolveEnvironmentPreviewSource(
  envRef: EnvironmentReferenceDraftViewModel,
  baseUrl: string
): InlinePreviewSourceViewModel {
  const normalizedUrl = envRef.imageUrl.trim();
  if (normalizedUrl.length === 0) {
    return { src: null, sourceType: 'None', rawSource: 'n/a', resolvedSource: 'n/a' };
  }
  const res = resolveProductImageUrl(normalizedUrl, baseUrl) ?? normalizedUrl;
  const isFile = (envRef.imageFileId !== null && envRef.imageFileId.length > 0);
  return {
    src: res,
    sourceType: isFile ? 'Uploaded File' : 'Stored URL',
    rawSource: normalizedUrl,
    resolvedSource: res,
  };
}

export const resolveCompositeTabInputSourceLabel = (
  savedCount: number,
  activeCount: number
): string => {
  if (savedCount > 0) return 'Showing saved composite layers from this card.';
  if (activeCount > 0) return 'Showing active composite inputs selected in Studio.';
  return 'No composite input images found for this card.';
};

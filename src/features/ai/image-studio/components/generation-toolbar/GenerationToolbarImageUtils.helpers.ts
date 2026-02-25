import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import {
  type ImageContentFrame,
} from './GenerationToolbarImageUtils.types';

export const CENTER_LAYOUT_DEFAULT_PADDING_PERCENT = 8;
export const CENTER_LAYOUT_MIN_PADDING_PERCENT = 0;
export const CENTER_LAYOUT_MAX_PADDING_PERCENT = 40;
export const CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD = 16;
export const CENTER_LAYOUT_MIN_WHITE_THRESHOLD = 1;
export const CENTER_LAYOUT_MAX_WHITE_THRESHOLD = 80;
export const CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD = 10;
export const CENTER_LAYOUT_MIN_CHROMA_THRESHOLD = 0;
export const CENTER_LAYOUT_MAX_CHROMA_THRESHOLD = 80;
export const CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE = 1;
export const CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE = 32_768;

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const shapePointsAreUnitNormalized = (shape: {
  points: Array<{ x: number; y: number }>;
}): boolean =>
  shape.points.every((point) => (
    isFiniteNumber(point.x) &&
    isFiniteNumber(point.y) &&
    point.x >= 0 &&
    point.x <= 1 &&
    point.y >= 0 &&
    point.y <= 1
  ));

export const normalizeImageContentFrame = (
  frame: ImageContentFrame | null | undefined
): ImageContentFrame | null => {
  if (!frame) return null;
  if (
    !isFiniteNumber(frame.x) ||
    !isFiniteNumber(frame.y) ||
    !isFiniteNumber(frame.width) ||
    !isFiniteNumber(frame.height)
  ) {
    return null;
  }
  if (frame.width <= 0 || frame.height <= 0) return null;
  return frame;
};

const normalizeLocalImageSource = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  if (!normalized) return null;
  if (
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:') ||
    /^https?:\/\//i.test(normalized)
  ) {
    return normalized;
  }
  const normalizedPath = normalized.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalizedPath ? `/${normalizedPath}` : null;
};

export const resolveClientProcessingImageSrc = (
  slot: ImageStudioSlotRecord | null | undefined,
  fallbackSrc: string | null
): string | null => {
  const inlineBase64 = normalizeLocalImageSource(slot?.imageBase64 ?? null);
  if (inlineBase64) return inlineBase64;

  const localFilepath = normalizeLocalImageSource(slot?.imageFile?.filepath ?? null);
  if (localFilepath) return localFilepath;

  const localUrl = normalizeLocalImageSource(slot?.imageUrl ?? null);
  if (localUrl) return localUrl;

  return fallbackSrc;
};

export const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Image source is required.'));
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image element.'));
    image.src = src;
  });

export const dataUrlToUploadBlob = async (dataUrl: string): Promise<Blob> => {
  if (!dataUrl) throw new Error('Data URL is empty.');
  const response = await fetch(dataUrl);
  return await response.blob();
};

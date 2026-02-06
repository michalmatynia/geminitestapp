import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import { getDiskPathFromPublicPath } from '@/features/files/server';
import { callBaseApi } from '@/features/integrations/services/imports/base-client';
import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import type { ProductWithImages } from '@/features/products';

type ExportTemplateMapping = {
  sourceKey: string;  // Internal product field
  targetField: string;  // Base.com API parameter name
};

const IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.APP_URL ||
  process.env.NEXTAUTH_URL ||
  '';

const hasScheme = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(value);
export const resolveImageUrl = (
  value: string | null | undefined,
  baseUrl?: string | null
): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (hasScheme(trimmed)) return trimmed;
  const baseCandidate = baseUrl ?? IMAGE_BASE_URL;
  if (!baseCandidate) return trimmed;
  const base = baseCandidate.replace(/\/+$/, '');
  const path = trimmed.replace(/^\/+/, '');
  return `${base}/${path}`;
};

export type ImageExportDiagnostics = {
  log: (message: string, data?: Record<string, unknown>) => void;
};

export type ImageBase64Mode = 'base-only' | 'full-data-uri';

export type ImageTransformOptions = {
  forceJpeg?: boolean;
  maxDimension?: number;
  jpegQuality?: number;
};

export type ImageUrlDiagnostic = {
  sourceType: 'slot' | 'link';
  index: number;
  filepath: string | null;
  resolvedUrl: string | null;
  mimetype?: string | null;
  size?: number | null;
  supported: boolean;
  reason?: string | undefined;
  extension?: string | null;
  normalizedMime?: string | null;
};

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
]);

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.jpe',
  '.jfif',
  '.png',
  '.gif',
]);

const UNSUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.webp',
  '.avif',
  '.heic',
  '.heif',
  '.tif',
  '.tiff',
  '.bmp',
  '.svg',
]);

const normalizeMimeType = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const base = trimmed.split(';')[0]?.trim() ?? trimmed;
  if (base === 'image/jpeg' || base === 'image/jpg' || base === 'image/pjpeg') return 'image/jpeg';
  if (base === 'image/png' || base === 'image/x-png') return 'image/png';
  return base;
};

const getUrlExtension = (value: string): string => {
  const clean = value.split('#')[0]?.split('?')[0] ?? value;
  return path.extname(clean).toLowerCase();
};

const isSupportedImageMime = (value?: string | null): boolean => {
  const normalized = normalizeMimeType(value);
  if (!normalized) return false;
  return SUPPORTED_IMAGE_MIME_TYPES.has(normalized);
};

const inferMimeFromExtension = (extension?: string | null): string | null => {
  if (!extension) return null;
  if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    if (extension === '.png') return 'image/png';
    if (extension === '.gif') return 'image/gif';
    return 'image/jpeg';
  }
  if (extension === '.webp') return 'image/webp';
  if (extension === '.avif') return 'image/avif';
  if (extension === '.heic') return 'image/heic';
  if (extension === '.heif') return 'image/heif';
  if (extension === '.tif' || extension === '.tiff') return 'image/tiff';
  if (extension === '.bmp') return 'image/bmp';
  if (extension === '.svg') return 'image/svg+xml';
  return null;
};

const getImageSupportStatus = (url: string, mimetype?: string | null): {
  supported: boolean;
  reason?: string;
  normalizedMime: string | null;
  extension: string | null;
} => {
  const normalizedMime = normalizeMimeType(mimetype);
  if (normalizedMime) {
    return {
      supported: isSupportedImageMime(normalizedMime),
      ...(isSupportedImageMime(normalizedMime) ? {} : { reason: `unsupported_mimetype:${normalizedMime}` }),
      normalizedMime,
      extension: null,
    };
  }
  const extension = getUrlExtension(url);
  if (!extension) {
    return {
      supported: true,
      reason: 'unknown_extension',
      extension: null,
      normalizedMime: null,
    };
  }
  if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    return {
      supported: true,
      extension,
      normalizedMime: inferMimeFromExtension(extension),
    };
  }
  if (UNSUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    return {
      supported: false,
      reason: `unsupported_extension:${extension}`,
      extension,
      normalizedMime: inferMimeFromExtension(extension),
    };
  }
  return {
    supported: true,
    reason: 'unknown_extension',
    extension,
    normalizedMime: inferMimeFromExtension(extension),
  };
};

const shouldIncludeImageUrl = (
  url: string,
  options?: {
    mimetype?: string | null;
    diagnostics?: ImageExportDiagnostics | undefined;
    sourceType?: 'slot' | 'link' | 'mapped' | 'unknown';
    index?: number;
    source?: string | null;
  }
): boolean => {
  const status = getImageSupportStatus(url, options?.mimetype);
  if (status.supported) return true;
  options?.diagnostics?.log('Skipping unsupported image format', {
    url,
    source: options?.source ?? url,
    sourceType: options?.sourceType ?? 'unknown',
    index: options?.index,
    mimetype: options?.mimetype ?? null,
    reason: status.reason,
    extension: status.extension,
  });
  return false;
};

export const collectProductImageDiagnostics = (
  product: ProductWithImages,
  imageBaseUrl?: string | null
): ImageUrlDiagnostic[] => {
  const diagnostics: ImageUrlDiagnostic[] = [];

  const slotImages = product.images ?? [];
  slotImages.forEach((entry: { imageFile?: { filepath?: string | null; mimetype?: string | null; size?: number | null } | null }, index: number) => {
    const filepath = entry?.imageFile?.filepath ?? null;
    const resolvedUrl = resolveImageUrl(filepath, imageBaseUrl);
    if (!resolvedUrl) {
      diagnostics.push({
        sourceType: 'slot',
        index,
        filepath,
        resolvedUrl: null,
        mimetype: entry?.imageFile?.mimetype ?? null,
        size: entry?.imageFile?.size ?? null,
        supported: false,
        reason: 'missing_url',
      });
      return;
    }
    const status = getImageSupportStatus(resolvedUrl, entry?.imageFile?.mimetype);
    diagnostics.push({
      sourceType: 'slot',
      index,
      filepath,
      resolvedUrl,
      mimetype: entry?.imageFile?.mimetype ?? null,
      size: entry?.imageFile?.size ?? null,
      supported: status.supported,
      ...(status.reason ? { reason: status.reason } : {}),
      extension: status.extension,
      normalizedMime: status.normalizedMime,
    });
  });

  const linkImages = product.imageLinks ?? [];
  linkImages.forEach((link: string, index: number) => {
    const filepath = typeof link === 'string' ? link : null;
    const resolvedUrl = resolveImageUrl(filepath, imageBaseUrl);
    if (!resolvedUrl) {
      diagnostics.push({
        sourceType: 'link',
        index,
        filepath,
        resolvedUrl: null,
        supported: false,
        reason: 'missing_url',
      });
      return;
    }
    const status = getImageSupportStatus(resolvedUrl);
    diagnostics.push({
      sourceType: 'link',
      index,
      filepath,
      resolvedUrl,
      supported: status.supported,
      reason: status.reason,
      extension: status.extension,
      normalizedMime: status.normalizedMime,
    });
  });

  return diagnostics;
};

// Base.com API field names that accept image data
const IMAGE_TARGET_FIELDS = new Set([
  'images',
  'image',
  'image_urls',
]);

// Internal product field aliases that map to "images" for export
const IMAGE_EXPORT_ALIASES = new Set([
  'image_all',
  'images_all',
  'image_slots_all',
  'image_slots',
  'image_files',
  'image_links_all',
  'image_links',
]);

const normalizeExportTargetField = (targetField: string): string => {
  const trimmed = targetField.trim();
  const normalized = trimmed.toLowerCase();
  if (IMAGE_EXPORT_ALIASES.has(normalized)) {
    return 'images';
  }
  return trimmed;
};

const toStringValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (Array.isArray(value)) {
    const parts = value
      .map((entry: unknown) => toStringValue(entry))
      .filter((entry: string | null): entry is string => Boolean(entry));
    return parts.length ? parts.join(', ') : null;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
};

const toNumberValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const normalizeStockKey = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const typedMatch = trimmed.match(/([a-z]+)[_-]?(\d+)/i);
  if (typedMatch?.[1] && typedMatch?.[2]) {
    const prefix = typedMatch[1].toLowerCase();
    return `${prefix}_${typedMatch[2]}`;
  }
  const match = trimmed.match(/(\d+)/);
  if (match?.[1]) return match[1];
  return null;
};

const getImageSlotUrl = (
  product: ProductWithImages,
  index: number,
  mode: 'slot' | 'file' | 'link',
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportDiagnostics
): string | null => {
  if (index < 0) return null;
  if (mode !== 'link') {
    const slotEntry = product.images?.[index];
    const imageFile = slotEntry?.imageFile?.filepath;
    const resolved = resolveImageUrl(imageFile, imageBaseUrl);
    if (
      resolved &&
      shouldIncludeImageUrl(resolved, {
        mimetype: slotEntry?.imageFile?.mimetype ?? null,
        diagnostics,
        sourceType: 'slot',
        index,
        source: imageFile ?? resolved,
      })
    ) {
      return resolved;
    }
  }
  const link = product.imageLinks?.[index];
  const resolved = resolveImageUrl(
    typeof link === 'string' ? link : null,
    imageBaseUrl
  );
  if (
    resolved &&
    shouldIncludeImageUrl(resolved, {
      diagnostics,
      sourceType: 'link',
      index,
      source: typeof link === 'string' ? link : resolved,
    })
  )
    return resolved;
  return null;
};

const getImageList = (
  product: ProductWithImages,
  mode: 'slot' | 'file' | 'link',
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportDiagnostics
): string[] => {
  if (mode === 'link') {
    return (product.imageLinks ?? [])
      .map((link: string, index: number): string => {
        const resolved =
          resolveImageUrl(typeof link === 'string' ? link : null, imageBaseUrl) ?? '';
        if (
          resolved &&
          !shouldIncludeImageUrl(resolved, {
            diagnostics,
            sourceType: 'link',
            index,
            source: typeof link === 'string' ? link : resolved,
          })
        ) {
          return '';
        }
        return resolved;
      })
      .filter(Boolean);
  }
  const slots = (product.images ?? [])
    .map((entry: { imageFile?: { filepath?: string | null; mimetype?: string | null } | null }, index: number): string => {
      const resolved = resolveImageUrl(entry.imageFile?.filepath, imageBaseUrl) ?? '';
      if (
        resolved &&
        !shouldIncludeImageUrl(resolved, {
          mimetype: entry.imageFile?.mimetype ?? null,
          diagnostics,
          sourceType: 'slot',
          index,
          source: entry.imageFile?.filepath ?? resolved,
        })
      ) {
        return '';
      }
      return resolved;
    })
    .filter(Boolean);
  return slots;
};

const getAllImageUrls = (
  product: ProductWithImages,
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportDiagnostics
): string[] => {
  const slots = getImageList(product, 'slot', imageBaseUrl, diagnostics);
  const links = getImageList(product, 'link', imageBaseUrl, diagnostics);
  return Array.from(new Set([...slots, ...links]));
};

/**
 * Convert image file to base64 data URI for Base.com
 * Base.com expects format: "data:BASE64STRING" (without MIME type and "base64," prefix)
 */
const FORMAT_MIME_MAP: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

const imageToBase64DataUri = async (
  filepath: string,
  options?: {
    contentTypeHint?: string | null;
    diagnostics?: ImageExportDiagnostics | undefined;
    sourceType?: 'slot' | 'link' | 'mapped' | 'unknown';
    index?: number;
    outputMode?: ImageBase64Mode | undefined;
    transform?: ImageTransformOptions | null;
  }
): Promise<string | null> => {
  const diagnostics = options?.diagnostics;
  const sourceType = options?.sourceType ?? 'unknown';
  const index = options?.index;
  const outputMode: ImageBase64Mode = options?.outputMode ?? 'base-only';
  const transform = options?.transform ?? null;
  try {
    let buffer: Buffer;
    let originalBytes: number | null = null;
    let contentType = normalizeMimeType(options?.contentTypeHint);
    let metadataWidth: number | null = null;
    let metadataHeight: number | null = null;

    if (hasScheme(filepath)) {
      const response = await fetch(filepath);
      if (!response.ok) {
        diagnostics?.log('Failed to fetch external image', {
          url: filepath,
          sourceType,
          index,
          status: response.status,
        });
        return null;
      }
      const headerType = normalizeMimeType(response.headers.get('content-type'));
      if (headerType) {
        contentType = headerType;
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      originalBytes = buffer.length;
    } else {
      const diskPath = getDiskPathFromPublicPath(filepath);
      buffer = await fs.readFile(diskPath);
      originalBytes = buffer.length;
    }

    let format: string | null = null;
    try {
      const metadata = await sharp(buffer, { failOnError: false }).metadata();
      format = metadata.format ? metadata.format.toLowerCase() : null;
      metadataWidth = metadata.width ?? null;
      metadataHeight = metadata.height ?? null;
    } catch (error: unknown) {
      diagnostics?.log('Failed to read image metadata', {
        source: filepath,
        sourceType,
        index,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const extension = getUrlExtension(filepath);
    const formatMime = format ? FORMAT_MIME_MAP[format] ?? null : null;
    const inferredMime = contentType ?? inferMimeFromExtension(extension);

    let shouldConvert: boolean;
    if (formatMime) {
      shouldConvert = !isSupportedImageMime(formatMime);
    } else if (inferredMime) {
      shouldConvert = !isSupportedImageMime(inferredMime);
    } else {
      shouldConvert = Boolean(extension && UNSUPPORTED_IMAGE_EXTENSIONS.has(extension));
    }
    if (transform?.forceJpeg) {
      shouldConvert = true;
    }

    const maxDimension = transform?.maxDimension ?? null;
    const needsResize =
      Boolean(maxDimension) &&
      metadataWidth !== null &&
      metadataHeight !== null &&
      (metadataWidth > (maxDimension ?? 0) || metadataHeight > (maxDimension ?? 0));

    let outputBuffer = buffer;
    let outputFormat = formatMime ?? inferredMime;
    let converted = false;
    let resized = false;

    if (shouldConvert || needsResize) {
      try {
        let pipeline = sharp(buffer, { failOnError: false });
        if (needsResize && maxDimension) {
          pipeline = pipeline.resize({
            width: maxDimension,
            height: maxDimension,
            fit: 'inside',
            withoutEnlargement: true,
          });
          resized = true;
        }
        if (shouldConvert) {
          pipeline = pipeline.jpeg({ quality: transform?.jpegQuality ?? 85 });
          outputFormat = 'image/jpeg';
          converted = true;
        }
        outputBuffer = await pipeline.toBuffer();
        if (!shouldConvert) {
          outputFormat = formatMime ?? inferredMime;
        }
        diagnostics?.log('Converted image to supported format', {
          source: filepath,
          sourceType,
          index,
          originalFormat: formatMime ?? inferredMime ?? null,
          outputFormat,
          resized,
        });
      } catch (error: unknown) {
        diagnostics?.log('Failed to convert image to supported format', {
          source: filepath,
          sourceType,
          index,
          originalFormat: formatMime ?? inferredMime ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }

    const base64 = outputBuffer.toString('base64');
    diagnostics?.log('Prepared image for Base export', {
      source: filepath,
      sourceType,
      index,
      originalBytes,
      outputBytes: outputBuffer.length,
      base64Length: base64.length,
      contentType: contentType ?? null,
      outputFormat: outputFormat ?? null,
      converted,
      resized,
      outputMode,
    });

    if (outputMode === 'full-data-uri') {
      const mime = outputFormat ?? 'image/jpeg';
      return `data:${mime};base64,${base64}`;
    }
    return `data:${base64}`;
  } catch (error: unknown) {
    diagnostics?.log('Failed to convert image to base64', {
      source: filepath,
      sourceType,
      index,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Get product images as base64 data URIs
 */
export const getProductImagesAsBase64 = async (
  product: ProductWithImages,
  options?: {
    diagnostics?: ImageExportDiagnostics | undefined;
    outputMode?: ImageBase64Mode | undefined;
    transform?: ImageTransformOptions | null;
  }
): Promise<Record<string, string>> => {
  const images: Record<string, string> = {};
  const imageSlots = product.images || [];

  let index = 0;
  for (const [slotIndex, imageSlot] of imageSlots.entries()) {
    const filepath = imageSlot.imageFile?.filepath;
    if (!filepath) continue;

    const base64 = await imageToBase64DataUri(filepath, {
      contentTypeHint: imageSlot.imageFile?.mimetype ?? null,
      diagnostics: options?.diagnostics,
      sourceType: 'slot',
      index: slotIndex,
      ...(options?.outputMode ? { outputMode: options.outputMode } : {}),
      ...(options?.transform ? { transform: options.transform } : {}),
    });
    if (base64) {
      images[String(index)] = base64;
      index++;
    }
  }

  // Also process imageLinks if they exist and we don't have enough images
  const imageLinks = product.imageLinks || [];
  for (const [linkIndex, link] of imageLinks.entries()) {
    if (!link || !link.trim()) continue;

    // Skip if we already have this as an uploaded image
    const alreadyProcessed = imageSlots.some(
      (slot: { imageFile?: { filepath?: string | null } | null }) => slot.imageFile?.filepath === link
    );
    if (alreadyProcessed) continue;

    const base64 = await imageToBase64DataUri(link, {
      diagnostics: options?.diagnostics,
      sourceType: 'link',
      index: linkIndex,
      ...(options?.outputMode ? { outputMode: options.outputMode } : {}),
      ...(options?.transform ? { transform: options.transform } : {}),
    });
    if (base64) {
      images[String(index)] = base64;
      index++;
    }
  }

  return images;
};

/**
 * Get value from product using a dot-notation path or direct field access
 */
const getProductValue = (
  product: ProductWithImages,
  sourceKey: string,
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportDiagnostics
): unknown => {
  if (!sourceKey) return null;

  const normalized = sourceKey.trim().toLowerCase();
  const slotMatch = normalized.match(/^image_(slot|file|link)_(\d+)$/);
  if (slotMatch) {
    const index = Number.parseInt(slotMatch[2] ?? '', 10) - 1;
    if (Number.isNaN(index)) return null;
    const mode = slotMatch[1] as 'slot' | 'file' | 'link';
    return getImageSlotUrl(product, index, mode, imageBaseUrl, diagnostics);
  }
  const imageMatch = normalized.match(/^image_(\d+)$/);
  if (imageMatch) {
    const index = Number.parseInt(imageMatch[1] ?? '', 10) - 1;
    if (Number.isNaN(index)) return null;
    return getImageSlotUrl(product, index, 'slot', imageBaseUrl, diagnostics);
  }
  if (
    normalized === 'image_all' ||
    normalized === 'image_slots' ||
    normalized === 'image_files' ||
    normalized === 'image_slots_all'
  ) {
    return getImageList(product, 'slot', imageBaseUrl, diagnostics);
  }
  if (normalized === 'image_links' || normalized === 'image_links_all') {
    return getImageList(product, 'link', imageBaseUrl, diagnostics);
  }
  if (normalized === 'images_all') {
    return getAllImageUrls(product, imageBaseUrl, diagnostics);
  }
  // Handle dot notation for nested access
  if (sourceKey.includes('.')) {
    const pathParts = sourceKey.split('.').map((part: string) => part.trim());
    let current: unknown = product;
    for (const key of pathParts) {
      if (!current || typeof current !== 'object') return null;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  // Direct field access
  return (product as unknown as Record<string, unknown>)[sourceKey];
};

/**
 * Apply export template mappings to convert internal product fields to Base.com format
 */
function applyExportTemplateMappings(
  product: ProductWithImages,
  mappings: ExportTemplateMapping[],
  imageBaseUrl?: string | null,
  imageDiagnostics?: ImageExportDiagnostics
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const sourceKey = mapping.sourceKey.trim();
    const targetField = mapping.targetField.trim();

    if (!sourceKey || !targetField) continue;

    const rawValue = getProductValue(product, sourceKey, imageBaseUrl, imageDiagnostics);
    if (rawValue === null || rawValue === undefined) continue;

    const targetKey = targetField.toLowerCase();
    const isImageTarget = IMAGE_TARGET_FIELDS.has(targetKey);

    if (isImageTarget) {
      if (Array.isArray(rawValue)) {
        const urls = rawValue
          .map((entry: unknown) =>
            typeof entry === 'string' ? resolveImageUrl(entry, imageBaseUrl) ?? '' : ''
          )
          .filter(Boolean)
          .filter((url: string, index: number) =>
            shouldIncludeImageUrl(url, {
              diagnostics: imageDiagnostics,
              sourceType: 'mapped',
              index,
              source: url,
            })
          );
        if (urls.length > 0) {
          result[targetField] = urls;
        }
        continue;
      }
      if (typeof rawValue === 'string') {
        const resolved = resolveImageUrl(rawValue, imageBaseUrl);
        if (
          resolved &&
          shouldIncludeImageUrl(resolved, {
            diagnostics: imageDiagnostics,
            sourceType: 'mapped',
            index: 0,
            source: rawValue,
          })
        ) {
          result[targetField] = [resolved];
        }
      }
      continue;
    }

    // Try to convert to string first
    const stringValue = toStringValue(rawValue);
    if (stringValue) {
      result[targetField] = stringValue;
      continue;
    }

    // Try number conversion
    const numberValue = toNumberValue(rawValue);
    if (numberValue !== null) {
      result[targetField] = numberValue;
    }
  }

  return result;
}

const mergeTextFields = (
  baseData: BaseProductRecord,
  templateData: Record<string, unknown>
): void => {
  const nextTextFields: Record<string, string> = {};

  const pushValue = (key: string, value: unknown): void => {
    if (value === null || value === undefined) return;
    const stringValue = toStringValue(value);
    if (!stringValue) return;
    nextTextFields[key] = stringValue;
  };

  if (
    templateData.text_fields &&
    typeof templateData.text_fields === 'object' &&
    !Array.isArray(templateData.text_fields)
  ) {
    for (const [key, value] of Object.entries(
      templateData.text_fields as Record<string, unknown>
    )) {
      const trimmedKey = key.trim();
      if (!trimmedKey) continue;
      pushValue(trimmedKey, value);
    }
    delete templateData.text_fields;
  }

  for (const [key, value] of Object.entries(templateData)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    const lowered = trimmedKey.toLowerCase();
    if (lowered.startsWith('text_fields.')) {
      const fieldKey = trimmedKey.slice('text_fields.'.length);
      if (fieldKey) {
        pushValue(fieldKey, value);
      }
      delete templateData[key];
      continue;
    }
    if (lowered === 'name' || lowered === 'description') {
      pushValue(trimmedKey, value);
      delete templateData[key];
      continue;
    }
    if (lowered.startsWith('name|') || lowered.startsWith('description|')) {
      pushValue(trimmedKey, value);
      delete templateData[key];
    }
  }

  if (Object.keys(nextTextFields).length === 0) return;

  const baseTextFields =
    baseData.text_fields && typeof baseData.text_fields === 'object'
      ? (baseData.text_fields as Record<string, string>)
      : {};

  baseData.text_fields = {
    ...baseTextFields,
    ...nextTextFields,
  };
};

const mergeNumericFields = (
  templateData: Record<string, unknown>,
  fieldName: 'prices' | 'stock',
  normalizeKey?: (value: string) => string | null
): void => {
  const nextEntries: Record<string, number> = {};

  const existing = templateData[fieldName];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    for (const [key, value] of Object.entries(
      existing as Record<string, unknown>
    )) {
      const normalized = normalizeKey ? normalizeKey(key) : key.trim();
      if (!normalized) continue;
      const numeric = toNumberValue(value);
      if (numeric !== null) {
        nextEntries[normalized] = numeric;
      }
    }
  }

  for (const [key, value] of Object.entries(templateData)) {
    const trimmedKey = key.trim();
    const lowered = trimmedKey.toLowerCase();
    if (!lowered.startsWith(`${fieldName}.`)) continue;
    const suffix = trimmedKey.slice(fieldName.length + 1);
    if (!suffix) {
      delete templateData[key];
      continue;
    }
    const normalized = normalizeKey ? normalizeKey(suffix) : suffix.trim();
    if (!normalized) {
      delete templateData[key];
      continue;
    }
    const numeric = toNumberValue(value);
    if (numeric !== null) {
      nextEntries[normalized] = numeric;
    }
    delete templateData[key];
  }

  if (Object.keys(nextEntries).length > 0) {
    templateData[fieldName] = nextEntries;
  }
};

/**
 * Build Base.com product data from internal product
 * Applies default mapping + optional template mappings
 * Returns data in Baselinker API format
 */
export async function buildBaseProductData(
  product: ProductWithImages,
  mappings: ExportTemplateMapping[] = [],
  warehouseId?: string | null,
  options?: {
    imageBaseUrl?: string | null;
    includeStockWithoutWarehouse?: boolean;
    stockWarehouseAliases?: Record<string, string>;
    exportImagesAsBase64?: boolean | undefined;
    imageDiagnostics?: ImageExportDiagnostics | undefined;
    imageBase64Mode?: ImageBase64Mode | undefined;
    imageTransform?: ImageTransformOptions | null;
    imagesOnly?: boolean;
  }
): Promise<BaseProductRecord> {
  // Start with default field mappings in Baselinker API format
  const baseData: BaseProductRecord = {};

  // SKU is required
  if (product.sku) baseData.sku = product.sku;

  const imagesOnly = options?.imagesOnly ?? false;

  // EAN (optional)
  if (!imagesOnly && product.ean) baseData.ean = product.ean;

  // Weight (optional)
  if (!imagesOnly && product.weight !== null) baseData.weight = product.weight;

  // Text fields (name, description, etc.) go in text_fields object
  if (!imagesOnly) {
    const textFields: Record<string, string> = {};
    if (product.name_en) textFields.name = product.name_en;
    if (product.description_en) textFields.description = product.description_en;
    if (Object.keys(textFields).length > 0) {
      baseData.text_fields = textFields;
    }
  }

  // Prices need to be in format: { "price_group_id": price_value }
  // Using a default price group - this may need configuration
  if (!imagesOnly && product.price !== null) {
    baseData.prices = { '0': product.price };
  }

  // Stock needs to be in format: { "warehouse_id": quantity }
  if (!imagesOnly && product.stock !== null) {
    if (warehouseId) {
      baseData.stock = { [warehouseId]: product.stock };
    } else if (options?.includeStockWithoutWarehouse) {
      baseData.stock = product.stock;
    }
  }

  // Handle images - export as base64 data URIs if requested
  if (options?.exportImagesAsBase64) {
    const base64Images = await getProductImagesAsBase64(product, {
      diagnostics: options.imageDiagnostics,
      outputMode: options.imageBase64Mode,
      transform: options.imageTransform ?? null,
    });
    if (Object.keys(base64Images).length > 0) {
      baseData.images = base64Images;
    }
  } else {
    const urlImages = getAllImageUrls(
      product,
      options?.imageBaseUrl ?? null,
      options?.imageDiagnostics
    );
    if (urlImages.length > 0) {
      baseData.images = urlImages;
    }
  }

  // Apply template mappings (these override defaults)
  if (!imagesOnly && mappings.length > 0) {
    // Templates are saved as Base -> product mappings, so invert for export.
    const exportMappings = mappings.map((mapping: ExportTemplateMapping) => ({
      sourceKey: mapping.targetField,
      targetField: normalizeExportTargetField(mapping.sourceKey),
    }));
    const templateData = applyExportTemplateMappings(
      product,
      exportMappings,
      options?.imageBaseUrl ?? null,
      options?.imageDiagnostics
    );
    mergeTextFields(baseData, templateData);
    mergeNumericFields(templateData, 'prices');
    const stockAliases = options?.stockWarehouseAliases ?? null;
    const normalizeStockKeyWithAliases = (value: string): string | null => {
      const normalized = normalizeStockKey(value);
      if (!normalized) return null;
      return stockAliases?.[normalized] ?? normalized;
    };
    mergeNumericFields(templateData, 'stock', normalizeStockKeyWithAliases);
    const templateStock = templateData.stock;
    if (templateStock !== undefined) {
      const hasWarehouse = Boolean(warehouseId);
      const baseStock = baseData.stock ?? null;
      if (typeof templateStock === 'string' || typeof templateStock === 'number') {
        const numeric = Number(templateStock);
        if (hasWarehouse && Number.isFinite(numeric)) {
          templateData.stock = {
            ...((baseStock as Record<string, number>) ?? {}),
            [warehouseId as string]: numeric,
          };
        } else if (baseStock) {
          delete templateData.stock;
        }
      } else if (
        templateStock &&
        typeof templateStock === 'object' &&
        !Array.isArray(templateStock)
      ) {
        templateData.stock = {
          ...(templateStock as Record<string, unknown>),
          ...((baseStock as Record<string, number>) ?? {}),
        };
        if (stockAliases) {
          const nextStock = templateData.stock as Record<string, unknown>;
          for (const [key, value] of Object.entries(nextStock)) {
            const normalized = normalizeStockKey(key);
            if (!normalized) continue;
            const aliased = stockAliases[normalized];
            if (!aliased || aliased === key) continue;
            if (nextStock[aliased] === undefined) {
              nextStock[aliased] = value;
            }
            delete nextStock[key];
          }
        }
      } else if (baseStock) {
        delete templateData.stock;
      }
    }

    // If exporting images as base64, don't let template mappings override them
    if (options?.exportImagesAsBase64 && baseData.images) {
      delete templateData.images;
    }

    Object.assign(baseData, templateData);
  }

  return baseData;
}

/**
 * Export a product to Base.com inventory
 */
export async function exportProductToBase(
  token: string,
  inventoryId: string,
  product: ProductWithImages,
  mappings: ExportTemplateMapping[] = [],
  warehouseId?: string | null,
  options?: {
    imageBaseUrl?: string | null;
    includeStockWithoutWarehouse?: boolean;
    stockWarehouseAliases?: Record<string, string>;
    exportImagesAsBase64?: boolean | undefined;
    imageDiagnostics?: ImageExportDiagnostics | undefined;
    imageBase64Mode?: ImageBase64Mode | undefined;
    imageTransform?: ImageTransformOptions | null;
    imagesOnly?: boolean;
  }
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productData = await buildBaseProductData(product, mappings, warehouseId, options);

    // Build API parameters - inventory_id + all product fields as top-level params
    const apiParams: Record<string, unknown> = {
      inventory_id: inventoryId,
      ...productData,
    };

    const response = await callBaseApi(token, 'addInventoryProduct', apiParams);

    // Extract product ID from response
    // Baselinker API returns { status: "SUCCESS", product_id: "..." }
    const productIdValue = response.product_id;
    const productId = (typeof productIdValue === 'string' || typeof productIdValue === 'number')
      ? String(productIdValue)
      : null;

    return {
      success: true,
      ...(productId ? { productId } : {}),
    };
  } catch (error) {
    try {
      const { logSystemError } = await import('@/features/observability/server');
      await logSystemError({ 
        message: '[base-exporter] Export failed',
        error,
        source: 'base-exporter',
        context: { action: 'exportProductToBase', productId: product.id }
      });
    } catch (logError) {
      console.error('[base-exporter] Export failed (and logging failed)', error, logError);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function exportProductImagesToBase(
  token: string,
  inventoryId: string,
  product: ProductWithImages,
  externalProductId: string,
  options?: {
    imageBaseUrl?: string | null;
    exportImagesAsBase64?: boolean | undefined;
    imageDiagnostics?: ImageExportDiagnostics | undefined;
    imageBase64Mode?: ImageBase64Mode | undefined;
    imageTransform?: ImageTransformOptions | null;
  }
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productData = await buildBaseProductData(product, [], null, {
      imageBaseUrl: options?.imageBaseUrl ?? null,
      ...(options?.exportImagesAsBase64 !== undefined ? { exportImagesAsBase64: options.exportImagesAsBase64 } : {}),
      ...(options?.imageDiagnostics ? { imageDiagnostics: options.imageDiagnostics } : {}),
      ...(options?.imageBase64Mode ? { imageBase64Mode: options.imageBase64Mode } : {}),
      imageTransform: options?.imageTransform ?? null,
      imagesOnly: true,
    });

    const apiParams: Record<string, unknown> = {
      inventory_id: inventoryId,
      product_id: externalProductId,
      ...productData,
    };

    const response = await callBaseApi(token, 'updateInventoryProduct', apiParams);
    const productIdValue = response.product_id;
    const productId = (typeof productIdValue === 'string' || typeof productIdValue === 'number')
      ? String(productIdValue)
      : externalProductId;

    return {
      success: true,
      productId,
    };
  } catch (error) {
    try {
      const { logSystemError } = await import('@/features/observability/server');
      await logSystemError({ 
        message: '[base-exporter] Image-only export failed',
        error,
        source: 'base-exporter',
        context: { action: 'exportProductImagesToBase', productId: product.id, externalProductId }
      });
    } catch (logError) {
      console.error('[base-exporter] Image-only export failed (and logging failed)', error, logError);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

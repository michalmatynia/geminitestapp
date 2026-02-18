import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import { getDiskPathFromPublicPath } from '@/features/files/server';
import type { ProductWithImages } from '@/features/products';

const IMAGE_BASE_URL =
  process.env['NEXT_PUBLIC_APP_URL'] ||
  process.env['NEXT_PUBLIC_BASE_URL'] ||
  process.env['PUBLIC_BASE_URL'] ||
  process.env['APP_URL'] ||
  process.env['NEXTAUTH_URL'] ||
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

export type ImageExportLogger = {
  log: (message: string, data?: Record<string, unknown>) => void;
};

export type ImageBase64Mode = 'base-only' | 'full-data-uri';

export type ImageTransformOptions = {
  forceJpeg?: boolean;
  maxDimension?: number;
  jpegQuality?: number;
};

import type { ImageUrlDiagnosticDto as ImageUrlDiagnostic } from '@/shared/contracts/integrations';
export type { ImageUrlDiagnostic };

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

const BASE_IMAGE_MAX_BYTES = 1_900_000;
const BASE_IMAGE_CLAMP_DIMENSIONS = [1600, 1400, 1200, 1000, 900, 800, 700, 600];
const BASE_IMAGE_CLAMP_QUALITIES = [85, 75, 65, 55, 45];

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

export const shouldIncludeImageUrl = (
  url: string,
  options?: {
    mimetype?: string | null;
    diagnostics?: ImageExportLogger | undefined;
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

export const getImageSlotUrl = (
  product: ProductWithImages,
  index: number,
  mode: 'slot' | 'file' | 'link',
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportLogger
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

export const getImageList = (
  product: ProductWithImages,
  mode: 'slot' | 'file' | 'link',
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportLogger
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

export const getAllImageUrls = (
  product: ProductWithImages,
  imageBaseUrl?: string | null,
  diagnostics?: ImageExportLogger
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
    diagnostics?: ImageExportLogger | undefined;
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

    if (outputBuffer.length > BASE_IMAGE_MAX_BYTES) {
      const dimensionCandidates = Array.from(
        new Set(
          [
            maxDimension ?? null,
            ...(metadataWidth && metadataHeight
              ? [Math.min(Math.max(metadataWidth, metadataHeight), 1600)]
              : []),
            ...BASE_IMAGE_CLAMP_DIMENSIONS,
          ]
            .filter(
              (value): value is number =>
                typeof value === 'number' && Number.isFinite(value) && value > 0
            )
            .map((value: number) => Math.round(value))
        )
      );
      const qualityCandidates = Array.from(
        new Set(
          [
            transform?.jpegQuality ?? null,
            ...BASE_IMAGE_CLAMP_QUALITIES,
          ]
            .filter(
              (value): value is number =>
                typeof value === 'number' && Number.isFinite(value) && value > 0
            )
            .map((value: number) => Math.round(value))
        )
      );

      let bestBuffer = outputBuffer;
      let bestDimension: number | null = null;
      let bestQuality: number | null = null;
      let reachedLimit = false;

      outer: for (const dimension of dimensionCandidates) {
        for (const quality of qualityCandidates) {
          try {
            const candidate = await sharp(buffer, { failOnError: false })
              .resize({
                width: dimension,
                height: dimension,
                fit: 'inside',
                withoutEnlargement: true,
              })
              .jpeg({ quality, mozjpeg: true })
              .toBuffer();

            if (candidate.length < bestBuffer.length) {
              bestBuffer = candidate;
              bestDimension = dimension;
              bestQuality = quality;
            }

            if (candidate.length <= BASE_IMAGE_MAX_BYTES) {
              reachedLimit = true;
              break outer;
            }
          } catch (error: unknown) {
            diagnostics?.log('Image clamp candidate failed', {
              source: filepath,
              sourceType,
              index,
              dimension,
              quality,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      outputBuffer = bestBuffer;
      outputFormat = 'image/jpeg';
      converted = true;
      resized = resized || bestDimension !== null;

      diagnostics?.log('Applied image size clamp for Base export', {
        source: filepath,
        sourceType,
        index,
        targetMaxBytes: BASE_IMAGE_MAX_BYTES,
        outputBytes: outputBuffer.length,
        dimension: bestDimension,
        quality: bestQuality,
        reachedLimit,
      });
    }

    if (outputBuffer.length > BASE_IMAGE_MAX_BYTES) {
      diagnostics?.log('Skipping image: exceeds Base.com size limit after compression', {
        source: filepath,
        sourceType,
        index,
        outputBytes: outputBuffer.length,
        maxBytes: BASE_IMAGE_MAX_BYTES,
      });
      return null;
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
    diagnostics?: ImageExportLogger | undefined;
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
    if (!link?.trim()) continue;

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

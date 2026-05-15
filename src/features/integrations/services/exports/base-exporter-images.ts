import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import { type ImageExportLogger, type ImageBase64Mode, type ImageTransformOptions } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export type { ImageExportLogger, ImageBase64Mode, ImageTransformOptions };

const IMAGE_BASE_URL =
  process.env['NEXT_PUBLIC_APP_URL'] ??
  process.env['NEXT_PUBLIC_BASE_URL'] ??
  process.env['PUBLIC_BASE_URL'] ??
  process.env['APP_URL'] ??
  process.env['NEXTAUTH_URL'] ??
  '';

const hasScheme = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(value);
export const resolveImageUrl = (
  value: string | null | undefined,
  baseUrl?: string | null
): string | null => {
  if (value === null || value === undefined || value.trim().length === 0) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (hasScheme(trimmed)) return trimmed;
  const baseCandidate = baseUrl ?? IMAGE_BASE_URL;
  if (baseCandidate.length === 0) return trimmed;
  const base = baseCandidate.replace(/\/+$/, '');
  const resourcePath = trimmed.replace(/^\/+/, '');
  return `${base}/${resourcePath}`;
};

type ProductImageDiagnostic = {
  sourceType: 'slot' | 'link';
  index: number;
  filepath: string | null;
  resolvedUrl: string | null;
  mimetype?: string | null;
  size?: number | null;
  supported: boolean;
  reason?: string;
  extension?: string | null;
  normalizedMime?: string | null;
};

const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.gif']);

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
const BASE_IMAGE_MAX_INPUT_BYTES = 25_000_000;
const BASE_IMAGE_MAX_EXPORT_COUNT = 16;
const BASE_IMAGE_CLAMP_DIMENSIONS = [1600, 1400, 1200, 1000, 900, 800, 700, 600];
const BASE_IMAGE_CLAMP_QUALITIES = [85, 75, 65, 55, 45];

const MIME_TYPE_ALIASES = new Map<string, string>([
  ['image/jpeg', 'image/jpeg'],
  ['image/jpg', 'image/jpeg'],
  ['image/pjpeg', 'image/jpeg'],
  ['image/png', 'image/png'],
  ['image/x-png', 'image/png'],
]);

const normalizeMimeType = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const base = trimmed.split(';')[0]?.trim() ?? trimmed;
  return MIME_TYPE_ALIASES.get(base) ?? base;
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

const EXTENSION_MIME_TYPES = new Map<string, string>([
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.jpe', 'image/jpeg'],
  ['.jfif', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.heic', 'image/heic'],
  ['.heif', 'image/heif'],
  ['.tif', 'image/tiff'],
  ['.tiff', 'image/tiff'],
  ['.bmp', 'image/bmp'],
  ['.svg', 'image/svg+xml'],
]);

const inferMimeFromExtension = (extension?: string | null): string | null => {
  if (!extension) return null;
  return EXTENSION_MIME_TYPES.get(extension) ?? null;
};

const parseContentLength = (value: string | null): number | null => {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const logOversizedInput = (
  diagnostics: ImageExportLogger | undefined,
  input: {
    source: string;
    sourceType: 'slot' | 'link' | 'mapped' | 'unknown';
    index?: number;
    bytes: number;
    limit: number;
  }
): void => {
  diagnostics?.log('Skipping image: input exceeds Base export processing limit', {
    source: input.source,
    sourceType: input.sourceType,
    index: input.index,
    bytes: input.bytes,
    maxBytes: input.limit,
  });
};

const normalizeDataUriImage = (
  value: string,
  options: {
    diagnostics?: ImageExportLogger | undefined;
    sourceType: 'slot' | 'link' | 'mapped' | 'unknown';
    index?: number;
  }
): { buffer: Buffer; contentType: string | null } | null => {
  const commaIndex = value.indexOf(',');
  if (commaIndex < 0) return null;

  const header = value.slice(0, commaIndex);
  const payload = value.slice(commaIndex + 1);
  const isBase64 = /;base64(?:;|$)/i.test(header);
  const contentType = normalizeMimeType(header.slice('data:'.length).split(';')[0] ?? null);
  const estimatedBytes = isBase64
    ? Math.floor((payload.length * 3) / 4)
    : Buffer.byteLength(payload, 'utf8');
  if (estimatedBytes > BASE_IMAGE_MAX_INPUT_BYTES) {
    logOversizedInput(options.diagnostics, {
      source: 'data-uri',
      sourceType: options.sourceType,
      index: options.index,
      bytes: estimatedBytes,
      limit: BASE_IMAGE_MAX_INPUT_BYTES,
    });
    return null;
  }

  const buffer = isBase64
    ? Buffer.from(payload, 'base64')
    : Buffer.from(decodeURIComponent(payload), 'utf8');
  return { buffer, contentType };
};

const readExternalImageBuffer = async (
  url: string,
  response: Response,
  options: {
    diagnostics?: ImageExportLogger | undefined;
    sourceType: 'slot' | 'link' | 'mapped' | 'unknown';
    index?: number;
  }
): Promise<Buffer | null> => {
  const contentLength = parseContentLength(response.headers.get('content-length'));
  if (contentLength !== null && contentLength > BASE_IMAGE_MAX_INPUT_BYTES) {
    logOversizedInput(options.diagnostics, {
      source: url,
      sourceType: options.sourceType,
      index: options.index,
      bytes: contentLength,
      limit: BASE_IMAGE_MAX_INPUT_BYTES,
    });
    return null;
  }

  const responseBody = response.body as ReadableStream<Uint8Array> | null;
  if (responseBody === null) {
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > BASE_IMAGE_MAX_INPUT_BYTES) {
      logOversizedInput(options.diagnostics, {
        source: url,
        sourceType: options.sourceType,
        index: options.index,
        bytes: arrayBuffer.byteLength,
        limit: BASE_IMAGE_MAX_INPUT_BYTES,
      });
      return null;
    }
    return Buffer.from(arrayBuffer);
  }

  const reader = responseBody.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  const readNextChunk = async (): Promise<Buffer | null> => {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks, totalBytes);
    totalBytes += value.byteLength;
    if (totalBytes > BASE_IMAGE_MAX_INPUT_BYTES) {
      await reader.cancel().catch(() => undefined);
      logOversizedInput(options.diagnostics, {
        source: url,
        sourceType: options.sourceType,
        index: options.index,
        bytes: totalBytes,
        limit: BASE_IMAGE_MAX_INPUT_BYTES,
      });
      return null;
    }
    chunks.push(Buffer.from(value));
    return readNextChunk();
  };

  return readNextChunk();
};

const readLocalImageBuffer = async (
  filepath: string,
  options: {
    diagnostics?: ImageExportLogger | undefined;
    sourceType: 'slot' | 'link' | 'mapped' | 'unknown';
    index?: number;
  }
): Promise<Buffer | null> => {
  const diskPath = getDiskPathFromPublicPath(filepath);
  const stat = await fs.stat(diskPath);
  if (stat.size > BASE_IMAGE_MAX_INPUT_BYTES) {
    logOversizedInput(options.diagnostics, {
      source: filepath,
      sourceType: options.sourceType,
      index: options.index,
      bytes: stat.size,
      limit: BASE_IMAGE_MAX_INPUT_BYTES,
    });
    return null;
  }
  return fs.readFile(diskPath);
};

const getImageSupportStatus = (
  url: string,
  mimetype?: string | null
): {
  supported: boolean;
  reason?: string;
  normalizedMime: string | null;
  extension: string | null;
} => {
  const normalizedMime = normalizeMimeType(mimetype);
  if (normalizedMime) {
    return {
      supported: isSupportedImageMime(normalizedMime),
      ...(isSupportedImageMime(normalizedMime)
        ? {}
        : { reason: `unsupported_mimetype:${normalizedMime}` }),
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
): ProductImageDiagnostic[] => {
  const diagnostics: ProductImageDiagnostic[] = [];

  const slotImages = product.images ?? [];
  slotImages.forEach(
    (
      entry: {
        imageFile?: {
          filepath?: string | null;
          mimetype?: string | null;
          size?: number | null;
        } | null;
      },
      index: number
    ) => {
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
    }
  );

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
  const resolved = resolveImageUrl(typeof link === 'string' ? link : null, imageBaseUrl);
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
    .map(
      (
        entry: { imageFile?: { filepath?: string | null; mimetype?: string | null } | null },
        index: number
      ): string => {
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
      }
    )
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

    if (filepath.trim().toLowerCase().startsWith('data:')) {
      const dataUri = normalizeDataUriImage(filepath, {
        diagnostics,
        sourceType,
        index,
      });
      if (dataUri === null) return null;
      buffer = dataUri.buffer;
      contentType = dataUri.contentType ?? contentType;
      originalBytes = buffer.length;
    } else if (hasScheme(filepath)) {
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
      const fetchedBuffer = await readExternalImageBuffer(filepath, response, {
        diagnostics,
        sourceType,
        index,
      });
      if (fetchedBuffer === null) return null;
      buffer = fetchedBuffer;
      originalBytes = buffer.length;
    } else {
      const localBuffer = await readLocalImageBuffer(filepath, {
        diagnostics,
        sourceType,
        index,
      });
      if (localBuffer === null) return null;
      buffer = localBuffer;
      originalBytes = buffer.length;
    }

    let format: string | null = null;
    try {
      const metadata = await sharp(buffer, { failOnError: false }).metadata();
      format = metadata.format ? metadata.format.toLowerCase() : null;
      metadataWidth = metadata.width ?? null;
      metadataHeight = metadata.height ?? null;
    } catch (error: unknown) {
      void ErrorSystem.captureException(error);
      diagnostics?.log('Failed to read image metadata', {
        source: filepath,
        sourceType,
        index,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const extension = getUrlExtension(filepath);
    const formatMime = format ? (FORMAT_MIME_MAP[format] ?? null) : null;
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
        void ErrorSystem.captureException(error);
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
          [transform?.jpegQuality ?? null, ...BASE_IMAGE_CLAMP_QUALITIES]
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
            void ErrorSystem.captureException(error);
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
    void ErrorSystem.captureException(error);
    diagnostics?.log('Failed to convert image to base64', {
      source: filepath,
      sourceType,
      index,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

type BaseImageExportOptions = {
  diagnostics?: ImageExportLogger | undefined;
  outputMode?: ImageBase64Mode | undefined;
  transform?: ImageTransformOptions | null;
  concurrencyLimit?: number | undefined;
  signal?: AbortSignal | undefined;
  cachedImages?: Record<string, string> | undefined;
};

type BaseImageExportCandidate = {
  filepath: string;
  contentTypeHint: string | null;
  sourceType: 'slot' | 'link';
  index: number;
};

const isExportableImagePath = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const buildBaseImageExportCandidates = (product: ProductWithImages): BaseImageExportCandidate[] => {
  const slotCandidates = product.images.flatMap<BaseImageExportCandidate>(
    (imageSlot, slotIndex) => {
      const filepath = imageSlot.imageFile.filepath;
      if (!isExportableImagePath(filepath)) return [];
      return [
        {
          filepath,
          contentTypeHint: imageSlot.imageFile.mimetype,
          sourceType: 'slot',
          index: slotIndex,
        },
      ];
    }
  );
  const processedSlotPaths = new Set(slotCandidates.map((candidate) => candidate.filepath));
  const linkCandidates = (product.imageLinks ?? []).flatMap<BaseImageExportCandidate>(
    (link, linkIndex) => {
      if (!isExportableImagePath(link) || processedSlotPaths.has(link)) return [];
      return [{ filepath: link, contentTypeHint: null, sourceType: 'link', index: linkIndex }];
    }
  );
  return [...slotCandidates, ...linkCandidates];
};

const createBaseImageConversionOptions = (
  candidate: BaseImageExportCandidate,
  options: BaseImageExportOptions | undefined
): NonNullable<Parameters<typeof imageToBase64DataUri>[1]> => {
  const imageOptions: NonNullable<Parameters<typeof imageToBase64DataUri>[1]> = {
    contentTypeHint: candidate.contentTypeHint,
    diagnostics: options?.diagnostics,
    sourceType: candidate.sourceType,
    index: candidate.index,
  };
  if (options?.outputMode !== undefined) imageOptions.outputMode = options.outputMode;
  if (options?.transform !== undefined && options.transform !== null) {
    imageOptions.transform = options.transform;
  }
  return imageOptions;
};

const convertBaseImageExportCandidate = async (
  candidate: BaseImageExportCandidate,
  options: BaseImageExportOptions | undefined
): Promise<string | null> => {
  if (options?.signal?.aborted === true) {
    throw new Error('Image processing aborted');
  }
  return imageToBase64DataUri(
    candidate.filepath,
    createBaseImageConversionOptions(candidate, options)
  );
};

/**
 * Get product images as base64 data URIs
 */
export const getProductImagesAsBase64 = async (
  product: ProductWithImages,
  options?: BaseImageExportOptions
): Promise<Record<string, string>> => {
  if (options?.cachedImages !== undefined) {
    return options.cachedImages;
  }

  const images: Record<string, string> = {};
  const candidates = buildBaseImageExportCandidates(product);
  await candidates.reduce<Promise<void>>(
    (previous, candidate) =>
      previous.then(async () => {
        if (Object.keys(images).length >= BASE_IMAGE_MAX_EXPORT_COUNT) return;
        const base64 = await convertBaseImageExportCandidate(candidate, options);
        if (base64 === null || base64.length === 0) return;
        images[String(Object.keys(images).length)] = base64;
      }),
    Promise.resolve()
  );
  return images;
};

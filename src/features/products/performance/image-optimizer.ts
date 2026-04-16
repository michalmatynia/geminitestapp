import sharp from 'sharp';

import type {
  ImageFormat,
  ImageSize,
  ImageSizeConfig,
  OptimizationOptions,
  OptimizedImageResult,
} from '@/shared/contracts/files';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type { ImageFormat, ImageSize, ImageSizeConfig, OptimizationOptions, OptimizedImageResult };

const DEFAULT_IMAGE_SIZES: Record<ImageSize, ImageSizeConfig> = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  small: { width: 300, quality: 85 },
  medium: { width: 600, quality: 90 },
  large: { width: 1200, quality: 95 },
  original: { width: 2000, quality: 100 },
};

const DEFAULT_OPTIONS: OptimizationOptions = {
  formats: ['webp', 'jpeg'],
  sizes: DEFAULT_IMAGE_SIZES,
  quality: 85,
  progressive: true,
};

type CacheEntry = {
  result: OptimizedImageResult[];
  insertedAt: number;
};

type ResolvedOptimizationOptions = {
  formats: ImageFormat[];
  sizes: Record<ImageSize, ImageSizeConfig>;
  quality: number;
  progressive: boolean;
  fit: NonNullable<OptimizationOptions['fit']>;
  withoutEnlargement: boolean;
};

const DEFAULT_FIT: NonNullable<OptimizationOptions['fit']> = 'inside';

function resolveFormats(options: OptimizationOptions): ImageFormat[] {
  return options.formats ?? DEFAULT_OPTIONS.formats ?? [];
}

function resolveSizes(options: OptimizationOptions): Record<ImageSize, ImageSizeConfig> {
  return { ...DEFAULT_IMAGE_SIZES, ...(options.sizes ?? {}) };
}

function resolveQuality(options: OptimizationOptions): number {
  return options.quality ?? DEFAULT_OPTIONS.quality ?? 85;
}

function resolveProgressive(options: OptimizationOptions): boolean {
  return options.progressive ?? DEFAULT_OPTIONS.progressive ?? true;
}

function resolveOptimizationOptions(options: OptimizationOptions): ResolvedOptimizationOptions {
  return {
    formats: resolveFormats(options),
    sizes: resolveSizes(options),
    quality: resolveQuality(options),
    progressive: resolveProgressive(options),
    fit: options.fit ?? DEFAULT_FIT,
    withoutEnlargement: options.withoutEnlargement ?? true,
  };
}

export class ImageOptimizer {
  private cache: Map<string, CacheEntry> = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor({
    maxEntries = 50,
    ttlMs = 5 * 60 * 1000,
  }: { maxEntries?: number; ttlMs?: number } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  private evict(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.insertedAt >= this.ttlMs) {
        this.cache.delete(key);
      }
    }
    // Evict oldest entries (Map preserves insertion order) if still over limit
    while (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey === undefined) break;
      this.cache.delete(oldestKey);
    }
  }

  private getCacheKey(buffer: Buffer, options: OptimizationOptions): string {
    const hash = buffer.toString('base64').slice(0, 32);
    const optionsHash = JSON.stringify(options).slice(0, 32);
    return `${hash}:${optionsHash}`;
  }

  private getCachedResult(cacheKey: string): OptimizedImageResult[] | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.insertedAt < this.ttlMs) {
      return cached.result;
    }

    this.cache.delete(cacheKey);
    return null;
  }

  private createProcessor(
    image: sharp.Sharp,
    metadataWidth: number,
    sizeConfig: ImageSizeConfig,
    options: ResolvedOptimizationOptions
  ): sharp.Sharp {
    let processor = image.clone();

    if (sizeConfig.width < metadataWidth) {
      processor = processor.resize(sizeConfig.width, sizeConfig.height, {
        fit: options.fit,
        withoutEnlargement: options.withoutEnlargement,
      });
    }

    return processor;
  }

  private applyFormat(
    processor: sharp.Sharp,
    format: ImageFormat,
    quality: number,
    progressive: boolean
  ): sharp.Sharp {
    switch (format) {
      case 'webp':
        return processor.webp({ quality });
      case 'avif':
        return processor.avif({ quality });
      case 'jpeg':
        return processor.jpeg({ quality, progressive });
      case 'png':
        return processor.png({ quality, progressive });
      default:
        return processor;
    }
  }

  private logOptimizationFailure(error: unknown, format: ImageFormat, size: ImageSize): void {
    logClientError(error);
    ErrorSystem.logWarning(`Failed to optimize image for ${format}/${size}`, {
      service: 'image-optimizer',
      format,
      sizeName: size,
      error,
    }).catch(() => undefined);
  }

  private async buildOptimizedResult(
    image: sharp.Sharp,
    metadataWidth: number,
    target: { format: ImageFormat; size: ImageSize; sizeConfig: ImageSizeConfig },
    options: ResolvedOptimizationOptions
  ): Promise<OptimizedImageResult | null> {
    try {
      const { format, size, sizeConfig } = target;
      const quality = sizeConfig.quality ?? options.quality;
      const processor = this.applyFormat(
        this.createProcessor(image, metadataWidth, sizeConfig, options),
        format,
        quality,
        options.progressive
      );
      const buffer = await processor.toBuffer();
      const info = await sharp(buffer).metadata();

      return {
        format,
        size,
        buffer,
        width: info.width,
        height: info.height,
        fileSize: buffer.length,
      };
    } catch (error) {
      this.logOptimizationFailure(error, target.format, target.size);
      return null;
    }
  }

  async optimize(
    input: Buffer | string,
    options: OptimizationOptions = {}
  ): Promise<OptimizedImageResult[]> {
    const resolvedOptions = resolveOptimizationOptions(options);
    const inputBuffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input;
    const cacheKey = this.getCacheKey(inputBuffer, resolvedOptions);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    const metadataWidth = metadata.width;
    const optimizationTasks = resolvedOptions.formats.flatMap((format: ImageFormat) =>
      Object.entries(resolvedOptions.sizes).map(async ([sizeName, sizeConfig]) =>
        this.buildOptimizedResult(
          image,
          metadataWidth,
          {
            format,
            size: sizeName as ImageSize,
            sizeConfig,
          },
          resolvedOptions
        )
      )
    );
    const results = (await Promise.all(optimizationTasks)).filter(
      (result: OptimizedImageResult | null): result is OptimizedImageResult => result !== null
    );

    this.evict();
    this.cache.set(cacheKey, { result: results, insertedAt: Date.now() });
    return results;
  }

  async optimizeBase64(
    base64: string,
    options?: OptimizationOptions
  ): Promise<OptimizedImageResult[]> {
    const buffer = Buffer.from(base64.replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
    return this.optimize(buffer, options);
  }

  generateSrcSet(images: OptimizedImageResult[], format: ImageFormat): string {
    return images
      .filter((img: OptimizedImageResult) => img.format === format)
      .sort((a: OptimizedImageResult, b: OptimizedImageResult) => a.width - b.width)
      .map((img: OptimizedImageResult) => `${img.url} ${img.width}w`)
      .join(', ');
  }

  getBestFormat(userAgent?: string): ImageFormat {
    const normalizedUserAgent = userAgent?.trim();
    if (normalizedUserAgent === undefined || normalizedUserAgent.length === 0) return 'webp';

    if (normalizedUserAgent.includes('Chrome') && !normalizedUserAgent.includes('Edge')) {
      return 'avif';
    }
    if (normalizedUserAgent.includes('Firefox') || normalizedUserAgent.includes('Chrome')) {
      return 'webp';
    }
    return 'jpeg';
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { entries: number; maxEntries: number; ttlMs: number } {
    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
    };
  }
}

// Global instances
export const imageOptimizer: ImageOptimizer = new ImageOptimizer();

import sharp from 'sharp';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type ImageFormat = 'webp' | 'avif' | 'jpeg' | 'png';
export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

const DEFAULT_IMAGE_SIZES: Record<
  ImageSize,
  { width: number; height?: number; quality?: number }
> = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  small: { width: 300, quality: 85 },
  medium: { width: 600, quality: 90 },
  large: { width: 1200, quality: 95 },
  original: { width: 2000, quality: 100 },
};

export type OptimizationOptions = {
  formats?: ImageFormat[];
  sizes?: Partial<Record<ImageSize, { width: number; height?: number; quality?: number }>>;
  quality?: number;
  progressive?: boolean;
};

export type OptimizedImageResult = {
  format: ImageFormat;
  size: ImageSize;
  buffer: Buffer;
  width: number;
  height: number;
  fileSize: number;
  url?: string;
};

const DEFAULT_OPTIONS: OptimizationOptions = {
  formats: ['webp', 'jpeg'],
  sizes: DEFAULT_IMAGE_SIZES,
  quality: 85,
  progressive: true
};

export class ImageOptimizer {
  private cache: Map<string, OptimizedImageResult[]> = new Map<string, OptimizedImageResult[]>();

  private getCacheKey(buffer: Buffer, options: OptimizationOptions): string {
    const hash = buffer.toString('base64').slice(0, 32);
    const optionsHash = JSON.stringify(options).slice(0, 32);
    return `${hash}:${optionsHash}`;
  }

  async optimize(
    input: Buffer | string,
    options: OptimizationOptions = {}
  ): Promise<OptimizedImageResult[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const inputBuffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input;
    
    const cacheKey = this.getCacheKey(inputBuffer, opts);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const results: OptimizedImageResult[] = [];
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    for (const format of opts.formats!) {
      for (const [sizeName, sizeConfig] of Object.entries(opts.sizes!)) {
        try {
          let processor = image.clone();

          // Resize if needed
          if (sizeConfig.width < (metadata.width || 0)) {
            processor = processor.resize(sizeConfig.width, sizeConfig.height, {
              fit: 'inside',
              withoutEnlargement: true
            });
          }

          // Apply format-specific optimizations
          const quality = sizeConfig.quality || opts.quality!;
          
          switch (format) {
            case 'webp':
              processor = processor.webp({ quality });
              break;
            case 'avif':
              processor = processor.avif({ quality });
              break;
            case 'jpeg':
              processor = processor.jpeg({ quality, progressive: opts.progressive });
              break;
            case 'png':
              processor = processor.png({ quality, progressive: opts.progressive });
              break;
          }

          const buffer = await processor.toBuffer();
          const info = await sharp(buffer).metadata();

          results.push({
            format,
            size: sizeName as ImageSize,
            buffer,
            width: info.width || 0,
            height: info.height || 0,
            fileSize: buffer.length
          });

        } catch (error) {
          void ErrorSystem.logWarning(`Failed to optimize image for ${format}/${sizeName}`, {
            service: 'image-optimizer',
            format,
            sizeName,
            error
          });
        }
      }
    }

    this.cache.set(cacheKey, results);
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
    if (!userAgent) return 'webp';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'avif';
    if (userAgent.includes('Firefox') || userAgent.includes('Chrome')) return 'webp';
    return 'jpeg';
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { entries: number; memory: number } {
    return {
      entries: this.cache.size,
      memory: JSON.stringify([...this.cache.entries()]).length
    };
  }
}

// Global instances
export const imageOptimizer: ImageOptimizer = new ImageOptimizer();

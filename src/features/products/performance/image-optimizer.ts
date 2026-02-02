import sharp from 'sharp';

export type ImageFormat = 'webp' | 'avif' | 'jpeg' | 'png';
export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

export type OptimizationOptions = {
  formats?: ImageFormat[];
  sizes?: Record<ImageSize, { width: number; height?: number; quality?: number }>;
  quality?: number;
  progressive?: boolean;
};

export type OptimizedImage = {
  format: ImageFormat;
  size: ImageSize;
  buffer: Buffer;
  width: number;
  height: number;
  fileSize: number;
  url?: string;
};

const DEFAULT_SIZES: Record<ImageSize, { width: number; height?: number; quality?: number }> = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  small: { width: 300, quality: 85 },
  medium: { width: 600, quality: 90 },
  large: { width: 1200, quality: 95 },
  original: { width: 2000, quality: 100 }
};

const DEFAULT_OPTIONS: OptimizationOptions = {
  formats: ['webp', 'jpeg'],
  sizes: DEFAULT_SIZES,
  quality: 85,
  progressive: true
};

export class ImageOptimizer {
  private cache = new Map<string, OptimizedImage[]>();

  private getCacheKey(buffer: Buffer, options: OptimizationOptions): string {
    const hash = buffer.toString('base64').slice(0, 32);
    const optionsHash = JSON.stringify(options).slice(0, 32);
    return `${hash}:${optionsHash}`;
  }

  async optimize(
    input: Buffer | string,
    options: OptimizationOptions = {}
  ): Promise<OptimizedImage[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const inputBuffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input;
    
    const cacheKey = this.getCacheKey(inputBuffer, opts);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const results: OptimizedImage[] = [];
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
              processor = processor.webp({ quality, progressive: opts.progressive });
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
            width: info.width!,
            height: info.height!,
            fileSize: buffer.length
          });

        } catch (error) {
          console.warn(`Failed to optimize image for ${format}/${sizeName}:`, error);
        }
      }
    }

    this.cache.set(cacheKey, results);
    return results;
  }

  async optimizeBase64(
    base64: string,
    options?: OptimizationOptions
  ): Promise<OptimizedImage[]> {
    const buffer = Buffer.from(base64.replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
    return this.optimize(buffer, options);
  }

  generateSrcSet(images: OptimizedImage[], format: ImageFormat): string {
    return images
      .filter(img => img.format === format)
      .sort((a, b) => a.width - b.width)
      .map(img => `${img.url} ${img.width}w`)
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

  getCacheStats() {
    return {
      entries: this.cache.size,
      memory: JSON.stringify([...this.cache.entries()]).length
    };
  }
}

// Image URL generator for different CDN patterns
export class ImageUrlGenerator {
  constructor(
    private baseUrl: string,
    private pattern: 'cloudinary' | 'imagekit' | 'custom' = 'custom'
  ) {}

  generate(
    imageId: string,
    size: ImageSize,
    format: ImageFormat,
    options?: { quality?: number }
  ): string {
    const sizeConfig = DEFAULT_SIZES[size];
    
    switch (this.pattern) {
      case 'cloudinary':
        return `${this.baseUrl}/image/upload/w_${sizeConfig.width},q_${options?.quality || sizeConfig.quality},f_${format}/${imageId}`;
      
      case 'imagekit':
        return `${this.baseUrl}/${imageId}?tr=w-${sizeConfig.width},q-${options?.quality || sizeConfig.quality},f-${format}`;
      
      default:
        return `${this.baseUrl}/${imageId}/${size}.${format}`;
    }
  }

  generateResponsive(imageId: string, format: ImageFormat): {
    src: string;
    srcSet: string;
    sizes: string;
  } {
    const sizes = Object.keys(DEFAULT_SIZES) as ImageSize[];
    const srcSet = sizes
      .map(size => `${this.generate(imageId, size, format)} ${DEFAULT_SIZES[size].width}w`)
      .join(', ');

    return {
      src: this.generate(imageId, 'medium', format),
      srcSet,
      sizes: '(max-width: 300px) 300px, (max-width: 600px) 600px, (max-width: 1200px) 1200px, 2000px'
    };
  }
}

// Global instances
export const imageOptimizer = new ImageOptimizer();
export const imageUrlGenerator = new ImageUrlGenerator(
  process.env.IMAGE_CDN_URL || '/api/images',
  (process.env.IMAGE_CDN_PROVIDER as any) || 'custom'
);
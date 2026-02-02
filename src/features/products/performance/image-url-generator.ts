export type ImageFormat = "webp" | "avif" | "jpeg" | "png";
export type ImageSize = "thumbnail" | "small" | "medium" | "large" | "original";

export const DEFAULT_IMAGE_SIZES: Record<
  ImageSize,
  { width: number; height?: number; quality?: number }
> = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  small: { width: 300, quality: 85 },
  medium: { width: 600, quality: 90 },
  large: { width: 1200, quality: 95 },
  original: { width: 2000, quality: 100 },
};

type CdnProvider = "cloudinary" | "imagekit" | "custom";

export class ImageUrlGenerator {
  constructor(
    private readonly baseUrl: string,
    private readonly pattern: CdnProvider = "custom",
  ) {}

  generate(
    imageId: string,
    size: ImageSize,
    format: ImageFormat,
    options?: { quality?: number },
  ): string {
    const sizeConfig = DEFAULT_IMAGE_SIZES[size];

    switch (this.pattern) {
      case "cloudinary":
        return `${this.baseUrl}/image/upload/w_${sizeConfig.width},q_${options?.quality || sizeConfig.quality},f_${format}/${imageId}`;
      case "imagekit":
        return `${this.baseUrl}/${imageId}?tr=w-${sizeConfig.width},q-${options?.quality || sizeConfig.quality},f-${format}`;
      default:
        return `${this.baseUrl}/${imageId}/${size}.${format}`;
    }
  }

  generateResponsive(
    imageId: string,
    format: ImageFormat,
  ): { src: string; srcSet: string; sizes: string } {
    const sizes: ImageSize[] = Object.keys(DEFAULT_IMAGE_SIZES) as ImageSize[];
    const srcSet = sizes
      .map(
        (size: ImageSize) =>
          `${this.generate(imageId, size, format)} ${DEFAULT_IMAGE_SIZES[size].width}w`,
      )
      .join(", ");

    return {
      src: this.generate(imageId, "medium", format),
      srcSet,
      sizes:
        "(max-width: 300px) 300px, (max-width: 600px) 600px, (max-width: 1200px) 1200px, 2000px",
    };
  }
}

const cdnProvider = (process.env.NEXT_PUBLIC_IMAGE_CDN_PROVIDER ||
  process.env.IMAGE_CDN_PROVIDER ||
  "custom") as CdnProvider;

const cdnUrl =
  process.env.NEXT_PUBLIC_IMAGE_CDN_URL ||
  process.env.IMAGE_CDN_URL ||
  "/api/images";

export const imageUrlGenerator = new ImageUrlGenerator(cdnUrl, cdnProvider);


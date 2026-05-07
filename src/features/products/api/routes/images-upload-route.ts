import 'server-only';
// Server route: handles product image uploads. Runs image optimization
// (multiple sizes / formats) and returns metadata for each uploaded image.
// Uses withFileUploadSecurity middleware to validate and rate-limit uploads.

import { type NextRequest, NextResponse } from 'next/server';

import { imageOptimizer } from '@/features/products/performance';
import { withFileUploadSecurity } from '@/features/products/security';
import { uploadFile } from '@/shared/lib/files/services/image-file-service';

interface UploadedFile {
  file: File;
  sanitizedName: string;
  hash: string;
}

const getSkuFromRequest = (req: NextRequest): string | null => {
  const sku = req.nextUrl.searchParams.get('sku') ?? req.nextUrl.searchParams.get('productSku');
  const normalized = sku?.trim();
  return normalized !== undefined && normalized.length > 0 ? normalized : null;
};

export async function uploadProductImages(
  req: NextRequest,
  files: UploadedFile[]
): Promise<Response> {
  const sku = getSkuFromRequest(req);
  const results = await Promise.all(
    files.map(async ({ file, sanitizedName, hash }) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const optimizedImages = await imageOptimizer.optimize(buffer, {
        formats: ['webp', 'jpeg'],
        sizes: {
          thumbnail: { width: 150, height: 150, quality: 80 },
          small: { width: 300, quality: 85 },
          medium: { width: 600, quality: 85 },
          large: { width: 1200, quality: 90 },
          original: { width: 2400, quality: 95 },
        },
      });
      const imageFile = await uploadFile(file, {
        category: 'products',
        sku,
        filenameOverride: sanitizedName,
      });

      return {
        id: imageFile.id,
        imageFileId: imageFile.id,
        originalName: file.name,
        sanitizedName,
        hash,
        size: file.size,
        mimeType: file.type,
        optimizedVersions: optimizedImages.length,
        url: imageFile.url ?? imageFile.publicUrl ?? imageFile.filepath,
        filepath: imageFile.filepath,
        imageFile,
      };
    })
  );

  return NextResponse.json({
    success: true,
    uploaded: results.length,
    files: results,
  });
}

async function uploadHandler(req: NextRequest, files: UploadedFile[]): Promise<Response> {
  return uploadProductImages(req, files);
}

export const ProductsImagesUploadPOST = withFileUploadSecurity(uploadHandler, {
  enableRateLimit: true,
  enableFileUploadSecurity: true,
});

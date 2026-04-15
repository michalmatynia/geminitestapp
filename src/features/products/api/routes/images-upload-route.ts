import 'server-only';
// Server route: handles product image uploads. Runs image optimization
// (multiple sizes / formats) and returns metadata for each uploaded image.
// Uses withFileUploadSecurity middleware to validate and rate-limit uploads.

import { type NextRequest, NextResponse } from 'next/server';

import { imageOptimizer } from '@/features/products/performance';
import { withFileUploadSecurity } from '@/features/products/security';

interface UploadedFile {
  file: File;
  sanitizedName: string;
  hash: string;
}

async function uploadHandler(_req: NextRequest, files: UploadedFile[]): Promise<Response> {
  const results = [];

  for (const { file, sanitizedName, hash } of files) {
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

    results.push({
      id: `img_${hash.slice(0, 8)}`,
      originalName: file.name,
      sanitizedName,
      hash,
      size: file.size,
      mimeType: file.type,
      optimizedVersions: optimizedImages.length,
      url: `/api/images/${hash.slice(0, 8)}`,
    });
  }

  return NextResponse.json({
    success: true,
    uploaded: results.length,
    files: results,
  });
}

export const ProductsImagesUploadPOST = withFileUploadSecurity(uploadHandler, {
  enableRateLimit: true,
  enableFileUploadSecurity: true,
});

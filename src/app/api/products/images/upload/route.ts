import { NextRequest, NextResponse } from 'next/server';
import { withFileUploadSecurity } from '@/features/products/security';
import { imageOptimizer } from '@/features/products/performance';

interface UploadedFile {
  file: File;
  sanitizedName: string;
  hash: string;
}

// POST /api/products/images/upload
async function uploadHandler(_req: NextRequest, files: UploadedFile[]): Promise<Response> {
  try {
    const results = [];
    
    for (const { file, sanitizedName, hash } of files) {
      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Optimize image
      const optimizedImages = await imageOptimizer.optimize(buffer, {
        formats: ['webp', 'jpeg'],
        sizes: {
          thumbnail: { width: 150, height: 150, quality: 80 },
          small: { width: 300, quality: 85 },
          medium: { width: 600, quality: 85 },
          large: { width: 1200, quality: 90 },
          original: { width: 2400, quality: 95 }
        }
      });

      // Store in database (placeholder)
      // const imageRecord = await db.imageFile.create({
      //   data: {
      //     originalName: file.name,
      //     sanitizedName,
      //     hash,
      //     mimeType: file.type,
      //     size: file.size,
      //     optimizedVersions: optimizedImages
      //   }
      // });

      results.push({
        id: `img_${hash.slice(0, 8)}`, // Placeholder ID
        originalName: file.name,
        sanitizedName,
        hash,
        size: file.size,
        mimeType: file.type,
        optimizedVersions: optimizedImages.length,
        url: `/api/images/${hash.slice(0, 8)}`
      });
    }

    return NextResponse.json({
      success: true,
      uploaded: results.length,
      files: results
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Upload processing failed' },
      { status: 500 }
    );
  }
}

// Export with security wrapper
export const POST = withFileUploadSecurity(uploadHandler, {
  enableRateLimit: true,
  enableFileUploadSecurity: true
});
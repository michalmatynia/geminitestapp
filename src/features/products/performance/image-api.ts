import { NextRequest, NextResponse } from 'next/server';
// import { imageOptimizer, imageUrlGenerator, type ImageFormat, type ImageSize } from '../image-optimizer';

// Temporary types until image-optimizer is implemented
type ImageFormat = 'webp' | 'jpeg' | 'png';
type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

// GET /api/products/images/[id]/[size].[format]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; size: string; format: string } }
) {
  try {
    const { id, size, format } = params;
    const url = new URL(req.url);
    const quality = parseInt(url.searchParams.get('q') || '85');

    // Validate parameters
    if (!['thumbnail', 'small', 'medium', 'large', 'original'].includes(size)) {
      return NextResponse.json({ error: 'Invalid size' }, { status: 400 });
    }

    if (!['webp', 'avif', 'jpeg', 'png'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    // Get original image (this would come from your database/storage)
    const originalImage = await getOriginalImage(id);
    if (!originalImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Optimize image
    const optimizedImages = await imageOptimizer.optimize(originalImage, {
      formats: [format as ImageFormat],
      sizes: { [size]: getSizeConfig(size as ImageSize, quality) }
    });

    const optimizedImage = optimizedImages.find(
      img => img.format === format && img.size === size
    );

    if (!optimizedImage) {
      return NextResponse.json({ error: 'Optimization failed' }, { status: 500 });
    }

    // Set caching headers
    const response = new NextResponse(optimizedImage.buffer);
    response.headers.set('Content-Type', `image/${format}`);
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('Content-Length', optimizedImage.fileSize.toString());
    
    return response;

  } catch (error) {
    console.error('Image optimization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/products/images/optimize
export async function POST(req: NextRequest) {
  try {
    const { images, options } = await req.json();
    
    if (!Array.isArray(images)) {
      return NextResponse.json({ error: 'Images must be an array' }, { status: 400 });
    }

    const results = await Promise.all(
      images.map(async (imageData: string, index: number) => {
        try {
          const optimized = await imageOptimizer.optimizeBase64(imageData, options);
          return {
            index,
            success: true,
            images: optimized.map(img => ({
              format: img.format,
              size: img.size,
              width: img.width,
              height: img.height,
              fileSize: img.fileSize,
              base64: img.buffer.toString('base64')
            }))
          };
        } catch (error) {
          return {
            index,
            success: false,
            error: error instanceof Error ? error.message : 'Optimization failed'
          };
        }
      })
    );

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Batch optimization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
async function getOriginalImage(id: string): Promise<Buffer | null> {
  // This would fetch from your database or file storage
  // const imageRecord = await db.imageFile.findUnique({ where: { id } });
  // if (imageRecord?.data) {
  //   return Buffer.from(imageRecord.data, 'base64');
  // }
  return null; // Placeholder
}

function getSizeConfig(size: ImageSize, quality: number) {
  const configs = {
    thumbnail: { width: 150, height: 150, quality },
    small: { width: 300, quality },
    medium: { width: 600, quality },
    large: { width: 1200, quality },
    original: { width: 2000, quality }
  };
  return configs[size];
}
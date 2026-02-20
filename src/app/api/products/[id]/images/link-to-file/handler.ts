import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { uploadFile } from '@/features/files/server';
import { parseJsonBody } from '@/features/products/server';
import { getProductRepository } from '@/features/products/services/product-repository';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const linkToFileSchema = z.object({
  url: z.string().trim().url(),
  filename: z.string().trim().optional(),
});

const extensionForMimeType = (mimetype: string): string => {
  const normalized = mimetype.trim().toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  if (normalized === 'image/gif') return '.gif';
  if (normalized === 'image/avif') return '.avif';
  if (normalized === 'image/svg+xml') return '.svg';
  return '.jpg';
};

const resolveFilename = (input: {
  url: string;
  preferred?: string;
  mimetype: string;
}): string => {
  const baseFallback = `linked-image-${Date.now()}`;
  const withSource = input.preferred?.trim() || (() => {
    try {
      const parsed = new URL(input.url);
      const basename = path.basename(parsed.pathname).trim();
      return basename || '';
    } catch {
      return '';
    }
  })();

  const source = withSource || baseFallback;
  const ext = path.extname(source).trim();
  if (ext.length > 0) return source;
  return `${source}${extensionForMimeType(input.mimetype)}`;
};

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id;
  if (!productId) {
    throw badRequestError('Product id is required');
  }

  const parsed = await parseJsonBody(req, linkToFileSchema, {
    logPrefix: 'products.[id].images.link-to-file.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const productRepo = await getProductRepository();
  const product = await productRepo.getProductById(productId);
  if (!product) {
    throw notFoundError('Product not found', { productId });
  }

  const response = await fetch(parsed.data.url, { cache: 'no-store' });
  if (!response.ok) {
    throw badRequestError(`Failed to download image (${response.status}).`, {
      url: parsed.data.url,
      status: response.status,
    });
  }

  const blob = await response.blob();
  if (blob.size <= 0) {
    throw badRequestError('Downloaded image is empty.', {
      url: parsed.data.url,
    });
  }

  const detectedMime = blob.type?.trim() || response.headers.get('content-type')?.trim() || 'image/jpeg';
  if (!detectedMime.toLowerCase().startsWith('image/')) {
    throw badRequestError('URL does not point to an image.', {
      url: parsed.data.url,
      mimetype: detectedMime,
    });
  }

  const filename = resolveFilename({
    url: parsed.data.url,
    mimetype: detectedMime,
    ...(parsed.data.filename ? { preferred: parsed.data.filename } : {}),
  });
  const file = new File([blob], filename, { type: detectedMime });

  const uploaded = await uploadFile(file, {
    category: 'products',
    sku: product.sku ?? undefined,
    filenameOverride: filename,
  });

  return NextResponse.json({
    status: 'ok',
    imageFile: {
      id: uploaded.id,
      filepath: uploaded.filepath,
    },
  });
}

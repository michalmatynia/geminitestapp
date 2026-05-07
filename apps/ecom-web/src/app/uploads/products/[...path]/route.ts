import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PRODUCT_UPLOAD_ROOTS = [
  path.resolve(process.cwd(), 'public/uploads/products'),
  path.resolve(process.cwd(), '../../public/uploads/products'),
];

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const TEMP_PRODUCT_IMAGE_FALLBACKS = [
  'SWOSTO016/1775854993653-1-47c8cd31d3a8f17432ef1197b4d3b552.png',
  'KEYCHA823/1776868315397-1-37c0703e0ff3c0b8caa98dafdf0f6842.png',
  'KEYCHA1434/6bf12b67-9d85-435c-8ebe-3cba78301ea9.png',
  'KEYCHA1050/ec622b1e-5ab7-411b-bda8-c0e690854721.png',
  'KEYCHA649/1775926504575-1-b9bcdc00188ed8276a183ea7dd312589.png',
  'KEYCHA1262/90d91407-941b-4d54-8616-0e05810c4e7b.png',
  'KEYCHA682/1776864978623-1-68e47a3939c0197b860bfbc4f737aff8.png',
  'WALACC113/1776865063561-1-690e066b5bf4fed272118bb1248be008.png',
];

type UploadRouteContext = {
  params: Promise<{ path?: string[] }>;
};

function isSafeSegment(segment: string): boolean {
  return Boolean(segment) && !segment.includes('..') && !segment.includes('/') && !segment.includes('\\');
}

async function getRequestedParts(params: UploadRouteContext['params']): Promise<string[]> {
  const resolved = await params;
  return resolved.path ?? [];
}

function fallbackIndex(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % TEMP_PRODUCT_IMAGE_FALLBACKS.length;
}

function resolveFallbackImagePath(root: string, key: string): string {
  return path.resolve(root, TEMP_PRODUCT_IMAGE_FALLBACKS[fallbackIndex(key)]);
}

async function resolvePrimaryImagePath(folderPath: string, root: string): Promise<string> {
  try {
    const entryStat = await stat(folderPath);
    if (entryStat.isDirectory()) {
      const files = await readdir(folderPath, { withFileTypes: true });
      const imageFiles = files
        .filter((entry) => entry.isFile() && CONTENT_TYPES[path.extname(entry.name).toLowerCase()])
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      const firstImage = imageFiles[0];
      if (firstImage) return path.join(folderPath, firstImage);
    }
  } catch {
    // Missing SKU folders use a temporary image from the existing upload pool.
  }

  return resolveFallbackImagePath(root, path.basename(folderPath));
}

async function resolveImagePath(filePath: string, root: string): Promise<string> {
  let entryStat;
  try {
    entryStat = await stat(filePath);
  } catch (error) {
    if (path.basename(filePath).startsWith('__primary.')) {
      return resolvePrimaryImagePath(path.dirname(filePath), root);
    }
    throw error;
  }

  if (entryStat.isFile()) return filePath;
  if (!entryStat.isDirectory()) throw new Error('Unsupported upload path');

  const files = await readdir(filePath, { withFileTypes: true });
  const imageFiles = files
    .filter((entry) => entry.isFile() && CONTENT_TYPES[path.extname(entry.name).toLowerCase()])
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const firstImage = imageFiles[0];

  if (!firstImage) throw new Error('No image in upload folder');
  return path.join(filePath, firstImage);
}

export async function GET(_request: Request, { params }: UploadRouteContext) {
  const parts = await getRequestedParts(params);
  if (parts.length === 0 || !parts.every(isSafeSegment)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const relativePath = path.join(...parts);

  for (const root of PRODUCT_UPLOAD_ROOTS) {
    const filePath = path.resolve(root, relativePath);
    if (!filePath.startsWith(`${root}${path.sep}`)) continue;

    try {
      const imagePath = await resolveImagePath(filePath, root);
      if (!imagePath.startsWith(`${root}${path.sep}`)) continue;

      const file = await readFile(imagePath);
      const contentType = CONTENT_TYPES[path.extname(imagePath).toLowerCase()] ?? 'application/octet-stream';

      return new NextResponse(new Uint8Array(file), {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': contentType,
        },
      });
    } catch {
      // Try the next root candidate.
    }
  }

  return new NextResponse('Not found', { status: 404 });
}

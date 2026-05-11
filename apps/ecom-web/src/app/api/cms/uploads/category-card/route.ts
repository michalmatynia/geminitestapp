import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadToFastComet } from '@/lib/fastcometUpload';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME_TO_EXTENSION = new Map<string, string>([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);
const EXTENSION_TO_MIME = new Map<string, string>([
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
]);

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function getExtension(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return match?.[1]?.toLowerCase() ?? '';
}

function getImageMime(file: File): string | null {
  const type = file.type.trim().toLowerCase();
  if (IMAGE_MIME_TO_EXTENSION.has(type)) return type;

  const extension = getExtension(file.name);
  return EXTENSION_TO_MIME.get(extension) ?? null;
}

function sanitizeName(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, '');
  const normalized = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return normalized || 'category-card';
}

function makeStoredFilename(file: File, mimetype: string): string {
  const extension = IMAGE_MIME_TO_EXTENSION.get(mimetype) ?? 'png';
  return `${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeName(file.name)}.${extension}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart upload.' }, { status: 400 });
  }

  const entry = form.get('file');
  if (!(entry instanceof File)) {
    return NextResponse.json({ error: 'Category card image is required.' }, { status: 400 });
  }

  if (entry.size <= 0) {
    return NextResponse.json({ error: 'Category card image is empty.' }, { status: 400 });
  }

  if (entry.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Category card image must be 5 MB or smaller.' }, { status: 400 });
  }

  const mimetype = getImageMime(entry);
  if (mimetype === null) {
    return NextResponse.json({ error: 'Category card image must be PNG, JPG, WebP, or GIF.' }, { status: 400 });
  }

  try {
    const filename = makeStoredFilename(entry, mimetype);
    const publicPath = `/uploads/ecom/category-selectors/${filename}`;
    const buffer = Buffer.from(await entry.arrayBuffer());
    const url = await uploadToFastComet({
      buffer,
      filename,
      mimetype,
      publicPath,
      category: 'ecom',
      folder: 'category-selectors',
    });

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error('Failed to upload CMS category card image to FastComet.', error);
    const message = error instanceof Error ? error.message : 'Failed to upload category card image.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
